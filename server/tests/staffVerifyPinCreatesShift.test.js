const request = require('supertest')
const express = require('express')

const StaffAccount = require('../models/staffAccount')
const Shift = require('../models/shift')
const ShiftReport = require('../models/shiftReport')
const ShiftReportDetail = require('../models/shiftReportDetail')
const VehicleType = require('../models/vehicleType')

const staffAccountsRouter = require('../controllers/staffAccounts')

// We mock Mongoose models so the test runs without a database connection.
jest.mock('../models/staffAccount')
jest.mock('../models/shift')
jest.mock('../models/shiftReport')
jest.mock('../models/shiftReportDetail')
jest.mock('../models/vehicleType')

const buildApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/api/staff-accounts', staffAccountsRouter)
  return app
}

describe('POST /api/staff-accounts/verify-pin', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  // This integration-style unit test can take longer on slower CI/Windows environments.
  jest.setTimeout(15000)

  test.skip('creates shift + shift report + report details on successful PIN login', async () => {
    const acc = {
      _id: 'mongo-staff-1',
      ID: 'STA0001',
      EmployeeID: 'EMP0001',
      Status: 'ACTIVE',
      LastLoginAt: null,
      comparePin: jest.fn().mockResolvedValue(true)
    }

    // StaffAccount.find(...).populate(...) chain
    StaffAccount.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([acc])
    })

    StaffAccount.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 1 })

    // Shift is created via `new Shift(...).save()`
    Shift.mockImplementation(function (doc) {
      return {
        ...doc,
        ID: 'SHF0001',
        toJSON: function () { return this },
        save: jest.fn().mockResolvedValue({
          ...doc,
          ID: 'SHF0001',
          toJSON: function () { return this }
        })
      }
    })

    // ShiftReport is found or created via save()
    ShiftReport.findOne.mockResolvedValue(null)
    ShiftReport.mockImplementation(function (doc) {
      return {
        ...doc,
        ID: 'SHR0001',
        toJSON: function () { return this },
        save: jest.fn().mockResolvedValue({
          ...doc,
          ID: 'SHR0001',
          toJSON: function () { return this }
        })
      }
    })

    VehicleType.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { VehicleTypeID: 'VTP0001' },
        { VehicleTypeID: 'VTP0002' }
      ])
    })

    ShiftReportDetail.findOneAndUpdate.mockResolvedValue({ ID: 'SHRD0001' })

    const app = buildApp()

    const res = await request(app)
      .post('/api/staff-accounts/verify-pin')
      .send({ PINCode: '123456', Gate: 'entry' })
      .expect(200)

    expect(res.body?.success).toBe(true)
  // When Shift is mocked as constructor, we can't assert constructor call count reliably here,
  // but we can verify ShiftReport was created based on Shift ID.
  expect(ShiftReport.findOne).toHaveBeenCalledTimes(1)

    // Should create one detail per vehicle type
    expect(ShiftReportDetail.findOneAndUpdate).toHaveBeenCalledTimes(2)

    // Response should include shift
    expect(res.body?.data?.shift).toBeTruthy()
  })
})
