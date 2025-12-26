import '../styles/components/ViewVehicleModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const vehicleIcon = "http://localhost:3845/assets/9fd172c1a47d63bfe66e1eefa448265fdd8f0743.svg";
const ownerIcon = "http://localhost:3845/assets/9bddb7d3b5cfd4771d686fa89d8f6c6ee437a2e3.svg";

export default function ViewVehicleModal({ vehicle, onClose }) {
  if (!vehicle) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div className="view-vehicle-overlay" onClick={handleOverlayClick}></div>
      <div className="view-vehicle-modal-wrapper">
        <div className="view-vehicle-modal">
          <div className="view-vehicle-header">
            <h3 className="view-vehicle-title">Vehicle Details</h3>
            <button className="view-vehicle-close-btn" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="view-vehicle-body">
            <div className="view-vehicle-info-section">
              <div className="view-vehicle-icon-large">
                <img src={vehicleIcon} alt="Vehicle" />
              </div>
              <div className="view-vehicle-header-info">
                <h3 className="view-vehicle-plate">{vehicle.licensePlate}</h3>
                <p className="view-vehicle-type">{vehicle.type}</p>
                <span className="view-vehicle-status-badge view-vehicle-status-active">
                  {vehicle.status}
                </span>
              </div>
            </div>

            <div className="view-vehicle-owner-section">
              <div className="view-vehicle-owner-avatar">
                <img src={ownerIcon} alt="Owner" />
              </div>
              <div className="view-vehicle-owner-info">
                <p className="view-vehicle-owner-label">OWNER</p>
                <p className="view-vehicle-owner-name">{vehicle.ownerName || 'John Doe'}</p>
                <p className="view-vehicle-owner-details">
                  {vehicle.ownerType || 'Customer'} • ID: {vehicle.ownerId || 'CUST001'}
                </p>
              </div>
            </div>

            <div className="view-vehicle-details-grid">
              <div className="view-vehicle-detail-item">
                <p className="view-vehicle-detail-label">VEHICLE ID</p>
                <p className="view-vehicle-detail-value">{vehicle.id}</p>
              </div>
              <div className="view-vehicle-detail-item">
                <p className="view-vehicle-detail-label">PLATE NUMBER</p>
                <p className="view-vehicle-detail-value view-vehicle-detail-plate">
                  {vehicle.licensePlate}
                </p>
              </div>
              <div className="view-vehicle-detail-item">
                <p className="view-vehicle-detail-label">VEHICLE TYPE</p>
                <p className="view-vehicle-detail-value">{vehicle.type}</p>
              </div>
              <div className="view-vehicle-detail-item">
                <p className="view-vehicle-detail-label">STATUS</p>
                <p className="view-vehicle-detail-value">{vehicle.status}</p>
              </div>
              <div className="view-vehicle-detail-item">
                <p className="view-vehicle-detail-label">REGISTRATION DATE</p>
                <p className="view-vehicle-detail-value">
                  {vehicle.registrationDate || '15/01/2023'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
