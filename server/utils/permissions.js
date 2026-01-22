// Canonical permission codes used across server + client.
// Keep these stable because they will be stored in JWT payloads and DB documents.

const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: 'DASHBOARD.VIEW',
  PURCHASE_CARD: 'PURCHASE_CARD.FULL',

  SYSTEM_CONFIG_VIEW: 'SYSTEM_CONFIG.VIEW',
  SYSTEM_CONFIG_FULL: 'SYSTEM_CONFIG.FULL',

  PEOPLE_VIEW: 'PEOPLE.VIEW',
  PEOPLE_MANAGE_CUSTOMERS: 'PEOPLE.MANAGE_CUSTOMERS',
  PEOPLE_MANAGE_EMPLOYEES: 'PEOPLE.MANAGE_EMPLOYEES',
  PEOPLE_ACCESS_HUB: 'PEOPLE.ACCESS_MANAGEMENT_HUB',
  PEOPLE_FULL: 'PEOPLE.FULL',

  VEHICLES_VIEW: 'VEHICLES.VIEW',
  VEHICLES_FULL: 'VEHICLES.FULL',

  CARDS_VIEW: 'CARDS.VIEW',
  CARDS_FULL: 'CARDS.FULL',

  SUBSCRIPTIONS_VIEW: 'SUBSCRIPTIONS.VIEW',
  SUBSCRIPTIONS_FULL: 'SUBSCRIPTIONS.FULL',

  ENTRY_SESSIONS_VIEW: 'ENTRY_SESSIONS.VIEW',

  PRICING_VIEW: 'PRICING.VIEW',
  PRICING_FULL: 'PRICING.FULL',

  SHIFTS_VIEW: 'SHIFTS.VIEW',
  SHIFTS_FULL: 'SHIFTS.FULL',

  REPORTS_VIEW: 'REPORTS.VIEW',

  ROLES_VIEW: 'ROLES.VIEW',
  ROLES_FULL: 'ROLES.FULL',

  STAFF_VIEW_FULL: 'STAFF_VIEW.FULL'
});

const ROLE_IDS = Object.freeze({
  STAFF: 'ROLE_STAFF',
  MANAGER: 'ROLE_MANAGER',
  ADMIN: 'ROLE_ADMIN',
  SUPREME_ADMIN: 'ROLE_SUPREME_ADMIN'
});

const ROLE_DEFINITIONS = Object.freeze({
  [ROLE_IDS.STAFF]: {
    id: ROLE_IDS.STAFF,
    name: 'Staff',
    description: 'Full actions of staff view',
    permissions: [PERMISSIONS.STAFF_VIEW_FULL]
  },

  [ROLE_IDS.MANAGER]: {
    id: ROLE_IDS.MANAGER,
    name: 'Manager',
    description: 'Operations manager permissions',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PURCHASE_CARD,

      // Manager: manage customers only (not employees)
      PERMISSIONS.PEOPLE_VIEW,
      PERMISSIONS.PEOPLE_MANAGE_CUSTOMERS,

      PERMISSIONS.VEHICLES_FULL,
      PERMISSIONS.CARDS_FULL,
      PERMISSIONS.SUBSCRIPTIONS_FULL,

      PERMISSIONS.ENTRY_SESSIONS_VIEW,

      // Manager: view pricing (not full)
      PERMISSIONS.PRICING_VIEW,

      PERMISSIONS.SHIFTS_FULL,
      PERMISSIONS.REPORTS_VIEW
    ],
    // Explicit excludes - Manager cannot manage employees or access hub
    excludes: [PERMISSIONS.PEOPLE_ACCESS_HUB, PERMISSIONS.PEOPLE_MANAGE_EMPLOYEES]
  },

  [ROLE_IDS.ADMIN]: {
    id: ROLE_IDS.ADMIN,
    name: 'Admin',
    description: 'Admin panel permissions (non-supreme)',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      // Admin: manage employees only (not customers)
      PERMISSIONS.PEOPLE_VIEW,
      PERMISSIONS.PEOPLE_MANAGE_EMPLOYEES,
      PERMISSIONS.PEOPLE_ACCESS_HUB,
      PERMISSIONS.VEHICLES_VIEW,
      PERMISSIONS.CARDS_VIEW,
      PERMISSIONS.CARDS_FULL, // Admin needs full card access for employee card management
      PERMISSIONS.SUBSCRIPTIONS_VIEW,
      PERMISSIONS.ENTRY_SESSIONS_VIEW,
      PERMISSIONS.PRICING_VIEW,
      PERMISSIONS.SHIFTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.ROLES_VIEW
    ],
    // Explicit excludes - Admin cannot manage customers
    excludes: [PERMISSIONS.PEOPLE_MANAGE_CUSTOMERS]
  },

  [ROLE_IDS.SUPREME_ADMIN]: {
    id: ROLE_IDS.SUPREME_ADMIN,
    name: 'Supreme Admin',
    description: 'Full actions of the application',
    // All permissions currently known by the system.
    permissions: Object.values(PERMISSIONS)
  }
});

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function buildEffectivePermissions(roleIds) {
  const roles = (roleIds || []).map((id) => ROLE_DEFINITIONS[id]).filter(Boolean);
  const allow = uniq(roles.flatMap((r) => r.permissions || []));
  const deny = uniq(roles.flatMap((r) => r.excludes || []));
  return allow.filter((p) => !deny.includes(p));
}

module.exports = {
  PERMISSIONS,
  ROLE_IDS,
  ROLE_DEFINITIONS,
  buildEffectivePermissions
};
