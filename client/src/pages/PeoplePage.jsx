import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import PageHeader from "../components/PageHeader";
import TabNavigation from "../components/TabNavigation";
import SearchInput from "../components/SearchInput";
import StatusFilter from "../components/StatusFilter";
import CustomersTable from "../components/CustomersTable";
import EmployeesTable from "../components/EmployeesTable";
import AddEmployeeModal from "../components/AddEmployeeModal";
import ViewCardsModal from "../components/ViewCardsModal";
import ViewCustomerModal from "../components/ViewCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import DeleteCustomerModal from "../components/DeleteCustomerModal";
import EditEmployeeModal from "../components/EditEmployeeModal";
import CreateCustomerModal from "../components/CreateCustomerModal";
import {
  CommonActionAddIcon,
  CommonActionSearchIcon,
} from "../assets/icons/common";
import {
  PeopleTabCustomerIcon,
  PeopleTabEmployeeIcon,
} from "../assets/icons/people";
import "../styles/pages/PeoplePage.css";

// Some shared components (SearchInput / CustomersTable) currently expect an image URL.
// For those, we keep using the existing local SVG strings already in the repo.
import searchInputIconUrl from "../assets/icons/cards/actions/search.svg";
import phoneIconUrl from "../assets/icons/common/objects/phone.svg";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// // Mock data
// const mockCustomers = [
//   {
//     id: 'CUST001',
//     name: 'John Doe',
//     email: 'john.doe@email.com',
//     initials: 'JD',
//     phone: '+1234567890',
//     status: 'Active',
//     registered: '15/01/2023',
//     address: '123 Main St, City',
//     hometown: 'Springfield',
//     gender: 'Male'
//   },
//   {
//     id: 'CUST002',
//     name: 'Jane Smith',
//     email: 'jane.smith@email.com',
//     initials: 'JS',
//     phone: '+1234567891',
//     status: 'Active',
//     registered: '20/02/2023',
//     address: '456 Oak Ave, Town',
//     hometown: 'Riverside',
//     gender: 'Female'
//   }
// ];

// Mock cards data for customers
// const mockCustomerCards = {
//   'CUST001': [
//     {
//       cardId: 'CARD001',
//       uid: 'UID-123456',
//       licensePlate: 'ABC-1234',
//       vehicleType: 'Car',
//       status: 'Active',
//       expiryDate: '31/12/2025'
//     },
//     {
//       cardId: 'CARD006',
//       uid: 'UID-123461',
//       status: 'Damaged',
//       expiryDate: '15/08/2025'
//     }
//   ],
//   'CUST002': [
//     {
//       cardId: 'CARD002',
//       uid: 'UID-789012',
//       licensePlate: 'XYZ-5678',
//       vehicleType: 'Motorcycle',
//       status: 'Active',
//       expiryDate: '30/06/2026'
//     }
//   ]
// };

// Mock vehicles data for customers
const mockCustomerVehicles = {
  CUST001: [
    {
      plateNumber: "ABC-1234",
      vehicleType: "Car",
      registeredDate: "15/01/2023",
    },
  ],
  CUST002: [
    {
      plateNumber: "XYZ-5678",
      vehicleType: "Car",
      registeredDate: "20/02/2023",
    },
  ],
};

// const mockEmployees = [
//   {
//     id: 'EMP001',
//     name: 'Alice Manager',
//     role: 'ADMIN',
//     initials: 'AM',
//     status: 'Active',
//     hiredDate: '01/01/2022'
//   },
//   {
//     id: 'EMP002',
//     name: 'Tom Staff',
//     role: 'GATE_STAFF',
//     initials: 'TS',
//     status: 'Active',
//     hiredDate: '15/06/2022'
//   },
//   {
//     id: 'EMP003',
//     name: 'Sarah Manager',
//     role: 'MANAGER',
//     initials: 'SM',
//     status: 'Active',
//     hiredDate: '20/03/2022'
//   }
// ];

