import { useState, useEffect } from 'react';
import '../styles/components/DeleteEmployeeModal.css';

export default function DeleteEmployeeModal({ employee, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Inactive');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, isDeleting]);

  if (!employee) return null;

  const employeeName = employee?.name || employee?.FullName || employee?.fullName || 'this employee';
  const employeeId = employee?.id || employee?.ID || '—';
  const currentStatus = employee?.status || 'Active';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose?.();
    }
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm?.(employee, selectedStatus);
      onClose?.();
    } catch (error) {
      console.error('Update employee status error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-employee-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-employee-modal" role="dialog" aria-modal="true" aria-labelledby="delete-employee-title">
        <div className="delete-employee-modal__header">
          <div className="delete-employee-modal__title" id="delete-employee-title">
            Deactivate Employee
          </div>
          <button
            className="delete-employee-modal__close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="delete-employee-modal__body">
          <div className="delete-employee-modal__message">
            Update status for <strong>{employeeName}</strong>
          </div>

          <div className="delete-employee-modal__item">
            <span className="delete-employee-modal__item-label">ID:</span>
            <span className="delete-employee-modal__item-value">{employeeId}</span>
          </div>

          <div className="delete-employee-modal__item">
            <span className="delete-employee-modal__item-label">Current Status:</span>
            <span className="delete-employee-modal__item-value">{currentStatus}</span>
          </div>

          <div className="delete-employee-modal__status-selection">
            <label className="delete-employee-modal__status-label">
              Select New Status:
            </label>
            <div className="delete-employee-modal__status-options">
              <label className="delete-employee-modal__radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={selectedStatus === 'Active'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-employee-modal__radio-text">Active</span>
              </label>
              <label className="delete-employee-modal__radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={selectedStatus === 'Inactive'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-employee-modal__radio-text">Inactive</span>
              </label>
            </div>
          </div>
        </div>

        <div className="delete-employee-modal__footer">
          <button
            className="delete-employee-modal__cancel"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-employee-modal__confirm"
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
