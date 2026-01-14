import { useEffect } from 'react';
import '../styles/components/DeleteVehicleModal.css';
import warningIcon from '../assets/icons/dashboard/alert-warning.svg';

export default function DeleteVehicleModal({ vehicle, onClose, onConfirm }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const plateNumber = vehicle?.licensePlate || vehicle?.plateNumber || vehicle?.id || 'this vehicle';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="delete-vehicle-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-vehicle-modal" role="dialog" aria-modal="true" aria-label="Delete Vehicle">
        <button className="delete-vehicle-modal-close" type="button" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="delete-vehicle-modal-icon">
          <img src={warningIcon} alt="" />
        </div>

        <div className="delete-vehicle-modal-title">Delete Vehicle</div>
        <div className="delete-vehicle-modal-subtitle">
          Are you sure you want to delete this vehicle? This action cannot be undone.
        </div>

        <div className="delete-vehicle-modal-item">
          <span className="delete-vehicle-modal-item-label">Item:</span>
          <span className="delete-vehicle-modal-item-value">{plateNumber}</span>
        </div>

        <div className="delete-vehicle-modal-footnote">This action cannot be undone.</div>

        <div className="delete-vehicle-modal-actions">
          <button className="delete-vehicle-modal-btn cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="delete-vehicle-modal-btn delete"
            type="button"
            onClick={() => onConfirm?.(vehicle)}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
