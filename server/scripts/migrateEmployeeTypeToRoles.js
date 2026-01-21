/* eslint-disable no-console */

/**
 * Migration Script: Employee Type to Employee Roles
 * 
 * This script:
 * 1. Checks all employees in the database
 * 2. Maps their EmployeeType (STAFF, MANAGER, ADMIN) to corresponding Role IDs
 * 3. Creates EmployeeRole records if they don't exist
 * 4. Reports migration results
 * 
 * Run: node scripts/migrateEmployeeTypeToRoles.js
 */

const mongoose = require('mongoose');
const config = require('../utils/config');

const Employee = require('../models/employee');
const Role = require('../models/role');
const EmployeeRole = require('../models/employeeRole');

// Mapping from EmployeeType to expected Role Name
const EMPLOYEE_TYPE_TO_ROLE_NAME = {
  STAFF: 'Staff',
  MANAGER: 'Manager',
  ADMIN: 'Admin'
};

async function migrateEmployeeTypeToRoles() {
  try {
    console.log('🚀 Starting Employee Type to Roles Migration...\n');

    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Get all employees
    const employees = await Employee.find({}).lean();
    console.log(`📊 Found ${employees.length} employees in database\n`);

    if (employees.length === 0) {
      console.log('⚠️  No employees found. Nothing to migrate.');
      return;
    }

    // Step 2: Get all roles
    const roles = await Role.find({ IsActive: true }).lean();
    console.log(`📊 Found ${roles.length} active roles in database`);

    // Create a map: Role Name -> Role ID
    const roleNameToId = {};
    roles.forEach(role => {
      roleNameToId[role.Name] = role.ID;
      console.log(`   - ${role.Name} (${role.ID}): ${role.Description || 'No description'}`);
    });
    console.log('');

    // Step 3: Check for missing roles
    const missingRoles = [];
    for (const [empType, roleName] of Object.entries(EMPLOYEE_TYPE_TO_ROLE_NAME)) {
      if (!roleNameToId[roleName]) {
        missingRoles.push({ type: empType, roleName });
      }
    }

    if (missingRoles.length > 0) {
      console.log('❌ ERROR: Missing required roles in database:');
      missingRoles.forEach(({ type, roleName }) => {
        console.log(`   - ${roleName} (for ${type})`);
      });
      console.log('\n⚠️  Please run "node scripts/seedAuthz.js" first to create roles.');
      return;
    }

    console.log('✅ All required roles exist\n');

    // Step 4: Analyze employees
    const employeeTypeStats = {};
    employees.forEach(emp => {
      const type = emp.EmployeeType || 'UNKNOWN';
      if (!employeeTypeStats[type]) {
        employeeTypeStats[type] = 0;
      }
      employeeTypeStats[type]++;
    });

    console.log('📊 Employee Type Distribution:');
    Object.entries(employeeTypeStats).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count} employees`);
    });
    console.log('');

    // Step 5: Get existing EmployeeRole records
    const existingEmployeeRoles = await EmployeeRole.find({}).lean();
    console.log(`📊 Found ${existingEmployeeRoles.length} existing EmployeeRole records\n`);

    // Create a Set of existing employee-role pairs
    const existingPairs = new Set(
      existingEmployeeRoles.map(er => `${er.EmployeeID}|${er.RoleID}`)
    );

    // Step 6: Migrate employees
    const results = {
      total: employees.length,
      migrated: 0,
      alreadyExists: 0,
      unknownType: 0,
      errors: []
    };

    console.log('🔄 Starting migration...\n');

    for (const employee of employees) {
      const employeeType = employee.EmployeeType;
      const employeeId = employee.ID;

      if (!employeeType) {
        console.log(`⚠️  Employee ${employeeId} has no EmployeeType, skipping...`);
        results.unknownType++;
        continue;
      }

      const roleName = EMPLOYEE_TYPE_TO_ROLE_NAME[employeeType];
      if (!roleName) {
        console.log(`⚠️  Employee ${employeeId} has unknown EmployeeType: ${employeeType}, skipping...`);
        results.unknownType++;
        continue;
      }

      const roleId = roleNameToId[roleName];
      if (!roleId) {
        console.log(`❌ Employee ${employeeId}: No role found for type ${employeeType} (${roleName})`);
        results.errors.push({
          employeeId,
          employeeType,
          error: 'Role not found'
        });
        continue;
      }

      // Check if this employee-role pair already exists
      const pairKey = `${employeeId}|${roleId}`;
      if (existingPairs.has(pairKey)) {
        console.log(`✓ Employee ${employeeId} (${employeeType}) -> ${roleName} (${roleId}): Already exists`);
        results.alreadyExists++;
        continue;
      }

      // Create new EmployeeRole record
      try {
        await EmployeeRole.create({
          EmployeeID: employeeId,
          RoleID: roleId,
          AssignedBy: null, // Migration script, no specific assigner
          AssignedAt: new Date()
        });

        console.log(`✅ Employee ${employeeId} (${employeeType}) -> ${roleName} (${roleId}): Created`);
        results.migrated++;
        existingPairs.add(pairKey); // Add to set to avoid duplicates in same run
      } catch (error) {
        console.log(`❌ Employee ${employeeId}: Failed to create EmployeeRole`);
        console.error(`   Error: ${error.message}`);
        results.errors.push({
          employeeId,
          employeeType,
          error: error.message
        });
      }
    }

    // Step 7: Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Employees:           ${results.total}`);
    console.log(`✅ Newly Migrated:         ${results.migrated}`);
    console.log(`✓  Already Existed:        ${results.alreadyExists}`);
    console.log(`⚠️  Unknown Type:          ${results.unknownType}`);
    console.log(`❌ Errors:                 ${results.errors.length}`);
    console.log('='.repeat(60));

    if (results.errors.length > 0) {
      console.log('\n❌ Errors Details:');
      results.errors.forEach(({ employeeId, employeeType, error }) => {
        console.log(`   - ${employeeId} (${employeeType}): ${error}`);
      });
    }

    console.log('\n✅ Migration completed!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateEmployeeTypeToRoles()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateEmployeeTypeToRoles };
