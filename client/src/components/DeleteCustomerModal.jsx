import { useEffect, useState } from 'react';
import '../styles/components/DeleteCustomerModal.css';

export default function DeleteCustomerModal({ customer, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Inactive');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, isDeleting]);

  const customerName = customer?.name || 'this customer';
  const customerId = customer?.id || customer?.ID || '—';
  const currentStatus = customer?.status || 'Active';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) onClose?.();
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm?.(customer, selectedStatus);
      onClose?.();
    } catch (error) {
      console.error('Update customer status error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-customer-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-customer-modal" role="dialog" aria-modal="true" aria-labelledby="delete-customer-title">
        <div className="delete-customer-modal-header">
          <div className="delete-customer-modal-title" id="delete-customer-title">
            Deactivate Customer
          </div>
          <button
            className="delete-customer-modal-close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="delete-customer-modal-body">
          <div className="delete-customer-modal-subtitle">
            Update status for <strong>{customerName}</strong>
          </div>

          <div className="delete-customer-modal-item">
            <span className="delete-customer-modal-item-label">ID:</span>
            <span className="delete-customer-modal-item-value">{customerId}</span>
          </div>

          <div className="delete-customer-modal-item">
            <span className="delete-customer-modal-item-label">Current Status:</span>
            <span className="delete-customer-modal-item-value">{currentStatus}</span>
          </div>

          <div className="delete-customer-modal-status-selection">
            <label className="delete-customer-modal-status-label">
              Select New Status:
            </label>
            <div className="delete-customer-modal-status-options">
              <label className="delete-customer-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={selectedStatus === 'Active'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-customer-modal-radio-text">Active</span>
              </label>
              <label className="delete-customer-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={selectedStatus === 'Inactive'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-customer-modal-radio-text">Inactive</span>
              </label>
            </div>
          </div>
        </div>

        <div className="delete-customer-modal-actions">
          <button
            className="delete-customer-modal-btn cancel"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-customer-modal-btn delete"
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
