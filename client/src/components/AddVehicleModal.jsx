import { useState } from 'react';
import '../styles/components/AddVehicleModal.css';

const closeIcon = "/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function AddVehicleModal({ onClose, onSave, vehicleTypes = [] }) {
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState('');
  const [color, setColor] = useState('');
  const [touched, setTouched] = useState({
    plateNumber: false,
    type: false,
    color: false
  });

  const plate = plateNumber.trim();
  const selectedType = (type || '').toString().trim();
  const vehicleColor = color.trim();

  const errors = {
    plateNumber: !plate ? 'Plate number is required.' : null,
    type: !selectedType ? 'Vehicle type is required.' : null,
    color: !vehicleColor ? 'Color is required.' : null
  };

  const isValid = !errors.plateNumber && !errors.type && !errors.color;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched({ plateNumber: true, type: true, color: true });
    if (!isValid) return;

    onSave({
      licensePlate: plate.toUpperCase(),
      type: selectedType,
      color: vehicleColor,
      status: 'Active',
      ownerName: 'Unknown',
      ownerType: 'Customer',
      registrationDate: new Date().toLocaleDateString()
    });
  };

  return (
    <>
      <div className="add-vehicle-overlay" onClick={handleOverlayClick}></div>
      <div className="add-vehicle-modal-wrapper">
        <div className="add-vehicle-modal">
          <div className="add-vehicle-header">
            <h3 className="add-vehicle-title">Add New Vehicle</h3>
            <button className="add-vehicle-close-btn" onClick={onClose} type="button">
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="add-vehicle-body">
            <form onSubmit={handleSubmit}>
              <div className="add-vehicle-note">
                <span className="add-vehicle-note-label">Note:</span>
                <span>
                  {' '}
                  Add standalone vehicles here. Vehicles associated with customers or employees are created during card
                  registration.
                </span>
              </div>

              <div className="add-vehicle-form">
                <div className="add-vehicle-form-group">
                  <label className="add-vehicle-label">
                    Plate Number <span className="add-vehicle-required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`add-vehicle-input ${touched.plateNumber && errors.plateNumber ? 'add-vehicle-input-error' : ''}`}
                    value={plateNumber}
                    onBlur={() => setTouched((t) => ({ ...t, plateNumber: true }))}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="ABC-1234"
                    autoComplete="off"
                  />
                  {touched.plateNumber && errors.plateNumber && (
                    <div className="add-vehicle-error">{errors.plateNumber}</div>
                  )}
                </div>

                <div className="add-vehicle-form-group">
                  <label className="add-vehicle-label">
                    Vehicle Type <span className="add-vehicle-required">*</span>
                  </label>
                  <select
                    className={`add-vehicle-select ${touched.type && errors.type ? 'add-vehicle-input-error' : ''}`}
                    value={type}
                    onBlur={() => setTouched((t) => ({ ...t, type: true }))}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="" disabled>
                      Select vehicle type
                    </option>
                    {vehicleTypes
                      .filter((vt) => (vt?.IsActive ?? true) !== false)
                      .map((vt) => (
                        <option key={vt.id} value={vt.name}>
                          {vt.name}
                        </option>
                      ))}
                  </select>
                  {touched.type && errors.type && (
                    <div className="add-vehicle-error">{errors.type}</div>
                  )}
                </div>

                <div className="add-vehicle-form-group">
                  <label className="add-vehicle-label">
                    Color <span className="add-vehicle-required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`add-vehicle-input ${touched.color && errors.color ? 'add-vehicle-input-error' : ''}`}
                    value={color}
                    onBlur={() => setTouched((t) => ({ ...t, color: true }))}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Black"
                    autoComplete="off"
                  />
                  {touched.color && errors.color && (
                    <div className="add-vehicle-error">{errors.color}</div>
                  )}
                </div>
              </div>

              <div className="add-vehicle-footer">
                <button type="button" className="add-vehicle-btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="add-vehicle-btn-submit" disabled={!isValid}>
                  Add Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
