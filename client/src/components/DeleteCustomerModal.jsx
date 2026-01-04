import { useEffect } from 'react';
import '../styles/components/DeleteCustomerModal.css';

// Using the existing dev-server SVGs to match the Figma export style used elsewhere in this repo.
const warningIconUrl = 'http://localhost:3845/assets/6efc644be7d589ce3b3a946c4d53d23688c9e8fe.svg';
const closeIconUrl = 'http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg';

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
          <img src={closeIconUrl} alt="" />
        </button>

        <div className="delete-customer-modal-icon">
          <img src={warningIconUrl} alt="" />
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
