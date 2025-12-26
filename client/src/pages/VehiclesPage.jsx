import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import SearchInput from '../components/SearchInput';
import VehicleTypeFilter from '../components/VehicleTypeFilter';
import StatusFilter from '../components/StatusFilter';
import VehiclesTable from '../components/VehiclesTable';
import VehicleTypesTable from '../components/VehicleTypesTable';
import TablePagination from '../components/TablePagination';
import ViewVehicleModal from '../components/ViewVehicleModal';
import EditVehicleModal from '../components/EditVehicleModal';
import EditVehicleTypeModal from '../components/EditVehicleTypeModal';
import '../styles/pages/VehiclesPage.css';

const searchIcon = "http://localhost:3845/assets/48c5ec2984942afc7a9f1923cb9d463027cdf83f.svg";

// Mock data
const mockVehicles = [
  {
    id: 'VEH001',
    licensePlate: 'ABC-1234',
    type: 'Car',
    status: 'Active',
    ownerName: 'John Doe',
    ownerType: 'Customer',
    ownerId: 'CUST001',
    registrationDate: '15/01/2023'
  },
  {
    id: 'VEH002',
    licensePlate: 'XYZ-5678',
    type: 'Motorcycle',
    status: 'Active',
    ownerName: 'Jane Smith',
    ownerType: 'Customer',
    ownerId: 'CUST002',
    registrationDate: '20/02/2023'
  },
  {
    id: 'VEH003',
    licensePlate: 'DEF-9012',
    type: 'Truck',
    status: 'Active',
    ownerName: 'Bob Johnson',
    ownerType: 'Customer',
    ownerId: 'CUST003',
    registrationDate: '10/03/2023'
  }
];

const mockVehicleTypes = [
  { id: 'VT001', name: 'Car', capacity: 100, status: 'Active' },
  { id: 'VT002', name: 'Motorcycle', capacity: 50, status: 'Active' },
  { id: 'VT003', name: 'Truck', capacity: 20, status: 'Active' },
  { id: 'VT004', name: 'Van', capacity: 30, status: 'Active' }
];

export default function VehiclesPage() {
  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState(mockVehicles);
  const [vehicleTypes, setVehicleTypes] = useState(mockVehicleTypes);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);

  const tabs = [
    { 
      id: 'vehicles', 
      label: 'Vehicles',
      count: mockVehicles.length 
    },
    { 
      id: 'vehicleTypes', 
      label: 'Vehicle Types',
      count: mockVehicleTypes.length 
    }
  ];

  const handleClearFilters = () => {
    setTypeFilter('All Types');
    setStatusFilter('All Status');
  };

  const handleViewVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleEditVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleSaveVehicle = (updatedVehicle) => {
    setVehicles(prevVehicles =>
      prevVehicles.map(v =>
        v.id === updatedVehicle.id ? updatedVehicle : v
      )
    );
  };

  const handleEditType = (type) => {
    setSelectedVehicleType(type);
    setIsEditTypeModalOpen(true);
  };

  const handleCloseEditTypeModal = () => {
    setIsEditTypeModalOpen(false);
    setSelectedVehicleType(null);
  };

  const handleSaveVehicleType = (updatedType) => {
    setVehicleTypes(prevTypes =>
      prevTypes.map(t =>
        t.id === updatedType.id ? updatedType : t
      )
    );
  };

  const handleDeleteType = (type) => {
    console.log('Delete type:', type);
    // TODO: Implement delete confirmation modal
  };

  const handleAddType = () => {
    console.log('Add new type');
    // TODO: Implement add type modal
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesType = typeFilter === 'All Types' || vehicle.type === typeFilter;
    const matchesStatus = statusFilter === 'All Status' || vehicle.status === statusFilter;
    const matchesSearch = vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         vehicle.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div className="vehicles-page">
      <PageHeader
        title="Manage Vehicle"
        subtitle="Manage vehicles and vehicle types"
      />

      <div className="tab-navigation-wrapper">
        <TabNavigation 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />
      </div>

      {activeTab === 'vehicles' && (
        <div className="vehicles-content">
          <div className="vehicles-controls">
            <SearchInput
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={setSearchQuery}
              icon={searchIcon}
            />
            <div className="filters-row">
              <VehicleTypeFilter
                value={typeFilter}
                onChange={setTypeFilter}
              />
              <StatusFilter
                value={statusFilter}
                onChange={setStatusFilter}
                count=""
              />
              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          </div>

          <VehiclesTable 
            vehicles={filteredVehicles}
            onViewVehicle={handleViewVehicle}
            onEditVehicle={handleEditVehicle}
          />
        </div>
      )}

      {activeTab === 'vehicleTypes' && (
        <div className="vehicle-types-content">
          <div className="add-type-button-wrapper">
            <button className="add-type-btn" onClick={handleAddType}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5V15M5 10H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Type
            </button>
          </div>
          <div className="vehicle-types-table-wrapper">
            <VehicleTypesTable
              vehicleTypes={vehicleTypes}
              onEditType={handleEditType}
              onDeleteType={handleDeleteType}
            />
            <TablePagination
              totalResults={vehicleTypes.length}
              currentPage={currentPage}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              hasMore={false}
            />
          </div>
        </div>
      )}

      {isViewModalOpen && selectedVehicle && (
        <ViewVehicleModal
          vehicle={selectedVehicle}
          onClose={handleCloseViewModal}
        />
      )}

      {isEditModalOpen && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          onClose={handleCloseEditModal}
          onSave={handleSaveVehicle}
        />
      )}

      {isEditTypeModalOpen && selectedVehicleType && (
        <EditVehicleTypeModal
          vehicleType={selectedVehicleType}
          onClose={handleCloseEditTypeModal}
          onSave={handleSaveVehicleType}
        />
      )}
    </div>
  );
}
