import DataTable from './DataTable';
import AssignCardModal from './AssignCardModal';
import ViewCardsModal from './ViewCardsModal';
import ViewEmployeeModal from './ViewEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import '../styles/components/EmployeesTable.css';

import { useMemo, useState } from 'react';

const eyeIcon = "http://localhost:3845/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg";
const editIcon = "http://localhost:3845/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg";
const deleteIcon = "http://localhost:3845/assets/1fdb1f29273b223332a28061a714a4354ee0c9ae.svg";

export default function EmployeesTable({ employees, onEdit }) {
  const headers = ['ID', 'Employee', 'Role', 'Status', 'Hired Date', 'Actions'];

  const [showViewCardsModal, setShowViewCardsModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [showViewEmployeeModal, setShowViewEmployeeModal] = useState(false);

  const [showAssignCardModal, setShowAssignCardModal] = useState(false);
  const [assignCard, setAssignCard] = useState(null);

  const [showEditEmployeeModal, setShowEditEmployeeModal] = useState(false);

  // Temporary mock cards until backend/API is wired.
  const employeeCards = useMemo(() => {
    if (!selectedEmployee) return [];
    return selectedEmployee.cards || [];
  }, [selectedEmployee]);

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewEmployeeModal(true);
  };

  const handleViewCards = (employee) => {
    setSelectedEmployee(employee);
    setShowViewCardsModal(true);
  };

  const handleCloseViewEmployeeModal = () => {
    setShowViewEmployeeModal(false);
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
    if (onEdit) {
      onEdit(employee);
      return;
    }

    setSelectedEmployee(employee);
    setShowEditEmployeeModal(true);
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
    console.log('Delete employee:', employee);
  };

  const getRoleColor = (role) => {
    const colors = {
      'ADMIN': 'admin',
      'MANAGER': 'manager',
      'GATE_STAFF': 'staff'
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
      <span className={`status-badge ${employee.status.toLowerCase()}`}>
        {employee.status}
      </span>
    ),
    hiredDate: employee.hiredDate,
    actions: (
      <div className="table-actions">
        <button className="action-btn action-btn--card" onClick={() => handleViewCards(employee)} title="View Cards">
          <img src="/src/assets/icons/cards.svg" alt="View Cards" />
        </button>
        <button className="action-btn action-btn--view" onClick={() => handleViewEmployee(employee)} title="View">
          <img src={eyeIcon} alt="View" />
        </button>
        <button className="action-btn action-btn--edit" onClick={() => handleEdit(employee)} title="Edit">
          <img src={editIcon} alt="Edit" />
        </button>
        <button className="action-btn action-btn--delete" onClick={() => handleDelete(employee)} title="Delete">
          <img src={deleteIcon} alt="Delete" />
        </button>
      </div>
    )
  }));

  return (
    <>
      <DataTable 
        headers={headers} 
        rows={rows} 
        total={employees.length}
        itemName="results"
      />

      {showViewEmployeeModal && (
        <ViewEmployeeModal employee={selectedEmployee} onClose={handleCloseViewEmployeeModal} />
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
