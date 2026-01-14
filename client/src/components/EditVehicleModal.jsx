import { useState } from 'react';
import '../styles/components/EditVehicleModal.css';

export default function EditVehicleModal({ vehicle, onClose, onSave }) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.licensePlate || '');
  const [color, setColor] = useState(vehicle?.color || '');

  if (!vehicle) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (plateNumber.trim() && color.trim()) {
      onSave({
        ...vehicle,
        licensePlate: plateNumber.toUpperCase(),
        color: color.trim()
      });
      onClose();
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="edit-vehicle-overlay" onClick={handleOverlayClick}></div>
      <div className="edit-vehicle-modal-wrapper">
        <div className="edit-vehicle-modal">
          <div className="edit-vehicle-header">
            <h3 className="edit-vehicle-title">Edit Vehicle</h3>
            <button className="edit-vehicle-close-btn" onClick={onClose} type="button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="edit-vehicle-body">
            <form onSubmit={handleSubmit}>
              <div className="edit-vehicle-warning">
                <p className="edit-vehicle-warning-text">
                  <strong>Note:</strong> Plate number and color can be edited. Vehicle type cannot be changed.
                </p>
              </div>

              <div className="edit-vehicle-form-group">
                <label className="edit-vehicle-label">
                  Plate Number <span className="edit-vehicle-required">*</span>
                </label>
                <input
                  type="text"
                  className="edit-vehicle-input edit-vehicle-plate-input"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="edit-vehicle-form-group">
                <label className="edit-vehicle-label">Vehicle Type</label>
                <input
                  type="text"
                  className="edit-vehicle-input edit-vehicle-disabled-input"
                  value={vehicle.type}
                  disabled
                  readOnly
                />
              </div>

              <div className="edit-vehicle-form-group">
                <label className="edit-vehicle-label">
                  Color <span className="edit-vehicle-required">*</span>
                </label>
                <input
                  type="text"
                  className="edit-vehicle-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Black"
                  required
                />
              </div>

              <div className="edit-vehicle-footer">
                <button
                  type="button"
                  className="edit-vehicle-btn edit-vehicle-btn-cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-vehicle-btn edit-vehicle-btn-submit"
                >
                  Update Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
