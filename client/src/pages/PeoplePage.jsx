import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import SearchInput from '../components/SearchInput';
import StatusFilter from '../components/StatusFilter';
import CustomersTable from '../components/CustomersTable';
import EmployeesTable from '../components/EmployeesTable';
import AddEmployeeModal from '../components/AddEmployeeModal';
import ViewCardsModal from '../components/ViewCardsModal';
import ViewCustomerModal from '../components/ViewCustomerModal';
import EditCustomerModal from '../components/EditCustomerModal';
import EditEmployeeModal from '../components/EditEmployeeModal';
import { CommonActionAddIcon, CommonActionSearchIcon } from '../assets/icons/common';
import { PeopleTabCustomerIcon, PeopleTabEmployeeIcon } from '../assets/icons/people';
import '../styles/pages/PeoplePage.css';

// Some shared components (SearchInput / CustomersTable) currently expect an image URL.
// For those, we keep using the existing local SVG strings already in the repo.
import searchInputIconUrl from '../assets/icons/cards/actions/search.svg';
import phoneIconUrl from '../assets/icons/common/objects/phone.svg';

// Mock data
const mockCustomers = [
  {
    id: 'CUST001',
    name: 'John Doe',
    email: 'john.doe@email.com',
    initials: 'JD',
    phone: '+1234567890',
    status: 'Active',
    registered: '15/01/2023',
    address: '123 Main St, City',
    hometown: 'Springfield',
    gender: 'Male'
  },
  {
    id: 'CUST002',
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    initials: 'JS',
    phone: '+1234567891',
    status: 'Active',
    registered: '20/02/2023',
    address: '456 Oak Ave, Town',
    hometown: 'Riverside',
    gender: 'Female'
  }
];

// Mock cards data for customers
const mockCustomerCards = {
  'CUST001': [
    {
      cardId: 'CARD001',
      uid: 'UID-123456',
      licensePlate: 'ABC-1234',
      vehicleType: 'Car',
      status: 'Active',
      expiryDate: '31/12/2025'
    },
    {
      cardId: 'CARD006',
      uid: 'UID-123461',
      status: 'Damaged',
      expiryDate: '15/08/2025'
    }
  ],
  'CUST002': [
    {
      cardId: 'CARD002',
      uid: 'UID-789012',
      licensePlate: 'XYZ-5678',
      vehicleType: 'Motorcycle',
      status: 'Active',
      expiryDate: '30/06/2026'
    }
  ]
};

// Mock vehicles data for customers
const mockCustomerVehicles = {
  'CUST001': [
    {
      plateNumber: 'ABC-1234',
      vehicleType: 'Car',
      registeredDate: '15/01/2023'
    }
  ],
  'CUST002': [
    {
      plateNumber: 'XYZ-5678',
      vehicleType: 'Car',
      registeredDate: '20/02/2023'
    }
  ]
};

const mockEmployees = [
  {
    id: 'EMP001',
    name: 'Alice Manager',
    role: 'ADMIN',
    initials: 'AM',
    status: 'Active',
    hiredDate: '01/01/2022'
  },
  {
    id: 'EMP002',
    name: 'Tom Staff',
    role: 'GATE_STAFF',
    initials: 'TS',
    status: 'Active',
    hiredDate: '15/06/2022'
  },
  {
    id: 'EMP003',
    name: 'Sarah Manager',
    role: 'MANAGER',
    initials: 'SM',
    status: 'Active',
    hiredDate: '20/03/2022'
  }
];

export default function PeoplePage() {
  const [activeTab, setActiveTab] = useState('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employees, setEmployees] = useState(mockEmployees);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCardsModal, setShowCardsModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customers, setCustomers] = useState(mockCustomers);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);

  const tabs = [
    { 
      id: 'customers', 
      label: 'Customers', 
      icon: <PeopleTabCustomerIcon aria-hidden="true" />,
      count: customers.length 
    },
    { 
      id: 'employees', 
      label: 'Employees', 
      icon: <PeopleTabEmployeeIcon aria-hidden="true" />,
      count: mockEmployees.length 
    }
  ];

  const handleAddEmployee = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitEmployee = (formData) => {
    const newEmployee = {
      id: `EMP${String(employees.length + 1).padStart(3, '0')}`,
      name: formData.fullName,
      role: formData.employeeType,
      initials: formData.fullName.split(' ').map(n => n[0]).join(''),
      status: 'Active',
      hiredDate: new Date().toLocaleDateString('en-GB').replace(/\//g, '/')
    };
    setEmployees([...employees, newEmployee]);
  };

  const handleViewCards = (customer) => {
    setSelectedCustomer(customer);
    setShowCardsModal(true);
  };

  const handleCloseCardsModal = () => {
    setShowCardsModal(false);
    setSelectedCustomer(null);
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

  const handleCloseEditCustomerModal = () => {
    setShowEditCustomerModal(false);
    setSelectedCustomer(null);
  };

  const handleSaveCustomer = (updatedCustomer) => {
    setCustomers(customers.map(c => 
      c.id === updatedCustomer.id ? updatedCustomer : c
    ));
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
    setEmployees(employees.map(e =>
      e.id === updatedEmployee.id ? updatedEmployee : e
    ));
  };

  const filteredCustomers = customers.filter(customer => 
    customer.status === 'Active' || statusFilter === 'All Status'
  );

  const filteredEmployees = employees.filter(employee => 
    employee.status === 'Active' || statusFilter === 'All Status'
  );

  return (
    <div className="people-page">
      <div className="people-page-header">
        <PageHeader
          title="Manage People"
          subtitle="Manage customers and employees in your parking system"
        />
        {activeTab === 'employees' && (
          <button className="add-employee-btn" onClick={handleAddEmployee}>
            <span className="btn-icon" aria-hidden="true">
              <CommonActionAddIcon />
            </span>
            <span>Add Employee</span>
          </button>
        )}
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
          <SearchInput
            placeholder={activeTab === 'customers' ? 'Search customers...' : 'Search employees...'}
            value={searchQuery}
            onChange={setSearchQuery}
            icon={searchInputIconUrl}
          />
          <StatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            count={activeTab === 'customers' 
              ? `(${filteredCustomers.length}/${customers.length})`
              : `(${filteredEmployees.length}/${employees.length})`
            }
          />
        </div>

        {activeTab === 'customers' ? (
          <CustomersTable 
            customers={filteredCustomers} 
            phoneIcon={phoneIconUrl}
            onView={handleViewCustomer}
            onViewCards={handleViewCards}
            onEdit={handleEditCustomer}
          />
        ) : (
          <EmployeesTable employees={filteredEmployees} onEdit={handleEditEmployee} />
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
          cards={mockCustomerCards[selectedCustomer.id] || []}
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
