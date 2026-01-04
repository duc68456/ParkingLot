import { useEffect } from 'react';
import '../styles/components/DeleteVehicleModal.css';

// Figma-exported assets (served from the same local dev server pattern used in other tables/components)
const warningIconUrl = 'http://localhost:3845/assets/6efc644be7d589ce3b3a946c4d53d23688c9e8fe.svg';
const closeIconUrl = 'http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg';

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
          <img src={closeIconUrl} alt="" />
        </button>

        <div className="delete-vehicle-modal-icon">
          <img src={warningIconUrl} alt="" />
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
