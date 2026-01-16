import { useEffect, useState } from 'react';
import '../styles/components/DeleteVehicleModal.css';

export default function DeleteVehicleModal({ vehicle, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Inactive');

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, isDeleting]);

  const plateNumber = vehicle?.licensePlate || vehicle?.plateNumber || vehicle?.id || 'this vehicle';
  const vehicleId = vehicle?.VehicleID || vehicle?.id || '—';
  const currentStatus = vehicle?.IsActive !== false ? 'Active' : 'Inactive';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) onClose?.();
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm?.(vehicle, selectedStatus);
      onClose?.();
    } catch (error) {
      console.error('Update vehicle status error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="delete-vehicle-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-vehicle-modal" role="dialog" aria-modal="true" aria-labelledby="delete-vehicle-title">
        <div className="delete-vehicle-modal-header">
          <div className="delete-vehicle-modal-title" id="delete-vehicle-title">
            Deactivate Vehicle
          </div>
          <button
            className="delete-vehicle-modal-close"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="delete-vehicle-modal-body">
          <div className="delete-vehicle-modal-subtitle">
            Update status for <strong>{plateNumber}</strong>
          </div>

          <div className="delete-vehicle-modal-item">
            <span className="delete-vehicle-modal-item-label">ID:</span>
            <span className="delete-vehicle-modal-item-value">{vehicleId}</span>
          </div>

          <div className="delete-vehicle-modal-item">
            <span className="delete-vehicle-modal-item-label">Current Status:</span>
            <span className="delete-vehicle-modal-item-value">{currentStatus}</span>
          </div>

          <div className="delete-vehicle-modal-status-selection">
            <label className="delete-vehicle-modal-status-label">
              Select New Status:
            </label>
            <div className="delete-vehicle-modal-status-options">
              <label className="delete-vehicle-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Active"
                  checked={selectedStatus === 'Active'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-vehicle-modal-radio-text">Active</span>
              </label>
              <label className="delete-vehicle-modal-radio-option">
                <input
                  type="radio"
                  name="status"
                  value="Inactive"
                  checked={selectedStatus === 'Inactive'}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  disabled={isDeleting}
                />
                <span className="delete-vehicle-modal-radio-text">Inactive</span>
              </label>
            </div>
          </div>
        </div>

        <div className="delete-vehicle-modal-actions">
          <button
            className="delete-vehicle-modal-btn cancel"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className="delete-vehicle-modal-btn delete"
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
