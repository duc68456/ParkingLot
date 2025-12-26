import DataTable from './DataTable';
import '../styles/components/EmployeesTable.css';

const eyeIcon = "http://localhost:3845/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg";
const editIcon = "http://localhost:3845/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg";
const deleteIcon = "http://localhost:3845/assets/1fdb1f29273b223332a28061a714a4354ee0c9ae.svg";

export default function EmployeesTable({ employees }) {
  const headers = ['ID', 'Employee', 'Role', 'Status', 'Hired Date', 'Actions'];

  const handleView = (employee) => {
    console.log('View employee:', employee);
  };

  const handleEdit = (employee) => {
    console.log('Edit employee:', employee);
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
        <button className="action-btn" onClick={() => handleView(employee)} title="View">
          <img src={eyeIcon} alt="View" />
        </button>
        <button className="action-btn" onClick={() => handleEdit(employee)} title="Edit">
          <img src={editIcon} alt="Edit" />
        </button>
        <button className="action-btn" onClick={() => handleDelete(employee)} title="Delete">
          <img src={deleteIcon} alt="Delete" />
        </button>
      </div>
    )
  }));

  return (
    <DataTable 
      headers={headers} 
      rows={rows} 
      total={employees.length}
      itemName="results"
    />
  );
}
