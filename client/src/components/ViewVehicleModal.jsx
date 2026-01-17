import '../styles/components/ViewVehicleModal.css';
import vehicleIcon from '../assets/icons/vehicles.svg';
import ownerIcon from '../assets/icons/dashboard/users.svg';

export default function ViewVehicleModal({ vehicle, onClose }) {
  if (!vehicle) return null;

  const status = (vehicle.status || 'Active').toString();
  const statusClass = status.toLowerCase() === 'active'
    ? 'view-vehicle-status-active'
    : 'view-vehicle-status-inactive';

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <div className="view-vehicle-overlay" onClick={handleOverlayClick} />
      <div className="view-vehicle-modal-wrapper">
        <div className="view-vehicle-modal" role="dialog" aria-modal="true">
          <div className="view-vehicle-header">
            <h3 className="view-vehicle-title">Vehicle Details</h3>
            <button
              type="button"
              className="view-vehicle-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="view-vehicle-body">
            <div className="view-vehicle-info-section">
              <div className="view-vehicle-icon-large" aria-hidden="true">
                <img src={vehicleIcon} alt="" />
              </div>
              <div className="view-vehicle-header-info">
                <div className="view-vehicle-plate">{vehicle.licensePlate}</div>
                <div className="view-vehicle-type">{vehicle.type}</div>
                <span className={`view-vehicle-status-badge ${statusClass}`}>{status}</span>
              </div>
            </div>

            <div className="view-vehicle-owner-section">
              <div className="view-vehicle-owner-avatar" aria-hidden="true">
                <img src={ownerIcon} alt="" />
              </div>
              <div className="view-vehicle-owner-info">
                <div className="view-vehicle-owner-label">OWNER</div>
                <div className="view-vehicle-owner-name">{vehicle.ownerName || 'Unassigned'}</div>
                <div className="view-vehicle-owner-details">
                  {vehicle.ownerId ? (
                    <>
                      {vehicle.ownerType || 'Customer'} • ID: {vehicle.ownerId}
                    </>
                  ) : (
                    'No active subscription'
                  )}
                </div>
              </div>
            </div>

            <div className="view-vehicle-details-grid">
              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">VEHICLE ID</div>
                <div className="view-vehicle-detail-value view-vehicle-detail-plate">{vehicle.id}</div>
              </div>

              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">PLATE NUMBER</div>
                <div className="view-vehicle-detail-value view-vehicle-detail-plate">
                  {vehicle.licensePlate}
                </div>
              </div>

              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">VEHICLE TYPE</div>
                <div className="view-vehicle-detail-value">{vehicle.type}</div>
              </div>

              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">COLOR</div>
                <div className="view-vehicle-detail-value">{vehicle.color || '—'}</div>
              </div>

              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">STATUS</div>
                <div className="view-vehicle-detail-value">{status}</div>
              </div>

              <div className="view-vehicle-detail-item">
                <div className="view-vehicle-detail-label">REGISTRATION DATE</div>
                <div className="view-vehicle-detail-value">
                  {vehicle.registrationDate || '15/01/2023'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
