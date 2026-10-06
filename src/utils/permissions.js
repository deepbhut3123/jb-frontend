export const PERMISSION_MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['menu', 'view'] },
  { key: 'leads', label: 'Leads', actions: ['menu', 'view', 'viewAll', 'create', 'edit', 'delete'] },
  { key: 'quotations', label: 'Quotations', actions: ['menu', 'view', 'viewAll', 'create', 'edit', 'delete'] },
  { key: 'products', label: 'Products', actions: ['menu', 'view', 'create', 'edit', 'delete'] },
  { key: 'categories', label: 'Categories', actions: ['menu', 'view', 'create', 'edit', 'delete'] },
  { key: 'customers', label: 'Customers', actions: ['menu', 'view', 'viewAll', 'create', 'edit', 'delete'] },
  { key: 'users', label: 'User management', actions: ['menu', 'view', 'create', 'edit', 'delete'] },
  { key: 'settings', label: 'Pricing settings', actions: ['menu', 'view', 'edit'] },
  { key: 'whatsapp', label: 'WhatsApp', actions: ['menu', 'view', 'edit'] },
];

const legacyUserPermissions = new Set([
  'dashboard.menu', 'dashboard.view', 'leads.menu', 'leads.view', 'leads.create', 'leads.edit', 'leads.delete',
  'quotations.menu', 'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.delete',
  'customers.menu', 'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
]);

export const isAdministrator = (user) => [1, 3].includes(Number(user?.role));

export function can(user, permission) {
  if (isAdministrator(user)) return true;
  if (Array.isArray(user?.permissions)) return user.permissions.includes(permission);
  return legacyUserPermissions.has(permission);
}

export function canView(user, section) {
  if (section === 'profile' || isAdministrator(user)) return true;
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [...legacyUserPermissions];
  const usesExplicitMenuPermissions = permissions.some((permission) => permission.endsWith('.menu'));
  return usesExplicitMenuPermissions ? permissions.includes(`${section}.menu`) : permissions.includes(`${section}.view`);
}
