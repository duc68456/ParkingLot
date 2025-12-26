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
import '../styles/pages/PeoplePage.css';

const phoneIcon = "http://localhost:3845/assets/48c5ec2984942afc7a9f1923cb9d463027cdf83f.svg";
const searchIcon = "http://localhost:3845/assets/38e660c2c89b4d9e1fe6e4909c5ddaa96ff8b7d8.svg";
const customerIcon = "http://localhost:3845/assets/f73e3e770325ea0770695a7e8611212600652187.svg";
const employeeIcon = "http://localhost:3845/assets/d13ba3401db8728892168a5e71047a1e4cf7408b.svg";
const addIcon = "http://localhost:3845/assets/10fef702e521cd978007cbf6b09f2fa3cf287e8a.svg";

// Mock data
const mockCustomers = [
  {
    id: 'CUST001',
    name: 'John Doe',
    email: 'john.doe@email.com',
    initials: 'JD',
    phone: '+1234567890',
    status: 'Active',
    registered: '15/01/2023'
  },
  {
    id: 'CUST002',
    name: 'Jane Smith',
    email: 'jane.smith@email.com',
    initials: 'JS',
    phone: '+1234567891',
    status: 'Active',
    registered: '20/02/2023'
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

  const tabs = [
    { 
      id: 'customers', 
      label: 'Customers', 
      icon: customerIcon,
      count: mockCustomers.length 
    },
    { 
      id: 'employees', 
      label: 'Employees', 
      icon: employeeIcon,
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

  const filteredCustomers = mockCustomers.filter(customer => 
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
            <img src={addIcon} alt="" className="btn-icon" />
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
            icon={searchIcon}
          />
          <StatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            count={activeTab === 'customers' 
              ? `(${filteredCustomers.length}/${mockCustomers.length})`
              : `(${filteredEmployees.length}/${employees.length})`
            }
          />
        </div>

        {activeTab === 'customers' ? (
          <CustomersTable 
            customers={filteredCustomers} 
            phoneIcon={phoneIcon}
            onViewCustomer={handleViewCustomer}
            onViewCards={handleViewCards}
          />
        ) : (
          <EmployeesTable employees={filteredEmployees} />
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
          vehicles={[{ plateNumber: 'ABC-1234', vehicleType: 'Car', registeredDate: '15/01/2023' }]}
          onClose={handleCloseCustomerModal}
        />
      )}
    </div>
  );
}
