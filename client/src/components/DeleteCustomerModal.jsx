import { useEffect } from 'react';
import '../styles/components/DeleteCustomerModal.css';
import warningIcon from '../assets/icons/dashboard/alert-warning.svg';

export default function DeleteCustomerModal({ customer, onClose, onConfirm }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const customerName = customer?.name || 'this customer';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="delete-customer-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-customer-modal">
        <button className="delete-customer-modal-close" type="button" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="delete-customer-modal-icon">
          <img src={warningIcon} alt="" />
        </div>

        <div className="delete-customer-modal-title">Delete Customer</div>
        <div className="delete-customer-modal-subtitle">
          Are you sure you want to delete this customer? This will mark them as inactive.
        </div>

        <div className="delete-customer-modal-item">
          <span className="delete-customer-modal-item-label">Item:</span>{' '}
          <span className="delete-customer-modal-item-value">{customerName}</span>
        </div>

        <div className="delete-customer-modal-footnote">This action cannot be undone.</div>

        <div className="delete-customer-modal-actions">
          <button className="delete-customer-modal-btn cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="delete-customer-modal-btn delete"
            type="button"
            onClick={() => onConfirm?.(customer)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
