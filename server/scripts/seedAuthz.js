/* eslint-disable no-console */

// Seed Roles + Permissions + RolePermission.
// Run: node scripts/seedAuthz.js

const mongoose = require('mongoose');
const config = require('../utils/config');

const Role = require('../models/role');
const Permission = require('../models/permission');
const RolePermission = require('../models/rolePermission');

const { PERMISSIONS, ROLE_DEFINITIONS } = require('../utils/permissions');

function splitModule(code) {
  const raw = String(code || '');
  const idx = raw.indexOf('.');
  if (idx <= 0) return 'SYSTEM';
  return raw.slice(0, idx);
}

const PERMISSION_DISPLAY = {
  [PERMISSIONS.DASHBOARD_VIEW]: { name: 'View Dashboard', description: 'Show Dashboard button and access dashboard data' },
  [PERMISSIONS.PURCHASE_CARD]: { name: 'Purchase Card (Full)', description: 'Show Purchase Card and allow all operations' },

  [PERMISSIONS.SYSTEM_CONFIG_VIEW]: { name: 'View System Configuration', description: 'Show System Config page and load system settings' },
  [PERMISSIONS.SYSTEM_CONFIG_FULL]: { name: 'System Configuration (Full)', description: 'Edit and save system settings' },

  [PERMISSIONS.PEOPLE_VIEW]: { name: 'View People', description: 'Show People button + view people and cards of people' },
  [PERMISSIONS.PEOPLE_MANAGE_CUSTOMERS]: { name: 'Manage Customers', description: 'View, Create, Edit, Delete customers. For Manager role.' },
  [PERMISSIONS.PEOPLE_MANAGE_EMPLOYEES]: { name: 'Manage Employees', description: 'View, Create, Edit, Delete employees + Access Hub. For Admin role.' },
  [PERMISSIONS.PEOPLE_ACCESS_HUB]: { name: 'Access Management Hub', description: 'Allow Access Management Hub action on employee' },
  [PERMISSIONS.PEOPLE_FULL]: { name: 'People (Full)', description: 'Full access to People page (all customers & employees operations)' },

  [PERMISSIONS.VEHICLES_VIEW]: { name: 'View Vehicles', description: 'View vehicles and vehicle types' },
  [PERMISSIONS.VEHICLES_FULL]: { name: 'Vehicles (Full)', description: 'Full actions of Vehicles page' },

  [PERMISSIONS.CARDS_VIEW]: { name: 'View Cards', description: 'View cards, categories, invoices' },
  [PERMISSIONS.CARDS_FULL]: { name: 'Cards (Full)', description: 'Full actions of Cards page' },

  [PERMISSIONS.SUBSCRIPTIONS_VIEW]: { name: 'View Subscriptions', description: 'View subscriptions and subscription types' },
  [PERMISSIONS.SUBSCRIPTIONS_FULL]: { name: 'Subscriptions (Full)', description: 'Full actions of Subscriptions page' },

  [PERMISSIONS.ENTRY_SESSIONS_VIEW]: { name: 'View Entry Sessions', description: 'Show Entry Sessions button and view sessions' },

  [PERMISSIONS.PRICING_VIEW]: { name: 'View Pricing', description: 'View entry/card/subscription pricing and history' },
  [PERMISSIONS.PRICING_FULL]: { name: 'Pricing (Full)', description: 'Full actions of Pricing page' },

  [PERMISSIONS.SHIFTS_VIEW]: { name: 'View Shifts', description: 'Show Shifts button and view shifts' },
  [PERMISSIONS.SHIFTS_FULL]: { name: 'Shifts (Full)', description: 'Full actions of Shifts page' },

  [PERMISSIONS.REPORTS_VIEW]: { name: 'Reports', description: 'Show Reports button and view reports' },

  [PERMISSIONS.STAFF_VIEW_FULL]: { name: 'Staff View (Full)', description: 'Full actions of staff view' }
};

// Note: ROLE_SUPREME_ADMIN is seeded via ROLE_DEFINITIONS in server/utils/permissions.js.

async function upsertRole(roleDef) {
  await Role.updateOne(
    { ID: roleDef.id.toUpperCase() },
    {
      $set: {
        ID: roleDef.id.toUpperCase(),
        Name: roleDef.name,
        Description: roleDef.description || null,
        IsActive: true
      },
      $setOnInsert: { CreatedAt: new Date() }
    },
    { upsert: true }
  );
}

async function upsertPermission(code) {
  const meta = PERMISSION_DISPLAY[code] || { name: code, description: null };
  await Permission.updateOne(
    { ID: String(code).toUpperCase() },
    {
      $set: {
        ID: String(code).toUpperCase(),
        Module: splitModule(code).toUpperCase(),
        Name: meta.name,
        Description: meta.description
      }
    },
    { upsert: true }
  );
}

async function upsertRolePermission(roleId, permCode) {
  await RolePermission.updateOne(
    { RoleID: String(roleId).toUpperCase(), PermissionID: String(permCode).toUpperCase() },
    { $set: { RoleID: String(roleId).toUpperCase(), PermissionID: String(permCode).toUpperCase() } },
    { upsert: true }
  );
}

async function main() {
  if (!config.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in server/utils/config');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.MONGODB_URI);

  const roles = Object.values(ROLE_DEFINITIONS);
  const allPermissionCodes = Object.values(PERMISSIONS);

  console.log(`Seeding ${roles.length} roles, ${allPermissionCodes.length} permissions...`);

  for (const role of roles) await upsertRole(role);
  for (const p of allPermissionCodes) await upsertPermission(p);

  // RolePermission
  for (const role of roles) {
    const allow = (role.permissions || []).map((p) => String(p).toUpperCase());
    const deny = (role.excludes || []).map((p) => String(p).toUpperCase());

    for (const p of allow) {
      if (deny.includes(p)) continue;
      await upsertRolePermission(role.id, p);
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
