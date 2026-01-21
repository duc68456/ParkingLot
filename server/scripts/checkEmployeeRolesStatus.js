/* eslint-disable no-console */

/**
 * Check Employee Roles Status
 * 
 * This script checks the current state of employees and their roles
 * without making any changes.
 * 
 * Run: node scripts/checkEmployeeRolesStatus.js
 */

const mongoose = require('mongoose');
const config = require('../utils/config');

const Employee = require('../models/employee');
const Role = require('../models/role');
const EmployeeRole = require('../models/employeeRole');

async function checkEmployeeRolesStatus() {
  try {
    console.log('🔍 Checking Employee Roles Status...\n');

    // Connect to database
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all employees
    const employees = await Employee.find({}).lean();
    console.log(`📊 Total Employees: ${employees.length}\n`);

    // Employee type breakdown
    const typeBreakdown = {};
    employees.forEach(emp => {
      const type = emp.EmployeeType || 'UNKNOWN';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    console.log('📊 Employee Type Distribution:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    // Get all roles
    const roles = await Role.find({}).lean();
    console.log(`📊 Total Roles: ${roles.length}\n`);

    console.log('📋 Available Roles:');
    roles.forEach(role => {
      const status = role.IsActive ? '✅ Active' : '❌ Inactive';
      console.log(`   ${status} | ${role.ID} | ${role.Name} | ${role.Description || 'No description'}`);
    });
    console.log('');

    // Get all employee roles
    const employeeRoles = await EmployeeRole.find({}).lean();
    console.log(`📊 Total EmployeeRole Records: ${employeeRoles.length}\n`);

    // Analyze EmployeeRole records
    const roleAssignments = {};
    employeeRoles.forEach(er => {
      if (!roleAssignments[er.RoleID]) {
        roleAssignments[er.RoleID] = [];
      }
      roleAssignments[er.RoleID].push(er.EmployeeID);
    });

    console.log('📊 Role Assignments:');
    if (Object.keys(roleAssignments).length === 0) {
      console.log('   (No role assignments found)');
    } else {
      Object.entries(roleAssignments).forEach(([roleId, empIds]) => {
        const role = roles.find(r => r.ID === roleId);
        const roleName = role ? role.Name : 'Unknown';
        console.log(`   ${roleId} (${roleName}): ${empIds.length} employees`);
        empIds.forEach(empId => {
          console.log(`      - ${empId}`);
        });
      });
    }
    console.log('');

    // Check employees without role assignments
    const employeesWithRoles = new Set(employeeRoles.map(er => er.EmployeeID));
    const employeesWithoutRoles = employees.filter(emp => !employeesWithRoles.has(emp.ID));

    console.log(`📊 Employees WITHOUT Role Assignments: ${employeesWithoutRoles.length}\n`);
    if (employeesWithoutRoles.length > 0) {
      console.log('📋 Employees needing role assignment:');
      employeesWithoutRoles.forEach(emp => {
        console.log(`   ${emp.ID} | Type: ${emp.EmployeeType || 'UNKNOWN'} | Status: ${emp.Status}`);
      });
      console.log('');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Employees:                ${employees.length}`);
    console.log(`Total Roles:                    ${roles.length}`);
    console.log(`Total EmployeeRole Records:     ${employeeRoles.length}`);
    console.log(`Employees WITH roles:           ${employeesWithRoles.size}`);
    console.log(`Employees WITHOUT roles:        ${employeesWithoutRoles.length}`);
    console.log('='.repeat(60));

    if (employeesWithoutRoles.length > 0) {
      console.log('\n💡 Recommendation: Run migration script to assign roles');
      console.log('   Command: node scripts/migrateEmployeeTypeToRoles.js');
    } else {
      console.log('\n✅ All employees have role assignments!');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Check failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run check
if (require.main === module) {
  checkEmployeeRolesStatus()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkEmployeeRolesStatus };
