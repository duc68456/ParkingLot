import { useState } from 'react';
import '../styles/components/AddVehicleTypeModal.css';

export default function AddVehicleTypeModal({ onClose, onSave }) {
  const [typeName, setTypeName] = useState('');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const name = typeName.trim();
    if (!name) return;

    onSave({ name });
    onClose();
  };

  return (
    <>
      <div className="add-vehicle-type-overlay" onClick={handleOverlayClick} />
      <div className="add-vehicle-type-modal-wrapper" onClick={handleOverlayClick}>
        <div className="add-vehicle-type-modal">
          <form onSubmit={handleSubmit}>
            <div className="add-vehicle-type-header">
              <h3 className="add-vehicle-type-title">Add Vehicle Type</h3>
              <button
                type="button"
                className="add-vehicle-type-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="add-vehicle-type-content">
              <div className="add-vehicle-type-form-group">
                <label className="add-vehicle-type-label">
                  Type Name
                  <span className="add-vehicle-type-required">*</span>
                </label>
                <input
                  type="text"
                  className="add-vehicle-type-input"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="e.g., Car, Motorcycle, Truck, Bus"
                  required
                />
              </div>
            </div>

            <div className="add-vehicle-type-footer">
              <button type="button" className="add-vehicle-type-btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="add-vehicle-type-btn-submit">
                Add Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
