import React, { useState } from 'react';
import '../styles/components/EditVehicleTypeModal.css';

export default function EditVehicleTypeModal({ vehicleType, onClose, onSave }) {
  const [typeName, setTypeName] = useState(vehicleType.name || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeName.trim()) {
      onSave({
        ...vehicleType,
        name: typeName.trim()
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
      <div className="edit-type-overlay" onClick={handleOverlayClick} />
      <div className="edit-type-modal-wrapper" onClick={handleOverlayClick}>
        <div className="edit-type-modal">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="edit-type-header">
              <h3 className="edit-type-title">Edit Vehicle Type</h3>
              <button
                type="button"
                className="edit-type-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="edit-type-content">
              {/* Warning Note */}
              <div className="edit-type-warning">
                <p>
                  <strong>Note:</strong> Only the type name can be edited.
                </p>
              </div>

              {/* Type ID Field (Read-only) */}
              <div className="edit-type-form-group">
                <label className="edit-type-label">Type ID</label>
                <input
                  type="text"
                  className="edit-type-input edit-type-disabled-input"
                  value={vehicleType.id}
                  disabled
                  readOnly
                />
              </div>

              {/* Type Name Field (Editable) */}
              <div className="edit-type-form-group">
                <label className="edit-type-label">
                  Type Name
                  <span className="edit-type-required">*</span>
                </label>
                <input
                  type="text"
                  className="edit-type-input edit-type-name-input"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  placeholder="Car"
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="edit-type-footer">
              <button
                type="button"
                className="edit-type-btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="edit-type-btn-submit"
              >
                Update Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
