import DataTable from './DataTable';
import '../styles/components/CustomersTable.css';

const eyeIcon = "http://localhost:3845/assets/53e9d9d39e1a2cac7185a1002c83bcb708fdd3b2.svg";
const editIcon = "http://localhost:3845/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg";
const cardIcon = "http://localhost:3845/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg";
const deleteIcon = "http://localhost:3845/assets/1fdb1f29273b223332a28061a714a4354ee0c9ae.svg";

export default function CustomersTable({ customers, phoneIcon }) {
  const headers = ['ID', 'Customer', 'Contact', 'Status', 'Registered', 'Actions'];

  const handleView = (customer) => {
    console.log('View customer:', customer);
  };

  const handleEdit = (customer) => {
    console.log('Edit customer:', customer);
  };

  const handleManageCards = (customer) => {
    console.log('Manage cards for:', customer);
  };

  const handleDelete = (customer) => {
    console.log('Delete customer:', customer);
  };

  const rows = customers.map(customer => ({
    id: customer.id,
    customer: (
      <div className="customer-cell">
        <div className="customer-avatar blue">{customer.initials}</div>
        <div className="customer-info">
          <div className="customer-name">{customer.name}</div>
          <div className="customer-email">{customer.email}</div>
        </div>
      </div>
    ),
    contact: (
      <div className="contact-cell">
        <img src={phoneIcon} alt="" className="phone-icon" />
        <span>{customer.phone}</span>
      </div>
    ),
    status: (
      <span className={`status-badge ${customer.status.toLowerCase()}`}>
        {customer.status}
      </span>
    ),
    registered: customer.registered,
    actions: (
      <div className="table-actions">
        <button className="action-btn" onClick={() => handleView(customer)} title="View">
          <img src={eyeIcon} alt="View" />
        </button>
        <button className="action-btn" onClick={() => handleEdit(customer)} title="Edit">
          <img src={editIcon} alt="Edit" />
        </button>
        <button className="action-btn" onClick={() => handleManageCards(customer)} title="Manage Cards">
          <img src={cardIcon} alt="Cards" />
        </button>
        <button className="action-btn" onClick={() => handleDelete(customer)} title="Delete">
          <img src={deleteIcon} alt="Delete" />
        </button>
      </div>
    )
  }));

  return (
    <DataTable 
      headers={headers} 
      rows={rows} 
      total={customers.length}
      itemName="results"
    />
  );
}
