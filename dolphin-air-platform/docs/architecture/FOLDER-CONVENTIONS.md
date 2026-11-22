# Folder Conventions

CRM features added in later stages follow:

```text
features/feature-name/
  api/ components/ pages/ hooks/ schemas/ types/ utils/ tests/ index.ts
```

Backend modules added in later stages follow:

```text
modules/feature-name/
  controllers/ services/ repositories/ dto/ entities/ policies/ events/ tests/
```

Create these subfolders only when implementing a feature. Existing feature/module directories are organizational placeholders.
