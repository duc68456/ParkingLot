/* eslint-disable no-console */

// Clean up old PEOPLE permissions and reseed with new structure.
// Run: node scripts/cleanupPeoplePermissions.js

const mongoose = require('mongoose');
const config = require('../utils/config');

const Permission = require('../models/permission');
const RolePermission = require('../models/rolePermission');

// Old permissions to remove
const OLD_PERMISSIONS = [
  'PEOPLE.VIEW',
  'PEOPLE.ACCESS_MANAGEMENT_HUB'
];

// New permissions to add
const NEW_PERMISSIONS = [
  {
    ID: 'PEOPLE.MANAGE_CUSTOMERS',
    Module: 'PEOPLE',
    Name: 'Manage Customers',
    Description: 'View, Create, Edit, Delete customers. For Manager role.'
  },
  {
    ID: 'PEOPLE.MANAGE_EMPLOYEES',
    Module: 'PEOPLE',
    Name: 'Manage Employees',
    Description: 'View, Create, Edit, Delete employees + Access Hub. For Admin role.'
  },
  {
    ID: 'PEOPLE.FULL',
    Module: 'PEOPLE',
    Name: 'People (Full)',
    Description: 'Full access to People page (all customers & employees operations).'
  }
];

async function main() {
  if (!config.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in server/utils/config');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.MONGODB_URI);

  // Step 1: Remove old RolePermission records
  console.log('Removing old RolePermission records...');
  for (const oldPerm of OLD_PERMISSIONS) {
    const result = await RolePermission.deleteMany({ PermissionID: oldPerm.toUpperCase() });
    console.log(`  Removed ${result.deletedCount} RolePermission records for ${oldPerm}`);
  }

  // Step 2: Remove old Permission documents
  console.log('Removing old Permission documents...');
  for (const oldPerm of OLD_PERMISSIONS) {
    const result = await Permission.deleteOne({ ID: oldPerm.toUpperCase() });
    console.log(`  Removed Permission ${oldPerm}: ${result.deletedCount > 0 ? 'deleted' : 'not found'}`);
  }

  // Step 3: Add/update new Permission documents
  console.log('Adding new Permission documents...');
  for (const newPerm of NEW_PERMISSIONS) {
    await Permission.updateOne(
      { ID: newPerm.ID.toUpperCase() },
      {
        $set: {
          ID: newPerm.ID.toUpperCase(),
          Module: newPerm.Module.toUpperCase(),
          Name: newPerm.Name,
          Description: newPerm.Description
        }
      },
      { upsert: true }
    );
    console.log(`  Upserted Permission: ${newPerm.ID}`);
  }

  console.log('\nDone! Old permissions removed, new permissions added.');
  console.log('You should now re-run: node scripts/seedAuthz.js');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
