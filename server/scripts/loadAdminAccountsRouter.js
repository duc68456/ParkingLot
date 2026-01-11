/*
  Sanity check: loads the adminAccounts controller file.

  Run (cmd.exe):
    cd server
    node scripts\loadAdminAccountsRouter.js
*/

try {
  // eslint-disable-next-line global-require
  const router = require('../controllers/adminAccounts');
  console.log('OK: adminAccounts router loaded:', !!router);
} catch (e) {
  console.error('FAILED: could not load adminAccounts router');
  console.error(e);
  process.exitCode = 1;
}