export default function PeoplePage() {
  const { authHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState("customers");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [customerCards, setCustomerCards] = useState([]);
  const [customerCardsLoading, setCustomerCardsLoading] = useState(false);
  const [customerCardsError, setCustomerCardsError] = useState("");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);

  const tabs = [
    {
      id: "customers",
      label: "Customers",
      icon: <PeopleTabCustomerIcon aria-hidden="true" />,
      count: customers.length,
    },
    {
      id: "employees",
      label: "Employees",
      icon: <PeopleTabEmployeeIcon aria-hidden="true" />,
      count: employees.length,
    },
  ];

  const normalizeEmployee = (e) => {
    // API returns:
    // - `person`: populated Person document (virtual populate)
    // - `PersonID`: string business id (PER####)
    // Prefer the populated person object first.
    const person = e?.person ?? e?.PersonID;
    const fullName = person?.FullName ?? e?.FullName ?? e?.name ?? "";
    const phone = person?.Phone ?? e?.Phone ?? e?.phone ?? "";
    const gender = person?.Gender ?? e?.Gender ?? e?.gender;
    const employeeType =
      e?.EmployeeType ?? e?.employeeType ?? e?.role ?? "STAFF";
    const isActive = person?.IsActive ?? person?.Isactive ?? person?.isActive;
    const hiredDateRaw = e?.HiredDate ?? e?.hiredDate;
    const status = e?.status ?? e?.Status ?? "INACTIVE";

    const initials = fullName
      ? fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("")
      : "";

    const hiredDate = hiredDateRaw
      ? new Date(hiredDateRaw).toLocaleDateString("en-GB")
      : "";

    return {
      // Employee document IDs
      id: e?.ID ?? e?.id ?? e?._id,
      _id: e?._id ?? e?.id,
      EmployeeID: e?.ID ?? e?.id,

      // Person linkage
      personId: e?.person?.id ?? e?.person?._id,
      // Person business ID (PER####) when available (needed for Card.OwnerID)
      personBusinessId:
        e?.person?.ID ??
        (typeof e?.PersonID === "string" ? e.PersonID : undefined),

      // UI fields expected by existing components
      name: fullName,
      phone,
      gender,
      role: employeeType,
      initials,
      status:
        isActive === false || status === "INACTIVE" ? "Inactive" : "Active",
      hiredDate,
    };
  };

  const normalizeCustomer = (c) => {
    // API returns:
    // - `person`: populated Person document
    // - `PersonID`: string business id (PER####)
    // Prefer the populated person object first.
    const person = c?.person ?? c?.PersonID;
    const fullName = person?.FullName ?? c?.FullName ?? c?.name ?? "";
    const phone = person?.Phone ?? c?.Phone ?? c?.phone ?? "";
    const gender = person?.Gender ?? c?.Gender ?? c?.gender;

    const isActive = person?.IsActive ?? person?.Isactive ?? person?.isActive;
    const registeredRaw = c?.RegisteredDay ?? c?.registeredDay ?? c?.createdAt;
    const status = c?.status ?? c?.Status ?? "INACTIVE";

    const registered = registeredRaw
      ? new Date(registeredRaw).toLocaleDateString("en-GB")
      : "";

    const initials = fullName
      ? fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join("")
      : "";

    return {
      id: c?.ID ?? c?.id ?? c?._id,
      _id: c?._id ?? c?.id,
      CustomerID: c?.ID ?? c?.id,

      // Mongo _id of person (used for PUT /api/persons/:id)
      personId: c?.person?.id ?? c?.person?._id,
      // Person business ID (PER####) when available (needed for Card.OwnerID)
      personBusinessId:
        c?.person?.ID ??
        (typeof c?.PersonID === "string" ? c.PersonID : undefined),

      name: fullName,
      initials,
      phone,
      gender,
      // CustomersTable expects some fields; keep them safe
      email: c?.Email ?? c?.email ?? "",
      status:
        isActive === false || status === "INACTIVE" ? "Inactive" : "Active",
      registered,
      address: c?.Address ?? c?.address ?? "",
      hometown: c?.Hometown ?? c?.hometown ?? "",
      // New counts from backend enrichment
      cardsCount: c?.cardsCount,
      activeSubscriptions: c?.activeSubscriptions,
      registeredDay: c?.registeredDay || c?.RegisteredDay,
    };
  };

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/employees?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch employees (${res.status})`);
        }

        const json = await res.json();
        const list = Array.isArray(json?.data?.employees)
          ? json.data.employees
          : [];

        setEmployees(list.map(normalizeEmployee));
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Fetch employees error:", err);
          setEmployees([]);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/customers?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch customers (${res.status})`);
        }

        const json = await res.json();
        const list = Array.isArray(json?.data?.customers)
          ? json.data.customers
          : [];

        setCustomers(list.map(normalizeCustomer));
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Fetch customers error:", err);
          setCustomers([]);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  const handleAddEmployee = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitEmployee = (formData) => {
    (async () => {
      try {
        // Validate employee info before creating any documents
        const rawType = String(formData?.employeeType || "")
          .trim()
          .toUpperCase();
        const allowedTypes = ["STAFF", "GATE_STAFF", "MANAGER", "ADMIN"];

        if (!rawType) {
          throw new Error("Please select a valid employee type.");
        }
        if (!allowedTypes.includes(rawType)) {
          throw new Error(`Employee type "${rawType}" is not supported.`);
        }

        // Server-side preflight: if invalid, this blocks BEFORE person creation
        const validateRes = await fetch(
          `${API_BASE_URL}/api/employees/validate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders },
            body: JSON.stringify({
              EmployeeType: rawType,
              FullName: formData.fullName,
              Phone: formData.phone,
              Gender: formData.gender,
            }),
          }
        );

        const validateJson = await validateRes.json().catch(() => ({}));
        if (!validateRes.ok || validateJson?.success === false) {
          const msg =
            validateJson?.error?.message || "Employee info is not suitable";
          const details = validateJson?.error?.details;
          throw new Error(details ? `${msg}: ${details}` : msg);
        }

        let createdPersonId = null;

        // 1) Create person first (employee inherits from person)
        const personRes = await fetch(`${API_BASE_URL}/api/persons`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            FullName: formData.fullName,
            Phone: formData.phone,
            Gender: formData.gender,
          }),
        });

        const personJson = await personRes.json();

        if (!personRes.ok) {
          const msg =
            personJson?.error?.message ||
            `Create person failed (${personRes.status})`;
          throw new Error(msg);
        }

        const person = personJson?.data;
        const personId = person?.id ?? person?._id;
        if (!personId)
          throw new Error("Create person succeeded but no id returned");

        createdPersonId = personId;

        // 2) Create employee referencing that person
        const employeeRes = await fetch(`${API_BASE_URL}/api/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            PersonID: personId,
            EmployeeType: formData.employeeType,
            Status: "ACTIVE",
          }),
        });

        const employeeJson = await employeeRes.json();

        if (!employeeRes.ok) {
          const msg =
            employeeJson?.error?.message ||
            `Create employee failed (${employeeRes.status})`;
          // Roll back the created person to avoid leaving orphan records
          if (createdPersonId) {
            try {
              await fetch(
                `${API_BASE_URL}/api/persons/${encodeURIComponent(
                  createdPersonId
                )}`,
                {
                  method: "DELETE",
                  headers: { ...authHeaders },
                }
              );
            } catch {
              // ignore rollback errors
            }
          }
          const details = employeeJson?.error?.details;
          throw new Error(details ? `${msg}: ${details}` : msg);
        }

        const created = employeeJson?.data;
        if (created) {
          setEmployees((prev) => [normalizeEmployee(created), ...prev]);
        }

        setIsModalOpen(false);
      } catch (error) {
        console.error("Create employee error:", error);
        window.alert(error?.message || "Failed to create employee");
      }
    })();
  };

  const handleViewCards = (customer) => {
    setSelectedCustomer(customer);
    setShowCardsModal(true);

    // Card.OwnerID stores Person.ID (PER####). Prefer that.
    const ownerId =
      customer?.personBusinessId ||
      customer?.personId ||
      customer?.id ||
      customer?.ID;
    if (!ownerId) {
      setCustomerCards([]);
      setCustomerCardsError("Missing customer id");
      return;
    }

    (async () => {
      try {
        setCustomerCardsError("");
        setCustomerCardsLoading(true);

        const res = await fetch(
          `${API_BASE_URL}/api/cards?limit=200&ownerId=${encodeURIComponent(
            ownerId
          )}`,
          {
            headers: { ...authHeaders },
          }
        );

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            json?.error?.message ||
            `Failed to fetch customer cards (${res.status})`;
          throw new Error(msg);
        }

        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        const normalized = items.map((c) => {
          const categoryName =
            c?.CardCategoryID?.Name ||
            c?.CardCategoryID?.ID ||
            c?.CardCategoryID;
          const rawStatus = String(c?.Status || "");
          const status = rawStatus
            ? rawStatus.charAt(0) +
            rawStatus
              .slice(1)
              .toLowerCase()
              .replace(/_(.)/g, (_, ch) => ` ${ch.toUpperCase()}`)
            : "-";

          const expiryDate = c?.ExpireDay
            ? (() => {
              const d = new Date(c.ExpireDay);
              if (Number.isNaN(d.getTime())) return "-";
              return d.toLocaleDateString("en-GB");
            })()
            : "-";

          return {
            cardId: c?.CardID || c?.id || c?._id,
            uid: c?.UID,
            status,
            expiryDate,
            category: categoryName || "-",
            plateNumber: c?.VehiclePlate || c?.VehicleID?.PlateNumber,
            vehicleType:
              c?.VehicleID?.VehicleTypeID?.Name || c?.VehicleType || "",
          };
        });

        setCustomerCards(normalized);
      } catch (err) {
        console.error("Fetch customer cards error:", err);
        setCustomerCards([]);
        setCustomerCardsError(err?.message || "Failed to fetch customer cards");
      } finally {
        setCustomerCardsLoading(false);
      }
    })();
  };

  const handleCloseCardsModal = () => {
    setShowCardsModal(false);
    setSelectedCustomer(null);
    setCustomerCards([]);
    setCustomerCardsError("");
    setCustomerCardsLoading(false);
  };

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleCloseCustomerModal = () => {
    setShowCustomerModal(false);
    setSelectedCustomer(null);
  };

  const handleEditCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowEditCustomerModal(true);
  };

  const handleDeleteCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDeleteCustomerModal(true);
  };

  const handleCreateCustomer = () => {
    setShowCreateCustomerModal(true);
  };

  const handleCloseCreateCustomerModal = () => {
    setShowCreateCustomerModal(false);
  };

  const handleSubmitCreateCustomer = (formData) => {
    (async () => {
      try {
        // 1) create person
        const personRes = await fetch(`${API_BASE_URL}/api/persons`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            FullName: formData.fullName,
            Phone: formData.phone,
            Gender: formData.gender,
          }),
        });

        const personJson = await personRes.json();
        if (!personRes.ok) {
          const msg =
            personJson?.error?.message ||
            `Create person failed (${personRes.status})`;
          throw new Error(msg);
        }

        const person = personJson?.data;
        const personId = person?.id ?? person?._id;
        if (!personId)
          throw new Error("Create person succeeded but no id returned");

        // 2) create customer referencing that person
        const customerRes = await fetch(`${API_BASE_URL}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            PersonID: personId,
            Status: "ACTIVE",
          }),
        });

        const customerJson = await customerRes.json();
        if (!customerRes.ok) {
          const msg =
            customerJson?.error?.message ||
            `Create customer failed (${customerRes.status})`;
          throw new Error(msg);
        }

        const created = customerJson?.data;
        if (created) {
          setCustomers((prev) => [normalizeCustomer(created), ...prev]);
        }

        setShowCreateCustomerModal(false);
      } catch (error) {
        console.error("Create customer error:", error);
        window.alert(error?.message || "Failed to create customer");
      }
    })();
  };

  const handleCloseEditCustomerModal = () => {
    setShowEditCustomerModal(false);
    setSelectedCustomer(null);
  };

  const handleCloseDeleteCustomerModal = () => {
    setShowDeleteCustomerModal(false);
    setSelectedCustomer(null);
  };

  const handleSaveCustomer = (updatedCustomer) => {
    (async () => {
      try {
        const id = updatedCustomer?._id ?? updatedCustomer?.id;
        if (!id) return;

        // Update Person fields first (name/phone live on Person)
        const personId = updatedCustomer?.personId;
        if (personId) {
          const personRes = await fetch(
            `${API_BASE_URL}/api/persons/${personId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...authHeaders },
              body: JSON.stringify({
                FullName: updatedCustomer?.name,
                Phone: updatedCustomer?.phone,
                Gender: updatedCustomer?.gender,
                IsActive:
                  (updatedCustomer?.status || "").toLowerCase() === "active",
              }),
            }
          );

          const personJson = await personRes.json();
          if (!personRes.ok) {
            const msg =
              personJson?.error?.message ||
              `Update person failed (${personRes.status})`;
            throw new Error(msg);
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            Status:
              (updatedCustomer?.status || "").toLowerCase() === "active"
                ? "ACTIVE"
                : "INACTIVE",
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Update failed (${res.status})`;
          throw new Error(msg);
        }

        const saved = json?.data;
        const normalized = saved ? normalizeCustomer(saved) : updatedCustomer;
        setCustomers((prev) =>
          prev.map((c) => (c._id === normalized._id ? normalized : c))
        );
      } catch (error) {
        console.error("Update customer error:", error);
        window.alert(error?.message || "Failed to update customer");
      }
    })();
  };

  const handleConfirmDeleteCustomer = (customerToDelete) => {
    if (!customerToDelete) return;

    (async () => {
      try {
        const id = customerToDelete?._id ?? customerToDelete?.id;
        if (!id) return;

        const res = await fetch(`${API_BASE_URL}/api/customers/${id}`, {
          method: "DELETE",
          headers: { ...authHeaders },
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Delete failed (${res.status})`;
          throw new Error(msg);
        }

        // Backend soft-deletes by setting Status=INACTIVE; reflect in UI
        setCustomers((prev) =>
          prev.map((c) =>
            c._id === customerToDelete._id ? { ...c, status: "Inactive" } : c
          )
        );
        handleCloseDeleteCustomerModal();
      } catch (error) {
        console.error("Delete customer error:", error);
        window.alert(error?.message || "Failed to delete customer");
      }
    })();
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowEditEmployeeModal(true);
  };

  const handleCloseEditEmployeeModal = () => {
    setShowEditEmployeeModal(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = (updatedEmployee) => {
    (async () => {
      try {
        const id = updatedEmployee?._id ?? updatedEmployee?.id;
        if (!id) return;

        // Update Person fields first (name/phone/gender live on the Person document)
        const personId = updatedEmployee?.personId;
        if (personId) {
          const personRes = await fetch(
            `${API_BASE_URL}/api/persons/${personId}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json", ...authHeaders },
              body: JSON.stringify({
                FullName: updatedEmployee?.name,
                Phone: updatedEmployee?.phone,
                Gender: updatedEmployee?.gender,
                // Keep Person active/inactive aligned with UI status
                IsActive:
                  (updatedEmployee?.status || "").toLowerCase() === "active",
              }),
            }
          );

          const personJson = await personRes.json();
          if (!personRes.ok) {
            const msg =
              personJson?.error?.message ||
              `Update person failed (${personRes.status})`;
            throw new Error(msg);
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({
            EmployeeType: updatedEmployee?.role,
            Status:
              (updatedEmployee?.status || "").toLowerCase() === "active"
                ? "ACTIVE"
                : "INACTIVE",
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Update failed (${res.status})`;
          throw new Error(msg);
        }

        const saved = json?.data;
        const normalized = saved ? normalizeEmployee(saved) : updatedEmployee;
        setEmployees((prev) =>
          prev.map((e) => (e._id === normalized._id ? normalized : e))
        );

        // Close modal on success
        setShowEditEmployeeModal(false);
        setSelectedEmployee(null);
      } catch (error) {
        console.error("Update employee error:", error);
        window.alert(error?.message || "Failed to update employee");
      }
    })();
  };

  const handleDeleteEmployee = (employee) => {
    (async () => {
      try {
        const id = employee?._id ?? employee?.id;
        if (!id) return;

        const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, {
          method: "DELETE",
          headers: { ...authHeaders },
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Delete failed (${res.status})`;
          throw new Error(msg);
        }

        // Backend sets Status=TERMINATED; reflect as Inactive in UI
        setEmployees((prev) =>
          prev.map((e) =>
            e._id === employee._id ? { ...e, status: "Inactive" } : e
          )
        );
      } catch (error) {
        console.error("Delete employee error:", error);
        window.alert(error?.message || "Failed to delete employee");
      }
    })();
  };

  const filteredCustomers = customers
    .filter((customer) => {
      return (
        customer.status.toLowerCase() === statusFilter.toLowerCase() ||
        statusFilter === "All Status"
      );
    })
    .filter((customer) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (customer?.name || "").toLowerCase().includes(q) ||
        (customer?.phone || "").toLowerCase().includes(q) ||
        (customer?.email || "").toLowerCase().includes(q)
      );
    });

  const filteredEmployees = employees
    .filter((employee) => {
      console.warn(employee);
      return (
        employee.status.toLowerCase() === statusFilter.toLowerCase() ||
        statusFilter === "All Status"
      );
    })
    .filter((employee) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (employee?.name || "").toLowerCase().includes(q) ||
        (employee?.phone || "").toLowerCase().includes(q) ||
        (employee?.role || "").toLowerCase().includes(q)
      );
    });

  return (
    <div className="people-page">
      <div className="people-page-header">
        <PageHeader
          title="Manage People"
          subtitle="Manage customers and employees in your parking system"
        />
      </div>

      <div className="tab-navigation-wrapper">
        <TabNavigation
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="people-content">
        <div className="people-controls">
          <div className="people-controls-top">
            <SearchInput
              placeholder={
                activeTab === "customers"
                  ? "Search customers..."
                  : "Search employees..."
              }
              value={searchQuery}
              onChange={setSearchQuery}
              icon={searchInputIconUrl}
            />

            {activeTab === "customers" && (
              <button
                className="add-employee-btn"
                onClick={handleCreateCustomer}
                type="button"
              >
                <span className="btn-icon" aria-hidden="true">
                  <CommonActionAddIcon />
                </span>
                <span>Create Customer</span>
              </button>
            )}

            {activeTab === "employees" && (
              <button
                className="add-employee-btn"
                onClick={handleAddEmployee}
                type="button"
              >
                <span className="btn-icon" aria-hidden="true">
                  <CommonActionAddIcon />
                </span>
                <span>Add Employee</span>
              </button>
            )}
          </div>

          <StatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            count={
              activeTab === "customers"
                ? `(${filteredCustomers.length}/${customers.length})`
                : `(${filteredEmployees.length}/${employees.length})`
            }
          />
        </div>

        {activeTab === "customers" ? (
          <CustomersTable
            customers={filteredCustomers}
            phoneIcon={phoneIconUrl}
            onView={handleViewCustomer}
            onViewCards={handleViewCards}
            onEdit={handleEditCustomer}
            onDelete={handleDeleteCustomer}
          />
        ) : (
          <EmployeesTable
            employees={filteredEmployees}
            onViewCards={handleViewCards}
            onEdit={handleEditEmployee}
            onDelete={handleDeleteEmployee}
          />
        )}
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitEmployee}
      />

      {showCardsModal && selectedCustomer && (
        <ViewCardsModal
          customer={selectedCustomer}
          cards={customerCards}
          loading={customerCardsLoading}
          error={customerCardsError}
          onClose={handleCloseCardsModal}
        />
      )}

      {showCustomerModal && selectedCustomer && (
        <ViewCustomerModal
          customer={selectedCustomer}
          vehicles={mockCustomerVehicles[selectedCustomer.id] || []}
          onClose={handleCloseCustomerModal}
        />
      )}

      {showEditCustomerModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={handleCloseEditCustomerModal}
          onSave={handleSaveCustomer}
        />
      )}

      {showDeleteCustomerModal && selectedCustomer && (
        <DeleteCustomerModal
          customer={selectedCustomer}
          onClose={handleCloseDeleteCustomerModal}
          onConfirm={handleConfirmDeleteCustomer}
        />
      )}

      {showCreateCustomerModal && (
        <CreateCustomerModal
          onClose={handleCloseCreateCustomerModal}
          onSubmit={handleSubmitCreateCustomer}
        />
      )}

      {showEditEmployeeModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={handleCloseEditEmployeeModal}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  );
}
