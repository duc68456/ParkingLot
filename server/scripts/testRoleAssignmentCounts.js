/* eslint-disable no-console */

/**
 * Test Role Assignment Counts
 * 
 * This script tests the aggregation of assigned users per role
 * Run: node scripts/testRoleAssignmentCounts.js
 */

const mongoose = require('mongoose');
const config = require('../utils/config');

const Role = require('../models/role');
const EmployeeRole = require('../models/employeeRole');

async function testRoleAssignmentCounts() {
  try {
    console.log('🧪 Testing Role Assignment Counts...\n');

    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all roles
    const roles = await Role.find({}).lean();
    console.log(`📊 Found ${roles.length} roles\n`);

    // Aggregate assigned counts
    const roleIds = roles.map(r => r.ID);
    const assignedCounts = await EmployeeRole.aggregate([
      { $match: { RoleID: { $in: roleIds } } },
      { $group: { _id: '$RoleID', count: { $sum: 1 } } }
    ]);

    console.log('📊 Assignment Counts by Role:\n');

    const countMap = {};
    assignedCounts.forEach(ac => {
      countMap[ac._id] = ac.count;
    });

    roles.forEach(role => {
      const count = countMap[role.ID] || 0;
      console.log(`   ${role.ID} | ${role.Name.padEnd(20)} | ${count} users`);
    });

    console.log('\n✅ Test completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  testRoleAssignmentCounts()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRoleAssignmentCounts };
