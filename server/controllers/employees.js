const employeesRouter = require("express").Router();
const Employee = require("../models/employee");
const Person = require("../models/person");
const EmployeeRole = require("../models/employeeRole");
const middleware = require('../utils/middleware');

const isEmployeeBusinessId = (val) => /^EMP\d{4}$/i.test(String(val || '').trim());

const ALLOWED_EMPLOYEE_TYPES = ["STAFF", "GATE_STAFF", "MANAGER", "ADMIN"];
const ALLOWED_EMPLOYEE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_LEAVE",
  "TERMINATED",
];

/**
 * GET /api/employees
 * Get all employees with filtering and pagination
 *
 * Query parameters:
 * - status: string - Filter by status
 * - employeeType: string - Filter by employee type
 * - search: string - Search by person name/phone
 * - page: number - Page number for pagination
 * - limit: number - Items per page
 */
employeesRouter.get(
  "/",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const {
        status,
        employeeType,
        search,
        page = 1,
        limit = 20,
      } = request.query;

      // Build filter object
      const filter = {};

      if (status) {
        filter.Status = status.toUpperCase();
      }

      if (employeeType) {
        filter.EmployeeType = employeeType.toUpperCase();
      }

      // If search, first find matching persons and map to Person.ID (business IDs)
      if (search) {
        const persons = await Person.find({
          $or: [
            { FullName: new RegExp(search, "i") },
            { Phone: new RegExp(search, "i") },
          ],
        }).select("ID");
        const personIds = persons.map((p) => p.ID).filter(Boolean);
        filter.PersonID = { $in: personIds };
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Build query with person population (PersonID is a business ID string)
      const employees = await Employee.find(filter)
        .populate("person", "ID FullName Phone Gender IsActive")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      // Get total count for pagination
      const total = await Employee.countDocuments(filter);

      response.json({
        success: true,
        data: {
          employees,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      console.error("Get employees error:", error);
      response.status(500).json({
        success: false,
        error: {
          message: "Failed to get employees",
          details: error.message,
        },
      });
    }
  });

/**
 * GET /api/employees/:id
 * Get single employee by ID with person details
 */
employeesRouter.get(
  "/:id",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const employee = await Employee.findById(request.params.id).populate(
        "person",
        "ID FullName Phone Gender IsActive"
      );

      if (!employee) {
        return response.status(404).json({
          success: false,
          error: {
            message: "Employee not found",
            code: "EMPLOYEE_NOT_FOUND",
          },
        });
      }

      response.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      console.error("Get employee by ID error:", error);
      response.status(500).json({
        success: false,
        error: {
          message: "Failed to get employee",
          details: error.message,
        },
      });
    }
  });

/**
 * GET /api/employees/:employeeBusinessId/roles
 * Returns explicit EmployeeRole assignments (multi-role).
 * If none exist, returns an empty array (client can decide fallback behavior).
 */
employeesRouter.get(
  "/:employeeBusinessId/roles",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.ACCESS_MANAGEMENT_HUB', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const employeeBusinessId = String(request.params.employeeBusinessId || '').trim().toUpperCase();
      if (!employeeBusinessId || !isEmployeeBusinessId(employeeBusinessId)) {
        return response.status(400).json({
          success: false,
          error: { message: 'Invalid employee business id', code: 'VALIDATION_ERROR' }
        });
      }

      const exists = await Employee.exists({ ID: employeeBusinessId });
      if (!exists) {
        return response.status(404).json({
          success: false,
          error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
        });
      }

      const rows = await EmployeeRole.find({ EmployeeID: employeeBusinessId }, { RoleID: 1, _id: 0 }).lean();
      const roleIds = (rows || []).map((r) => String(r.RoleID || '').toUpperCase()).filter(Boolean);

      return response.json({ success: true, data: { employeeBusinessId, roleIds } });
    } catch (error) {
      console.error('Get employee roles error:', error);
      return response.status(500).json({
        success: false,
        error: { message: 'Failed to get employee roles', details: error.message }
      });
    }
  }
);

/**
 * PUT /api/employees/:employeeBusinessId/roles
 * Body: { roleIds: string[] }
 * Replace-all semantics.
 */
employeesRouter.put(
  "/:employeeBusinessId/roles",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.ACCESS_MANAGEMENT_HUB', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const employeeBusinessId = String(request.params.employeeBusinessId || '').trim().toUpperCase();
      if (!employeeBusinessId || !isEmployeeBusinessId(employeeBusinessId)) {
        return response.status(400).json({
          success: false,
          error: { message: 'Invalid employee business id', code: 'VALIDATION_ERROR' }
        });
      }

      const exists = await Employee.exists({ ID: employeeBusinessId });
      if (!exists) {
        return response.status(404).json({
          success: false,
          error: { message: 'Employee not found', code: 'EMPLOYEE_NOT_FOUND' }
        });
      }

      const roleIdsRaw = Array.isArray(request.body?.roleIds) ? request.body.roleIds : [];
      const roleIds = Array.from(new Set(roleIdsRaw.map((r) => String(r || '').trim().toUpperCase()).filter(Boolean)));

      // Replace-all
      await EmployeeRole.deleteMany({ EmployeeID: employeeBusinessId });
      if (roleIds.length) {
        await EmployeeRole.insertMany(
          roleIds.map((rid) => ({
            EmployeeID: employeeBusinessId,
            RoleID: rid,
            AssignedBy: request?.user?.employeeBusinessId || request?.user?.employeeId || null,
            AssignedAt: new Date()
          })),
          { ordered: false }
        ).catch(() => {
          // ignore ordered errors
        });
      }

      return response.json({ success: true, data: { employeeBusinessId, roleIds } });
    } catch (error) {
      console.error('Update employee roles error:', error);
      return response.status(500).json({
        success: false,
        error: { message: 'Failed to update employee roles', details: error.message }
      });
    }
  }
);

/**
 * POST /api/employees/validate
 * Preflight validation used by the UI before creating a Person record.
 * This endpoint MUST NOT create any documents.
 */
employeesRouter.post("/validate", async (request, response) => {
  try {
    const { EmployeeType, FullName, Phone, Gender } = request.body || {};

    const normalizedType = String(EmployeeType || "")
      .trim()
      .toUpperCase();
    if (!normalizedType) {
      return response.status(400).json({
        success: false,
        error: {
          message: "Validation error",
          code: "VALIDATION_ERROR",
          details: "EmployeeType is required",
        },
      });
    }
    if (!ALLOWED_EMPLOYEE_TYPES.includes(normalizedType)) {
      return response.status(400).json({
        success: false,
        error: {
          message: "Validation error",
          code: "VALIDATION_ERROR",
          details: `EmployeeType: ${normalizedType} is not a valid employee type`,
        },
      });
    }

    // Basic person fields check (UI submits these); more detailed validation happens in /api/persons.
    if (!FullName || !Phone || !Gender) {
      return response.status(400).json({
        success: false,
        error: {
          message: "Missing required fields",
          code: "MISSING_REQUIRED_FIELDS",
          details: "FullName, Phone, and Gender are required",
        },
      });
    }

    // Block if phone is already taken (would fail person create anyway)
    const existingPerson = await Person.findOne({
      Phone: String(Phone).trim(),
    }).select("ID");
    if (existingPerson) {
      return response.status(409).json({
        success: false,
        error: {
          message: "Phone number already exists",
          code: "DUPLICATE_PHONE",
        },
      });
    }

    return response.json({ success: true, data: { ok: true } });
  } catch (error) {
    console.error("Validate employee payload error:", error);
    return response.status(500).json({
      success: false,
      error: {
        message: "Failed to validate employee payload",
        details: error.message,
      },
    });
  }
});

/**
 * POST /api/employees
 * Create new employee (requires existing person)
 */
employeesRouter.post(
  "/",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const { PersonID, EmployeeType, HiredDate, Status } = request.body;

      const allowedEmployeeTypes = ALLOWED_EMPLOYEE_TYPES;
      const allowedStatuses = ALLOWED_EMPLOYEE_STATUSES;

      // Validation
      if (!PersonID) {
        return response.status(400).json({
          success: false,
          error: {
            message: "Missing required fields",
            code: "MISSING_REQUIRED_FIELDS",
            details: "PersonID is required",
          },
        });
      }

      // Validate EmployeeType early (before any writes)
      if (
        EmployeeType !== undefined &&
        EmployeeType !== null &&
        String(EmployeeType).trim() !== ""
      ) {
        const normalizedType = String(EmployeeType).trim().toUpperCase();
        if (!allowedEmployeeTypes.includes(normalizedType)) {
          return response.status(400).json({
            success: false,
            error: {
              message: "Validation error",
              code: "VALIDATION_ERROR",
              details: `EmployeeType: ${normalizedType} is not a valid employee type`,
            },
          });
        }
      }

      // Validate Status early
      if (
        Status !== undefined &&
        Status !== null &&
        String(Status).trim() !== ""
      ) {
        const normalizedStatus = String(Status).trim().toUpperCase();
        if (!allowedStatuses.includes(normalizedStatus)) {
          return response.status(400).json({
            success: false,
            error: {
              message: "Validation error",
              code: "VALIDATION_ERROR",
              details: `Status: ${normalizedStatus} is not a valid status`,
            },
          });
        }
      }

      // Check if person exists (accept either PER#### or Mongo _id)
      let person = null;
      if (/^PER\d{4}$/i.test(String(PersonID))) {
        person = await Person.findOne({ ID: String(PersonID).toUpperCase() });
      } else {
        person = await Person.findById(PersonID);
      }
      if (!person) {
        return response.status(404).json({
          success: false,
          error: {
            message: "Person not found",
            code: "PERSON_NOT_FOUND",
          },
        });
      }

      // Block employee creation if person is not active/suitable
      // (This prevents creating an Employee record for a deactivated person.)
      if (person.IsActive === false) {
        return response.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            code: "VALIDATION_ERROR",
            details: "Person is inactive and cannot be assigned as an employee",
          },
        });
      }

      // Check if person is already an employee (PersonID stored as Person.ID)
      const existingEmployee = await Employee.findOne({ PersonID: person.ID });
      if (existingEmployee) {
        return response.status(409).json({
          success: false,
          error: {
            message: "Person is already an employee",
            code: "DUPLICATE_EMPLOYEE",
          },
        });
      }

      // Create employee
      const employee = new Employee({
        PersonID: person.ID,
        EmployeeType: EmployeeType ? String(EmployeeType).toUpperCase() : "STAFF",
        HiredDate: HiredDate || new Date(),
        Status: Status ? String(Status).toUpperCase() : "ACTIVE",
      });

      const savedEmployee = await employee.save();

      // Populate person details before returning
      await savedEmployee.populate("person", "ID FullName Phone Gender IsActive");

      response.status(201).json({
        success: true,
        data: savedEmployee,
        message: "Employee created successfully",
      });
    } catch (error) {
      console.error("Create employee error:", error);

      // Handle validation errors
      if (error.name === "ValidationError") {
        return response.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            code: "VALIDATION_ERROR",
            details: error.message,
          },
        });
      }

      response.status(500).json({
        success: false,
        error: {
          message: "Failed to create employee",
          details: error.message,
        },
      });
    }
  });

