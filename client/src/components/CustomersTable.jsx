import DataTable from './DataTable';
import '../styles/components/CustomersTable.css';
import eyeIcon from '../assets/icons/common/actions/view.svg';
import editIcon from '../assets/icons/common/actions/edit.svg';
import cardIcon from '../assets/icons/cards/general/cards-list.svg';
import deleteIcon from '../assets/icons/common/actions/trash.svg';

export default function CustomersTable({ customers, phoneIcon, onView, onViewCards, onEdit, onDelete }) {
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
          <button className="action-btn" onClick={() => handleManageCards(customer)} title="View Cards">
            <img src={cardIcon} alt="Cards" />
          </button>
          <button className="action-btn" onClick={() => handleView(customer)} title="View">
            <img src={eyeIcon} alt="View" />
          </button>
          <button className="action-btn" onClick={() => handleEdit(customer)} title="Edit">
            <img src={editIcon} alt="Edit" />
          </button>
          <button className="action-btn" onClick={() => handleDelete(customer)} title="Delete">
            <img src={deleteIcon} alt="Delete" />
          </button>
        </div>
      )
    }
  });

  return (
    <DataTable
      headers={headers}
      rows={rows}
      total={customers.length}
      itemName="results"
    />
  );
}
