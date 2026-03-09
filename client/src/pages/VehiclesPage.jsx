import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthz } from '../contexts/AuthzContext';
import { canEditModule } from '../utils/permissions';
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
import DeleteVehicleModal from '../components/DeleteVehicleModal';
import AddVehicleModal from '../components/AddVehicleModal';
import AddVehicleTypeModal from '../components/AddVehicleTypeModal';
import '../styles/pages/VehiclesPage.css';
import { getApiBaseUrl } from '../utils/apiBase'

import searchIcon from '../assets/icons/common/actions/search.svg';

const API_BASE_URL = getApiBaseUrl()

// Vehicles are fetched from the backend.

// Start empty; we'll fetch from the backend.
const initialVehicleTypes = [];

export default function VehiclesPage() {
  const { authHeaders } = useAuth();
  const { hasPermission } = useAuthz();
  const canEdit = canEditModule(hasPermission, 'VEHICLES');
  const [activeTab, setActiveTab] = useState('vehicles');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  // This is the variable you want: vehicleTypes
  const [vehicleTypes, setVehicleTypes] = useState(initialVehicleTypes);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [isEditTypeModalOpen, setIsEditTypeModalOpen] = useState(false);
  const [isAddTypeModalOpen, setIsAddTypeModalOpen] = useState(false);

  // View-only UX: prevent opening mutation modals if user doesn't have FULL permission.
  const openIfCanEdit = (setter) => (value) => {
    if (!canEdit) return;
    setter(value);
  };

  const normalizeVehicleTypeName = (t) => (t?.name ?? t?.Name ?? '').toString().trim();

  const normalizeVehicle = (v) => {
    const vehicleTypeName =
      v?.vehicleType?.Name ??
      v?.vehicleType?.name ??
      v?.VehicleType?.Name ??
      v?.VehicleType?.name;

    return {
      // For React keys / UI selection
      id: v?.id ?? v?._id ?? v?.VehicleID ?? v?.VehicleId,
      // Keep DB id too (some modals may pass this back)
      _id: v?._id ?? v?.id,
      VehicleID: v?.VehicleID ?? v?.VehicleId,
      licensePlate: v?.PlateNumber ?? v?.plateNumber ?? '',
      type:
        (vehicleTypeName ?? v?.VehicleTypeID ?? v?.vehicleTypeId ?? '').toString(),
      VehicleTypeID:
        v?.VehicleTypeID ?? v?.vehicleTypeId ?? v?.VehicleTypeId ?? v?.vehicleTypeID,
      color: v?.Color ?? v?.color ?? '',
      status:
        (v?.Status ?? v?.status ?? ((v?.IsActive ?? true) ? 'ACTIVE' : 'BLOCKED'))
          .toString()
          .toUpperCase() === 'ACTIVE'
          ? 'Active'
          : 'Inactive',
      IsActive: v?.IsActive,
      ownerId: v?.ownerId,
      ownerName: v?.ownerName,
      ownerType: v?.ownerType,
      ownerPhone: v?.ownerPhone
    };
  };

  const resolveVehicleTypeIdFromLabel = (label) => {
    if (!label) return null;
    const trimmed = label.toString().trim();
    if (!trimmed) return null;

    // If it's already a VehicleTypeID like VTP0001, keep it.
    if (/^VTP\d+/i.test(trimmed)) return trimmed;

    const match = vehicleTypes.find((t) => normalizeVehicleTypeName(t) === trimmed);
    return match?.VehicleTypeID || null;
  };

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicle-types`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch vehicle types (${res.status})`);
        }

        const json = await res.json();
        // Backend shape (from server/controllers/vehicleTypes.js):
        // { success: true, data: { vehicleTypes: [...] } }
        const list = Array.isArray(json?.data?.vehicleTypes)
          ? json.data.vehicleTypes
          : Array.isArray(json?.data)
            ? json.data
            : [];

        // Normalize to UI-friendly fields expected by components:
        // - { id, name, status }
        setVehicleTypes(
          list.map((t) => ({
            // React key: prefer Mongo `id` if present
            id: t.id ?? t._id ?? t.VehicleTypeID,
            // Display ID in table
            VehicleTypeID: t.VehicleTypeID ?? t.vehicleTypeId ?? t.VehicleTypeId,
            name: t.name ?? t.Name,
            status: (t.IsActive ?? true) ? 'Active' : 'Inactive',
            capacity: t.capacity ?? 0,
            IsActive: t.IsActive
          }))
        );
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch vehicle types error:', err);
          setVehicleTypes([]);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicles?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch vehicles (${res.status})`);
        }

        const json = await res.json();
        // Backend shape (from server/controllers/vehicles.js):
        // { success: true, data: { items: [...] } }
        const list = Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
            ? json.data
            : [];

        setVehicles(list.map(normalizeVehicle));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch vehicles error:', err);
          setVehicles([]);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  const tabs = [
    {
      id: 'vehicles',
      label: 'Vehicles',
      count: vehicles.length
    },
    {
      id: 'vehicleTypes',
      label: 'Vehicle Types',
      count: vehicleTypes.length
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
    if (!canEdit) return;
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleDeleteVehicle = (vehicle) => {
    if (!canEdit) return;
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };

  const handleAddVehicle = () => {
    if (!canEdit) return;
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleSaveNewVehicle = (newVehicle) => {
    (async () => {
      try {
        const VehicleTypeID = resolveVehicleTypeIdFromLabel(newVehicle?.type);
        if (!VehicleTypeID) {
          throw new Error('Please select a valid vehicle type');
        }

        const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            PlateNumber: newVehicle?.licensePlate,
            VehicleTypeID,
            Color: newVehicle?.color,
            // Server defaults to ACTIVE; allow explicit if UI provided it
            Status:
              newVehicle?.status === 'Inactive' || newVehicle?.status === 'BLOCKED'
                ? 'BLOCKED'
                : 'ACTIVE'
          })
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Create failed (${res.status})`;
          throw new Error(msg);
        }

        const created = json?.data;
        if (created) {
          setVehicles((prev) => [normalizeVehicle(created), ...prev]);
        }

        setIsAddModalOpen(false);
      } catch (error) {
        console.error('Create vehicle error:', error);
        window.alert(error?.message || 'Failed to create vehicle');
      }
    })();
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedVehicle(null);
  };

  const handleSaveVehicle = (updatedVehicle) => {
    (async () => {
      if (!updatedVehicle?.id && !updatedVehicle?._id) return;
      const id = updatedVehicle?._id ?? updatedVehicle?.id;

      try {
        const VehicleTypeID = resolveVehicleTypeIdFromLabel(updatedVehicle?.type);

        const res = await fetch(`${API_BASE_URL}/api/vehicles/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({
            PlateNumber: updatedVehicle?.licensePlate,
            Color: updatedVehicle?.color,
            // If we can resolve vehicle type, send it; otherwise leave it unchanged.
            ...(VehicleTypeID ? { VehicleTypeID } : {}),
            // Keep status consistent; Edit modal currently doesn't change it.
            ...(updatedVehicle?.status
              ? {
                Status:
                  updatedVehicle.status === 'Inactive' || updatedVehicle.status === 'BLOCKED'
                    ? 'BLOCKED'
                    : 'ACTIVE'
              }
              : {})
          })
        });

        const json = await res.json();

        if (!res.ok) {
          const msg = json?.error?.message || `Update failed (${res.status})`;
          throw new Error(msg);
        }

        const saved = json?.data;
        const normalized = saved ? normalizeVehicle(saved) : updatedVehicle;

        setVehicles((prev) => prev.map((v) => (v.id === normalized.id ? normalized : v)));
        setIsEditModalOpen(false);
        setSelectedVehicle(null);
      } catch (error) {
        console.error('Update vehicle error:', error);
        window.alert(error?.message || 'Failed to update vehicle');
      }
    })();
  };

  const handleConfirmDeleteVehicle = (vehicleToDelete, newStatus) => {
    (async () => {
      if (!vehicleToDelete) return;
      const id = vehicleToDelete?._id ?? vehicleToDelete?.id;
      if (!id) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ status: newStatus || 'Inactive' }),
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = json?.error?.message || `Delete failed (${res.status})`;
          throw new Error(msg);
        }

        // Backend updates status; reflect in UI
        const isActive = newStatus === 'Active';
        const statusToSet = newStatus || 'Inactive';
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicleToDelete.id
              ? { ...v, status: statusToSet, IsActive: isActive }
              : v
          )
        );

        handleCloseDeleteModal();
      } catch (error) {
        console.error('Delete vehicle error:', error);
        window.alert(error?.message || 'Failed to delete vehicle');
      }
    })();
  };

  const handleEditType = (type) => {
    setSelectedVehicleType(type);
    setIsEditTypeModalOpen(true);
  };

  const handleCloseEditTypeModal = () => {
    setIsEditTypeModalOpen(false);
    setSelectedVehicleType(null);
  };

  const handleSaveVehicleType = async (updatedType) => {
    if (!updatedType?.id) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicle-types/${updatedType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          // Backend expects Name / IsActive
          Name: updatedType?.name ?? updatedType?.Name,
          // Keep current IsActive if we have it; otherwise don't overwrite
          IsActive:
            updatedType?.IsActive !== undefined
              ? updatedType.IsActive
              : updatedType?.status
                ? updatedType.status === 'Active'
                : undefined
        })
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error?.message || `Update failed (${res.status})`;
        throw new Error(msg);
      }

      const saved = json?.data;
      const normalized = saved
        ? {
          id: saved.id ?? saved._id ?? saved.VehicleTypeID,
          VehicleTypeID: saved.VehicleTypeID ?? updatedType.VehicleTypeID,
          name: saved.Name ?? saved.name,
          status: (saved.IsActive ?? true) ? 'Active' : 'Inactive',
          capacity: saved.capacity ?? updatedType.capacity ?? 0,
          // keep raw IsActive if we ever need it
          IsActive: saved.IsActive
        }
        : updatedType;

      setVehicleTypes((prevTypes) =>
        prevTypes.map((t) => (t.id === updatedType.id ? normalized : t))
      );
    } catch (error) {
      console.error('Update vehicle type error:', error);
      window.alert(error?.message || 'Failed to update vehicle type');
    }
  };

  const handleDeleteType = async (type) => {
    if (!type?.id) return;

    const displayName = type?.name || type?.Name || type?.VehicleTypeID || 'this vehicle type';
    const ok = window.confirm(
      `Delete ${displayName}?\n\nNote: The backend only allows deleting INACTIVE vehicle types.`
    );
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicle-types/${type.id}`, {
        method: 'DELETE',
        headers: { ...authHeaders }
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error?.message || `Delete failed (${res.status})`;
        throw new Error(msg);
      }

      setVehicleTypes((prev) => prev.filter((t) => t.id !== type.id));
    } catch (error) {
      console.error('Delete vehicle type error:', error);
      window.alert(
        error?.message ||
        'Failed to delete vehicle type. Tip: you can only delete types that are inactive.'
      );
    }
  };

  const handleAddType = () => {
    setIsAddTypeModalOpen(true);
  };

  const handleCloseAddTypeModal = () => {
    setIsAddTypeModalOpen(false);
  };

  const handleSaveNewVehicleType = async (newType) => {
    // const existingIds = new Set(vehicleTypes.map((t) => t.id));
    // let n = vehicleTypes.length + 1;
    // let nextId = `VT${String(n).padStart(3, '0')}`;
    // while (existingIds.has(nextId)) {
    //   n += 1;
    //   nextId = `VT${String(n).padStart(3, '0')}`;
    // }

    // setVehicleTypes((prev) => [
    //   {
    //     id: nextId,
    //     name: newType.name,
    //     // not shown in the Vehicle Types table, but kept for consistency with mock shape
    //     capacity: 0,
    //     status: 'Active'
    //   },
    //   ...prev
    // ]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicle-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        // API expects flat fields: { Name, IsActive }
        body: JSON.stringify({
          Name: newType?.name ?? newType?.Name,
          IsActive: newType?.IsActive ?? true
        })
      });

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error?.message || `Create failed (${res.status})`;
        throw new Error(msg);
      }

      const created = json?.data;
      if (created) {
        const normalized = {
          id: created.id ?? created._id ?? created.VehicleTypeID,
          VehicleTypeID: created.VehicleTypeID,
          name: created.Name ?? created.name,
          status: (created.IsActive ?? true) ? 'Active' : 'Inactive',
          capacity: created.capacity ?? 0
        };
        setVehicleTypes((prev) => [normalized, ...prev]);
      }

      setIsAddTypeModalOpen(false);
    } catch (error) {
      console.error('Create vehicle type error:', error);
      window.alert(error?.message || 'Failed to create vehicle type');
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesType =
      typeFilter === 'All Types' ||
      (vehicle.type || '').toString().toLowerCase() === typeFilter.toLowerCase();
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
            <div className="vehicles-controls-top">
              <SearchInput
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={setSearchQuery}
                icon={searchIcon}
              />
              {canEdit && (
                <button className="add-vehicle-btn" onClick={handleAddVehicle} type="button">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 5V15M5 10H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add Vehicle
                </button>
              )}
            </div>
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
            onDeleteVehicle={handleDeleteVehicle}
          />
        </div>
      )}

      {activeTab === 'vehicleTypes' && (
        <div className="vehicle-types-content">
          <div className="add-type-button-wrapper">
            {canEdit && (
              <button className="add-type-btn" onClick={handleAddType}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 5V15M5 10H15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add Type
              </button>
            )}
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

      {canEdit && isEditModalOpen && selectedVehicle && (
        <EditVehicleModal
          vehicle={selectedVehicle}
          onClose={handleCloseEditModal}
          onSave={handleSaveVehicle}
        />
      )}

      {canEdit && isDeleteModalOpen && selectedVehicle && (
        <DeleteVehicleModal
          vehicle={selectedVehicle}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeleteVehicle}
        />
      )}

      {canEdit && isEditTypeModalOpen && selectedVehicleType && (
        <EditVehicleTypeModal
          vehicleType={selectedVehicleType}
          onClose={handleCloseEditTypeModal}
          onSave={handleSaveVehicleType}
        />
      )}

      {canEdit && isAddTypeModalOpen && (
        <AddVehicleTypeModal
          onClose={handleCloseAddTypeModal}
          onSave={handleSaveNewVehicleType}
        />
      )}

      {canEdit && isAddModalOpen && (
        <AddVehicleModal
          onClose={handleCloseAddModal}
          onSave={handleSaveNewVehicle}
          vehicleTypes={vehicleTypes}
        />
      )}
    </div>
  );
}