/**
 * PUT /api/employees/:id
 * Update employee
 */
employeesRouter.put(
  "/:id",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const { EmployeeType, HiredDate, Status } = request.body;

      // Find employee
      const employee = await Employee.findById(request.params.id);

      if (!employee) {
        return response.status(404).json({
          success: false,
          error: {
            message: "Employee not found",
            code: "EMPLOYEE_NOT_FOUND",
          },
        });
      }

      // Update fields (PersonID cannot be changed)
      if (EmployeeType !== undefined)
        employee.EmployeeType = EmployeeType.toUpperCase();
      if (HiredDate !== undefined) employee.HiredDate = HiredDate;
      if (Status !== undefined) employee.Status = Status.toUpperCase();

      const updatedEmployee = await employee.save();
      await updatedEmployee.populate(
        "person",
        "ID FullName Phone Gender IsActive"
      );

      response.json({
        success: true,
        data: updatedEmployee,
        message: "Employee updated successfully",
      });
    } catch (error) {
      console.error("Update employee error:", error);

      // Handle validation errors
      if (error.name === "ValidationError") {
        return response.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            code: "VALIDATION_ERROR",
            details: error.message,
          },
        });
      }

      response.status(500).json({
        success: false,
        error: {
          message: "Failed to update employee",
          details: error.message,
        },
      });
    }
  });

/**
 * DELETE /api/employees/:id
 * Update employee status (soft delete - typically set to INACTIVE)
 */
employeesRouter.delete(
  "/:id",
  middleware.requireAnyPermission(['PEOPLE.MANAGE_EMPLOYEES', 'PEOPLE.FULL']),
  async (request, response) => {
    try {
      const { status } = request.body;

      const employee = await Employee.findById(request.params.id).populate(
        "person",
        "ID FullName"
      );

      if (!employee) {
        return response.status(404).json({
          success: false,
          error: {
            message: "Employee not found",
            code: "EMPLOYEE_NOT_FOUND",
          },
        });
      }

      // Update status - accept from body or default to INACTIVE
      const newStatus = status ? String(status).toUpperCase() : "INACTIVE";
      const allowedStatuses = ALLOWED_EMPLOYEE_STATUSES;

      if (!allowedStatuses.includes(newStatus)) {
        return response.status(400).json({
          success: false,
          error: {
            message: "Validation error",
            code: "VALIDATION_ERROR",
            details: `Status: ${newStatus} is not a valid status`,
          },
        });
      }

      employee.Status = newStatus;
      await employee.save();

      // Verify if we need to reactivate the Person record
      if (newStatus === 'ACTIVE' && employee.PersonID) {
        // Employee.PersonID stores the Business ID (e.g. PER0001)
        await Person.findOneAndUpdate(
          { ID: employee.PersonID },
          { IsActive: true }
        );
      }

      response.json({
        success: true,
        message: "Employee status updated successfully",
        data: {
          id: employee._id,
          ID: employee.ID,
          PersonID: employee.PersonID,
          Status: employee.Status,
        },
      });
    } catch (error) {
      console.error("Delete employee error:", error);
      response.status(500).json({
        success: false,
        error: {
          message: "Failed to update employee status",
          details: error.message,
        },
      });
    }
  });

module.exports = employeesRouter;
