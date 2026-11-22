'use client';

/**
 * Customer sign-in remains disabled until an approved authentication provider
 * and customer account lifecycle are configured for this platform.
 */
export function CustomerAuthBoundary() {
  return (
    <section aria-labelledby="customer-auth-title">
      <h1 id="customer-auth-title">Customer sign in</h1>
      <p>Customer sign in is not configured in this environment. No one-time code has been sent.</p>
    </section>
  );
}
