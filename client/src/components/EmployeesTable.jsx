import DataTable from './DataTable';
import AssignCardModal from './AssignCardModal';
import ViewCardsModal from './ViewCardsModal';
import ViewEmployeeModal from './ViewEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import EmployeeAccountModal from './EmployeeAccountModal';
import { useAuthz } from '../contexts/AuthzContext';
import DeleteEmployeeModal from './DeleteEmployeeModal';
import '../styles/components/EmployeesTable.css';

import { useMemo, useState } from 'react';

// Inline SVG icons for better rendering
const AccountIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 8C9.65685 8 11 6.65685 11 5C11 3.34315 9.65685 2 8 2C6.34315 2 5 3.34315 5 5C5 6.65685 6.34315 8 8 8Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M13 14C13 11.7909 10.7614 10 8 10C5.23858 10 3 11.7909 3 14" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="12" height="10" rx="2" stroke="#314158" strokeWidth="1.5" fill="none" />
    <path d="M2 6H14" stroke="#314158" strokeWidth="1.5" />
    <circle cx="5" cy="9.5" r="0.75" fill="#314158" />
    <circle cx="7.5" cy="9.5" r="0.75" fill="#314158" />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="#314158" strokeWidth="1.5" fill="none" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.33334 4V2.66667C5.33334 2.48986 5.40358 2.32029 5.52861 2.19526C5.65363 2.07024 5.8232 2 6.00001 2H10C10.1768 2 10.3464 2.07024 10.4714 2.19526C10.5964 2.32029 10.6667 2.48986 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.5101 12.5964 13.6797 12.4714 13.8047C12.3464 13.9298 12.1768 14 12 14H4.00001C3.8232 14 3.65363 13.9298 3.52861 13.8047C3.40358 13.6797 3.33334 13.5101 3.33334 13.3333V4H12.6667Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.66666 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.33334 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function EmployeesTable({ employees, onEdit, onDelete, onViewCards, currentPage = 1, totalPages = 1, onPageChange, totalEmployees }) {
  const { hasPermission } = useAuthz();
  const canAccessHub = hasPermission('PEOPLE.ACCESS_MANAGEMENT_HUB');

  const headers = ['ID', 'Employee', 'Role', 'Status', 'Hired Date', 'Actions'];

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'active':
        return 'status-pill status-pill--active'
      case 'inactive':
        return 'status-pill status-pill--inactive'
      default:
        return 'status-pill'
    }
  }

  const [showViewCardsModal, setShowViewCardsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showViewEmployeeModal, setShowViewEmployeeModal] = useState(false);

  const [showAssignCardModal, setShowAssignCardModal] = useState(false);
  const [assignCard, setAssignCard] = useState(null);

  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);

  const [showEmployeeAccountModal, setShowEmployeeAccountModal] = useState(false);

  const [showDeleteEmployeeModal, setShowDeleteEmployeeModal] = useState(false);

  // Cards are loaded by PeoplePage and passed into ViewCardsModal via the `cards` prop.
  // Keep a safe fallback to an empty list.
  const employeeCards = useMemo(() => {
    if (!selectedEmployee) return [];
    return Array.isArray(selectedEmployee?.cards) ? selectedEmployee.cards : [];
  }, [selectedEmployee]);

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewEmployeeModal(true);
  };

  const handleOpenEmployeeAccount = (employee) => {
    if (!canAccessHub) return;
    setSelectedEmployee(employee);
    setShowEmployeeAccountModal(true);
  };

  const handleViewCards = (employee) => {
    // Prefer parent-provided handler that fetches real cards.
    if (onViewCards) {
      onViewCards(employee)
      return
    }

    setSelectedEmployee(employee);
    setShowViewCardsModal(true);
  };

  const handleCloseViewEmployeeModal = () => {
    setShowViewEmployeeModal(false);
    setSelectedEmployee(null);
  };

  const handleCloseEmployeeAccountModal = () => {
    setShowEmployeeAccountModal(false);
    setSelectedEmployee(null);
  };

  const handleCloseViewCardsModal = () => {
    setShowViewCardsModal(false);
    setSelectedEmployee(null);
  };

  const handleOpenAssignCard = (employee) => {
    // Temporary placeholder card data until backend/API is wired.
    setAssignCard({
      id: `employee-${employee.id}`,
      uid: '—',
      category: 'Employee Card'
    });
    setSelectedEmployee(employee);
    setShowAssignCardModal(true);
  };

  const handleCloseAssignCardModal = () => {
    setShowAssignCardModal(false);
    setAssignCard(null);
  };

  const handleAssignCard = (payload) => {
    // TODO: Wire to backend/API. For now just log for visibility.
    console.log('Assign card:', payload, 'to employee:', selectedEmployee);
    handleCloseAssignCardModal();
  };

  const handleEdit = (employee) => {
    // If parent owns the edit flow, delegate.
    if (onEdit) {
      onEdit(employee)
      return
    }

    // Otherwise, fall back to local modal.
    setSelectedEmployee(employee)
    setShowEditEmployeeModal(true)
  };

  const handleCloseEditEmployeeModal = () => {
    setShowEditEmployeeModal(false);
    setSelectedEmployee(null);
  };

  const handleSaveEmployee = (updatedEmployee) => {
    // Parent (PeoplePage) owns the employees list; for now we just log.
    // We'll wire a real state update in PeoplePage by passing a callback.
    console.log('Update employee:', updatedEmployee);
  };

  const handleDelete = (employee) => {
    setSelectedEmployee(employee);
    setShowDeleteEmployeeModal(true);
  };

  const handleCloseDeleteEmployeeModal = () => {
    setShowDeleteEmployeeModal(false);
    setSelectedEmployee(null);
  };

  const handleConfirmDelete = async (employee, newStatus) => {
    if (onDelete) {
      await onDelete(employee, newStatus);
    } else {
      console.log('Update employee status:', employee, newStatus);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'ADMIN': 'admin',
      'MANAGER': 'manager'
    };
    return colors[role] || 'staff';
  };

  const rows = employees.map(employee => ({
    id: employee.id,
    employee: (
      <div className="employee-cell">
        <div className="employee-avatar purple">{employee.initials}</div>
        <div className="employee-info">
          <div className="employee-name">{employee.name}</div>
          <div className="employee-role-text">{employee.role}</div>
        </div>
      </div>
    ),
    role: (
      <span className={`role-badge ${getRoleColor(employee.role)}`}>
        {employee.role}
      </span>
    ),
    status: (
      <span className={getStatusBadgeClass(employee.status)}>{employee.status}</span>
    ),
    hiredDate: employee.hiredDate,
    actions: (
      <div className="table-actions">
        {canAccessHub && (
          <button className="action-btn action-btn--account" onClick={() => handleOpenEmployeeAccount(employee)} title="Account">
            <AccountIcon />
          </button>
        )}
        <button className="action-btn action-btn--card" onClick={() => handleViewCards(employee)} title="View Cards">
          <CardIcon />
        </button>
        <button className="action-btn action-btn--view" onClick={() => handleViewEmployee(employee)} title="View">
          <ViewIcon />
        </button>
        <button className="action-btn action-btn--edit" onClick={() => handleEdit(employee)} title="Edit">
          <EditIcon />
        </button>
        <button className="action-btn action-btn--delete" onClick={() => handleDelete(employee)} title="Delete">
          <DeleteIcon />
        </button>
      </div>
    )
  }));

  return (
    <>
      <DataTable
        headers={headers}
        columnKeys={['id', 'employee', 'role', 'status', 'hiredDate', 'actions']}
        rows={rows}
        total={totalEmployees || employees.length}
        itemName="results"
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

      {showViewEmployeeModal && (
        <ViewEmployeeModal employee={selectedEmployee} onClose={handleCloseViewEmployeeModal} />
      )}

      {showEmployeeAccountModal && (
        <EmployeeAccountModal employee={selectedEmployee} onClose={handleCloseEmployeeAccountModal} />
      )}

      {showViewCardsModal && (
        <ViewCardsModal
          customer={selectedEmployee}
          cards={employeeCards}
          onClose={handleCloseViewCardsModal}
        />
      )}

      {showAssignCardModal && assignCard && (
        <AssignCardModal
          card={assignCard}
          onClose={handleCloseAssignCardModal}
          onAssign={handleAssignCard}
          defaultAssignType="employee"
          defaultPersonId={selectedEmployee?.id}
        />
      )}

      {showDeleteEmployeeModal && selectedEmployee && (
        <DeleteEmployeeModal
          employee={selectedEmployee}
          onClose={handleCloseDeleteEmployeeModal}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showEditEmployeeModal && selectedEmployee && (
        <EditEmployeeModal
          employee={selectedEmployee}
          onClose={handleCloseEditEmployeeModal}
          onSave={handleSaveEmployee}
        />
      )}
    </>
  );
}
