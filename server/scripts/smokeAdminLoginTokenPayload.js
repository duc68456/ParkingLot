/*
  Smoke check: ensure admin login token payload building won't throw if
  employeeBusinessId is null and _id is present.

  Run (cmd.exe):
    node server\scripts\smokeAdminLoginTokenPayload.js
*/

const { signToken } = require('../utils/auth');

const main = () => {
  const adminAccountObjectId = '64b7b2d6f2c3a9b0c1d2e3f4';

  // Simulate worst-case legacy scenario: employeeBusinessId can't be resolved.
  const employeeBusinessId = null;

  const token = signToken({
    type: 'admin',
    adminAccountId: adminAccountObjectId,
    username: 'admin',
    employeeId: employeeBusinessId,
    employeeBusinessId
  });

  if (!token || typeof token !== 'string') {
    throw new Error('Expected token to be a string');
  }

  console.log('OK: token generated. length=', token.length);
};

main();
