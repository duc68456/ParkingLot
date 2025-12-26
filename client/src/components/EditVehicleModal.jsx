import { useState } from 'react';
import '../styles/components/EditVehicleModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function EditVehicleModal({ vehicle, onClose, onSave }) {
  const [plateNumber, setPlateNumber] = useState(vehicle?.licensePlate || '');

  if (!vehicle) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (plateNumber.trim()) {
      onSave({
        ...vehicle,
        licensePlate: plateNumber.toUpperCase()
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
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="edit-vehicle-body">
            <form onSubmit={handleSubmit}>
              <div className="edit-vehicle-warning">
                <p className="edit-vehicle-warning-text">
                  <strong>Note:</strong> Only the plate number can be edited. Vehicle type cannot be changed.
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
