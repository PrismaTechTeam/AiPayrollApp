/**
 * Tenant Hub
 * The old blue "My Tenants" page. Its job — pick a company, see what is
 * pending, join another — is now the single Home screen, so this route keeps
 * its name for the screens that still navigate to "TenantHub" and renders the
 * same component as "UserHome". Changes to that page belong in UserHomeScreen;
 * a second copy here would let the two drift apart.
 */
export { UserHomeScreen as TenantHubScreen, default } from './UserHomeScreen';
