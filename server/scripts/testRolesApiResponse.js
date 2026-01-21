/* eslint-disable no-console */

/**
 * Test API Roles Response
 * This simulates what the frontend sees
 * Run: node scripts/testRolesApiResponse.js
 */

const mongoose = require('mongoose');
const config = require('../utils/config');

const Role = require('../models/role');
const EmployeeRole = require('../models/employeeRole');

function normalizeRoleDoc(role) {
  if (!role) return null;
  return {
    ID: role.ID,
    Name: role.Name,
    Description: role.Description,
    IsActive: role.IsActive,
    UpdatedBy: role.UpdatedBy,
    CreatedAt: role.CreatedAt,
    UpdatedAt: role.UpdatedAt
  };
}

async function testRolesApiResponse() {
  try {
    console.log('🧪 Testing API Roles Response Format...\n');

    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Simulate the GET /api/roles endpoint
    const limit = 500;
    const roles = await Role.find({}, null, { sort: { CreatedAt: -1 }, limit }).lean();

    // Aggregate assigned users count for each role
    const roleIds = roles.map(r => r.ID);
    const assignedCounts = await EmployeeRole.aggregate([
      { $match: { RoleID: { $in: roleIds } } },
      { $group: { _id: '$RoleID', count: { $sum: 1 } } }
    ]);

    // Create a map: RoleID -> count
    const countMap = {};
    assignedCounts.forEach(ac => {
      countMap[ac._id] = ac.count;
    });

    // Attach AssignedUsers count to each role
    const rolesWithCounts = roles.map(role => {
      const normalized = normalizeRoleDoc(role);
      normalized.AssignedUsers = countMap[role.ID] || 0;
      return normalized;
    });

    console.log('📊 API Response (simulated):\n');
    console.log(JSON.stringify({ success: true, data: { roles: rolesWithCounts } }, null, 2));

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
  testRolesApiResponse()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRolesApiResponse };
