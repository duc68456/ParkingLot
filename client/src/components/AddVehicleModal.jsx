import { useState } from 'react';
import '../styles/components/AddVehicleModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function AddVehicleModal({ onClose, onSave, vehicleTypes = [] }) {
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState(vehicleTypes[0]?.name || '');
  const [color, setColor] = useState('');
  const [ownerName, setOwnerName] = useState('');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!plateNumber.trim()) return;
    if (!color.trim()) return;
    onSave({
      licensePlate: plateNumber.toUpperCase(),
      type: type || 'Unknown',
      color: color.trim(),
      status: 'Active',
      ownerName: ownerName || 'Unknown',
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
            <h3 className="add-vehicle-title">Add Vehicle</h3>
            <button className="add-vehicle-close-btn" onClick={onClose} type="button">
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="add-vehicle-body">
            <form onSubmit={handleSubmit}>
              <div className="add-vehicle-form-group">
                <label className="add-vehicle-label">Plate Number <span className="add-vehicle-required">*</span></label>
                <input
                  type="text"
                  className="add-vehicle-input"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="add-vehicle-form-group">
                <label className="add-vehicle-label">Vehicle Type</label>
                <select className="add-vehicle-select" value={type} onChange={(e) => setType(e.target.value)}>
                  {vehicleTypes.map(vt => (
                    <option key={vt.id} value={vt.name}>{vt.name}</option>
                  ))}
                </select>
              </div>

              <div className="add-vehicle-form-group">
                <label className="add-vehicle-label">Color <span className="add-vehicle-required">*</span></label>
                <input
                  type="text"
                  className="add-vehicle-input"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="Black"
                  required
                />
              </div>

              <div className="add-vehicle-form-group">
                <label className="add-vehicle-label">Owner Name</label>
                <input
                  type="text"
                  className="add-vehicle-input"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>

              <div className="add-vehicle-footer">
                <button type="button" className="add-vehicle-btn-cancel" onClick={onClose}>Cancel</button>
                <button type="submit" className="add-vehicle-btn-submit">Add Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
