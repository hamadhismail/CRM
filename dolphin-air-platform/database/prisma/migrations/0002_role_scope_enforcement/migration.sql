BEGIN;

-- Role-to-organization bindings mirror the existing immutable platform role
-- catalogue. No permissions are added or changed by this migration.
ALTER TABLE public.roles
    ADD COLUMN allowed_organization_type "OrganizationType";

UPDATE public.roles
SET allowed_organization_type = CASE
    WHEN code IN ('super_admin', 'admin', 'staff', 'sales', 'operations', 'finance_accounts', 'visa_processing')
        THEN 'INTERNAL'::"OrganizationType"
    WHEN code = 'b2b_agent' THEN 'B2B_AGENCY'::"OrganizationType"
    WHEN code = 'customer' THEN NULL
    ELSE NULL
END;

ALTER TABLE public.roles
    ADD CONSTRAINT roles_scope_binding_check
    CHECK (
        (code = 'super_admin' AND scope = 'SYSTEM' AND allowed_organization_type = 'INTERNAL')
        OR (code IN ('admin', 'staff', 'sales', 'operations', 'finance_accounts', 'visa_processing')
            AND scope = 'ORGANIZATION' AND allowed_organization_type = 'INTERNAL')
        OR (code = 'b2b_agent' AND scope = 'ORGANIZATION' AND allowed_organization_type = 'B2B_AGENCY')
        OR (code = 'customer' AND scope = 'ORGANIZATION' AND allowed_organization_type IS NULL)
    );

CREATE UNIQUE INDEX organizations_id_type_role_scope_key
    ON public.organizations (id, type);
CREATE UNIQUE INDEX roles_id_allowed_organization_type_scope_key
    ON public.roles (id, allowed_organization_type, scope);

ALTER TABLE public.user_roles
    ADD COLUMN organization_type "OrganizationType",
    ADD COLUMN role_scope "RoleScope";

UPDATE public.user_roles AS assignment
SET organization_type = organization.type,
    role_scope = assigned_role.scope
FROM public.organizations AS organization,
     public.roles AS assigned_role
WHERE organization.id = assignment.organization_id
  AND assigned_role.id = assignment.role_id;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE organization_type IS NULL OR role_scope IS NULL
    ) THEN
        RAISE EXCEPTION 'Existing role assignments do not have valid organization and role scope bindings';
    END IF;
END;
$$;

ALTER TABLE public.user_roles
    ALTER COLUMN organization_type SET NOT NULL,
    ALTER COLUMN role_scope SET NOT NULL,
    ADD CONSTRAINT user_roles_organization_type_fkey
        FOREIGN KEY (organization_id, organization_type)
        REFERENCES public.organizations (id, type)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT user_roles_role_scope_fkey
        FOREIGN KEY (role_id, organization_type, role_scope)
        REFERENCES public.roles (id, allowed_organization_type, scope)
        ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Direct runtime SQL writes must obey live account, membership and org status.
-- Parent rows are locked in a stable order so concurrent deactivation cannot
-- race an active assignment into existence.
CREATE OR REPLACE FUNCTION public.enforce_user_role_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    organization_type_value "OrganizationType";
    organization_status_value "OrganizationStatus";
    membership_status_value "MembershipStatus";
    target_user_id UUID;
    target_user_status "UserStatus";
    target_user_type "UserType";
    actor_user_status "UserStatus";
    actor_user_type "UserType";
    role_code_value VARCHAR(80);
    role_scope_value "RoleScope";
    role_organization_type_value "OrganizationType";
