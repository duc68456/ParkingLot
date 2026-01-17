import DataTable from './DataTable';
import '../styles/components/CustomersTable.css';

// Inline SVG icons for consistent rendering
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

export default function CustomersTable({ customers, phoneIcon, onView, onViewCards, onEdit, onDelete, currentPage = 1, totalPages = 1, onPageChange, totalCustomers }) {
  const headers = ['ID', 'Customer', 'Contact', 'Status', 'Registered', 'Actions'];

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

  const handleView = (customer) => {
    if (onView) {
      onView(customer);
    } else {
      console.log('View customer:', customer);
    }
  };

  const handleEdit = (customer) => {
    if (onEdit) {
      onEdit(customer);
    } else {
      console.log('Edit customer:', customer);
    }
  };

  const handleManageCards = (customer) => {
    if (onViewCards) {
      onViewCards(customer);
    } else {
      console.log('Manage cards for:', customer);
    }
  };

  const handleDelete = (customer) => {
    if (onDelete) {
      onDelete(customer);
    } else {
      console.log('Delete customer:', customer);
    }
  };

  const rows = customers.map(customer => {
    const person = customer?.person
    const name = customer?.name || person?.FullName || ''
    const email = customer?.email || ''
    const phone = customer?.phone || person?.Phone || ''
    const initials = customer?.initials || (name
      ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase())
        .join('')
      : '')

    return {
      id: customer.id,
      customer: (
        <div className="customer-cell">
          <div className="customer-avatar blue">{initials}</div>
          <div className="customer-info">
            <div className="customer-name">{name}</div>
            <div className="customer-email">{email}</div>
          </div>
        </div>
      ),
      contact: (
        <div className="contact-cell">
          <img src={phoneIcon} alt="" className="phone-icon" />
          <span>{phone}</span>
        </div>
      ),
      status: (
        <span className={getStatusBadgeClass(customer.status)}>{customer.status}</span>
      ),
      registered: customer.registered,
      actions: (
        <div className="table-actions">
          <button className="action-btn action-btn--card" onClick={() => handleManageCards(customer)} title="View Cards">
            <CardIcon />
          </button>
          <button className="action-btn action-btn--view" onClick={() => handleView(customer)} title="View">
            <ViewIcon />
          </button>
          <button className="action-btn action-btn--edit" onClick={() => handleEdit(customer)} title="Edit">
            <EditIcon />
          </button>
          <button className="action-btn action-btn--delete" onClick={() => handleDelete(customer)} title="Delete">
            <DeleteIcon />
          </button>
        </div>
      )
    }
  });

  return (
    <DataTable
      headers={headers}
      columnKeys={['id', 'customer', 'contact', 'status', 'registered', 'actions']}
      rows={rows}
      total={totalCustomers || customers.length}
      itemName="results"
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
    />
  );
}