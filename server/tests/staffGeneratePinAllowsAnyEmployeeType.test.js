const request = require('supertest');
const express = require('express');

// Jest in this repo occasionally trips a source-map-support crash on Windows;
// we don't need source maps for this unit test.
process.setSourceMapsEnabled?.(false);

const staffAccountsRouter = require('../controllers/staffAccounts');

const Employee = require('../models/employee');
const StaffAccount = require('../models/staffAccount');

jest.mock('../models/employee');
jest.mock('../models/staffAccount');

// Make auth middlewares no-ops for this isolated router test.
jest.mock('../utils/middleware', () => ({
  authRequired: (req, _res, next) => next(),
  adminOnly: (_req, _res, next) => next()
}));

// Avoid randomness flake; the controller uses Math.random() to build a 6-digit code.
// We stub it so the generated PIN is deterministic.
beforeAll(() => {
  jest.spyOn(global.Math, 'random').mockReturnValue(0);
});

afterAll(() => {
  global.Math.random.mockRestore();
});

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/staff-accounts', staffAccountsRouter);
  return app;
};

describe('POST /api/staff-accounts/by-employee/:employeeBusinessId/generate-pin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('allows pin generation for ADMIN employee type (option C)', async () => {
    Employee.findOne.mockResolvedValue({ ID: 'EMP0015', EmployeeType: 'ADMIN' });

    StaffAccount.findOne.mockResolvedValue(null);

    // The route uses `new StaffAccount({...}).save()` when missing
    StaffAccount.mockImplementation(function (doc) {
      return {
        ...doc,
        _id: 'mongo-staff-acc-1',
        save: jest.fn().mockResolvedValue({
          ...doc,
          _id: 'mongo-staff-acc-1'
        })
      };
    });

    const app = buildApp();

    const res = await request(app)
      .post('/api/staff-accounts/by-employee/EMP0015/generate-pin')
      .expect(200);

    expect(res.body?.success).toBe(true);
    expect(res.body?.data?.employeeBusinessId).toBe('EMP0015');
    expect(res.body?.data?.pin).toBe('100000');
  });
});