BEGIN
    IF NEW.status <> 'ACTIVE' THEN
        RETURN NEW;
    END IF;

    IF NEW.assigned_by_id IS NULL THEN
        RAISE EXCEPTION 'Active role assignments require an authenticated actor'
            USING ERRCODE = '23514';
    END IF;

    SELECT type, status INTO organization_type_value, organization_status_value
    FROM public.organizations WHERE id = NEW.organization_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role assignment organization is missing' USING ERRCODE = '23503';
    END IF;

    SELECT status, user_id INTO membership_status_value, target_user_id
    FROM public.organization_memberships
    WHERE id = NEW.membership_id AND organization_id = NEW.organization_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Role assignment membership is missing' USING ERRCODE = '23503';
    END IF;

    PERFORM id FROM public.users
    WHERE id IN (target_user_id, NEW.assigned_by_id)
    ORDER BY id FOR UPDATE;

    SELECT status, user_type INTO target_user_status, target_user_type
    FROM public.users WHERE id = target_user_id;
    SELECT status, user_type INTO actor_user_status, actor_user_type
    FROM public.users WHERE id = NEW.assigned_by_id;

    SELECT code, scope, allowed_organization_type
    INTO role_code_value, role_scope_value, role_organization_type_value
    FROM public.roles WHERE id = NEW.role_id FOR UPDATE;

    IF organization_status_value <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot assign a role in an inactive organization' USING ERRCODE = '23514';
    END IF;
    IF membership_status_value <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot assign a role to an inactive membership' USING ERRCODE = '23514';
    END IF;
    IF target_user_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Cannot assign a role to an inactive user' USING ERRCODE = '23514';
    END IF;
    IF actor_user_status <> 'ACTIVE' OR actor_user_type <> 'INTERNAL_STAFF' THEN
        RAISE EXCEPTION 'Role assignment actor must be an active internal user' USING ERRCODE = '23514';
    END IF;
    IF target_user_id = NEW.assigned_by_id THEN
        RAISE EXCEPTION 'Users cannot assign roles to themselves' USING ERRCODE = '23514';
    END IF;
    IF role_organization_type_value IS DISTINCT FROM organization_type_value
       OR NEW.organization_type IS DISTINCT FROM organization_type_value
       OR NEW.role_scope IS DISTINCT FROM role_scope_value THEN
        RAISE EXCEPTION 'Role scope does not match the organization' USING ERRCODE = '23514';
    END IF;
    IF (organization_type_value = 'INTERNAL' AND target_user_type <> 'INTERNAL_STAFF')
       OR (organization_type_value = 'B2B_AGENCY' AND target_user_type <> 'AGENCY_USER') THEN
        RAISE EXCEPTION 'User type is not valid for this organization' USING ERRCODE = '23514';
    END IF;
    IF role_code_value = 'customer' THEN
        RAISE EXCEPTION 'Customer identities cannot receive organization roles' USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER user_roles_scope_guard
BEFORE INSERT OR UPDATE OF organization_id, organization_type, membership_id, role_id, role_scope, status, assigned_by_id
ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_role_scope();

CREATE OR REPLACE FUNCTION public.revoke_membership_role_assignments()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status <> 'ACTIVE' THEN
        UPDATE public.user_roles
        SET status = 'REVOKED', revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
        WHERE membership_id = NEW.id AND organization_id = NEW.organization_id AND status = 'ACTIVE';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_membership_role_revocation
AFTER UPDATE OF status ON public.organization_memberships
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.revoke_membership_role_assignments();

CREATE OR REPLACE FUNCTION public.revoke_organization_role_assignments()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status <> 'ACTIVE' THEN
        UPDATE public.user_roles
        SET status = 'REVOKED', revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
        WHERE organization_id = NEW.id AND status = 'ACTIVE';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER organization_role_revocation
AFTER UPDATE OF status ON public.organizations
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.revoke_organization_role_assignments();

CREATE OR REPLACE FUNCTION public.revoke_user_role_assignments()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'DISABLED' OR NEW.user_type IS DISTINCT FROM OLD.user_type THEN
        UPDATE public.user_roles AS assignment
        SET status = 'REVOKED', revoked_at = COALESCE(assignment.revoked_at, CURRENT_TIMESTAMP)
        WHERE assignment.status = 'ACTIVE'
          AND assignment.membership_id IN (
              SELECT membership.id FROM public.organization_memberships AS membership
              WHERE membership.user_id = NEW.id
          );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER user_role_revocation
AFTER UPDATE OF status, user_type ON public.users
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.user_type IS DISTINCT FROM NEW.user_type)
EXECUTE FUNCTION public.revoke_user_role_assignments();

COMMIT;
