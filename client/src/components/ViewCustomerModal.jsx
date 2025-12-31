import '../styles/components/ViewCustomerModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const vehicleIcon = "http://localhost:3845/assets/258b617d0cf978612fcc52378ef9f60f2faafe26.svg";
const carIcon = "http://localhost:3845/assets/e0acfd868c31bc907b5d6ba4b8ad7e5d76101ec9.svg";

function ViewCustomerModal({ customer, vehicles, onClose }) {
  if (!customer) return null;

  const safeText = (value, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const formatDateShort = (value) => {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    try {
      const dt = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleDateString(undefined);
    } catch {
      return '-';
    }
  };

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('view-customer-modal-overlay')) {
      onClose();
    }
  };

  return (
    <>
      <div className="view-customer-modal-overlay" onClick={handleOverlayClick}></div>
      <div className="view-customer-modal-container">
        <div className="view-customer-modal-content">
          {/* Header */}
          <div className="modal-header">
            <h3 className="modal-title">Customer Details</h3>
            <button className="modal-close-button" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="modal-body-scroll">
              {/* Profile Section */}
              <div className="profile-section">
                <div className="profile-avatar">
                  {getInitials(customer.name || customer.fullName)}
                </div>
                <div className="profile-info">
                  <h3 className="profile-name">{customer.name || customer.fullName}</h3>
                  <span className="profile-status-badge">
                    {customer.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="details-grid-container">
                <div className="detail-field detail-field-phone">
                  <label className="detail-field-label">Phone</label>
                  <p className="detail-field-value">
                    {safeText(customer.phone || customer.phoneNumber, '+1234567890')}
                  </p>
                </div>

                <div className="detail-field detail-field-registered-day">
                  <label className="detail-field-label">Registered Day</label>
                  <p className="detail-field-value">
                    {formatDateShort(customer.registeredDay || customer.registeredAt || customer.createdAt) || '15/01/2023'}
                  </p>
                </div>

                <div className="detail-field detail-field-cards">
                  <label className="detail-field-label">Cards Count</label>
                  <p className="detail-field-value">
                    {customer.cardsCount ?? customer.cards?.length ?? 2}
                  </p>
                </div>

                <div className="detail-field detail-field-subscriptions">
                  <label className="detail-field-label">Active Subscriptions</label>
                  <p className="detail-field-value">
                    {customer.activeSubscriptions ?? customer.subscriptions?.length ?? 1}
                  </p>
                </div>
              </div>

              {/* Vehicles Section */}
              <div className="vehicles-section">
                <div className="vehicles-header">
                  <img src={vehicleIcon} alt="Vehicle" className="vehicles-icon" />
                  <h4 className="vehicles-title">Registered Vehicles</h4>
                  <span className="vehicles-count-badge">
                    {vehicles?.length || 1}
                  </span>
                </div>

                <div className="vehicles-list-container">
                  {vehicles && vehicles.length > 0 ? (
                    vehicles.map((vehicle, index) => (
                      <div key={index} className="vehicle-card">
                        <div className="vehicle-card-left">
                          <div className="vehicle-card-icon">
                            <img src={carIcon} alt="Car" />
                          </div>
                          <div className="vehicle-card-info">
                            <p className="vehicle-plate-number">{safeText(vehicle.plateNumber)}</p>
                            <p className="vehicle-type-text">{vehicle.vehicleType || 'Car'}</p>
                          </div>
                        </div>
                        <div className="vehicle-card-right">
                          <span className="vehicle-registered-label">Registered</span>
                          <p className="vehicle-registered-date">
                            {formatDateShort(vehicle.registeredDate) || '15/01/2023'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="vehicle-card">
                      <div className="vehicle-card-left">
                        <div className="vehicle-card-icon">
                          <img src={carIcon} alt="Car" />
                        </div>
                        <div className="vehicle-card-info">
                          <p className="vehicle-plate-number">ABC-1234</p>
                          <p className="vehicle-type-text">Car</p>
                        </div>
                      </div>
                      <div className="vehicle-card-right">
                        <span className="vehicle-registered-label">Registered</span>
                        <p className="vehicle-registered-date">15/01/2023</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewCustomerModal;
