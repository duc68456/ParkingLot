import '../styles/components/ViewCustomerModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const vehicleIcon = "http://localhost:3845/assets/258b617d0cf978612fcc52378ef9f60f2faafe26.svg";
const carIcon = "http://localhost:3845/assets/e0acfd868c31bc907b5d6ba4b8ad7e5d76101ec9.svg";

function ViewCustomerModal({ customer, vehicles, onClose }) {
  if (!customer) return null;

  const getInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'customer-status-active';
      case 'inactive':
        return 'customer-status-inactive';
      case 'suspended':
        return 'customer-status-suspended';
      default:
        return 'customer-status-active';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('view-customer-overlay')) {
      onClose();
    }
  };

  return (
    <>
      <div className="view-customer-overlay" onClick={handleOverlayClick}></div>
      <div className="view-customer-modal-wrapper">
        <div className="view-customer-modal">
          {/* Header */}
          <div className="view-customer-header">
            <h3 className="view-customer-title">Customer Details</h3>
            <button className="view-customer-close-btn" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          {/* Body */}
          <div className="view-customer-body">
            {/* Profile Section */}
            <div className="customer-profile-section">
              <div className="customer-avatar">
                {getInitials(customer.name || customer.fullName)}
              </div>
              <div className="customer-profile-info">
                <h3 className="customer-name">{customer.name || customer.fullName}</h3>
                <p className="customer-email">{customer.email}</p>
                <span className={`customer-status-badge ${getStatusClass(customer.status)}`}>
                  {customer.status || 'Active'}
                </span>
              </div>
            </div>

            {/* Customer Details Grid */}
            <div className="customer-details-grid">
              {/* Row 1 */}
              <div className="customer-detail-item">
                <label className="detail-label">Phone</label>
                <p className="detail-value">{customer.phone || customer.phoneNumber || '+1234567890'}</p>
              </div>
              <div className="customer-detail-item">
                <label className="detail-label">Gender</label>
                <p className="detail-value">{customer.gender || 'Male'}</p>
              </div>

              {/* Row 2 */}
              <div className="customer-detail-item">
                <label className="detail-label">Address</label>
                <p className="detail-value">{customer.address || '123 Main St, City'}</p>
              </div>
              <div className="customer-detail-item">
                <label className="detail-label">Hometown</label>
                <p className="detail-value">{customer.hometown || 'Springfield'}</p>
              </div>

              {/* Row 3 */}
              <div className="customer-detail-item">
                <label className="detail-label">Cards Count</label>
                <p className="detail-value">{customer.cardsCount || customer.cards?.length || 2}</p>
              </div>
              <div className="customer-detail-item">
                <label className="detail-label">Active Subscriptions</label>
                <p className="detail-value">{customer.activeSubscriptions || customer.subscriptions?.length || 1}</p>
              </div>
            </div>

            {/* Registered Vehicles Section */}
            <div className="registered-vehicles-section">
              <div className="section-header">
                <img src={vehicleIcon} alt="Vehicle" className="section-icon" />
                <h4 className="section-title">Registered Vehicles</h4>
                <span className="vehicle-count-badge">
                  {vehicles?.length || 1}
                </span>
              </div>

              <div className="vehicles-list">
                {vehicles && vehicles.length > 0 ? (
                  vehicles.map((vehicle, index) => (
                    <div key={index} className="vehicle-item">
                      <div className="vehicle-left">
                        <div className="vehicle-icon-wrapper">
                          <img src={carIcon} alt="Car" />
                        </div>
                        <div className="vehicle-info">
                          <p className="vehicle-plate">{vehicle.plateNumber}</p>
                          <p className="vehicle-type">{vehicle.vehicleType || 'Car'}</p>
                        </div>
                      </div>
                      <div className="vehicle-right">
                        <span className="vehicle-date-label">Registered</span>
                        <p className="vehicle-date">{vehicle.registeredDate || '15/01/2023'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="vehicle-item">
                    <div className="vehicle-left">
                      <div className="vehicle-icon-wrapper">
                        <img src={carIcon} alt="Car" />
                      </div>
                      <div className="vehicle-info">
                        <p className="vehicle-plate">ABC-1234</p>
                        <p className="vehicle-type">Car</p>
                      </div>
                    </div>
                    <div className="vehicle-right">
                      <span className="vehicle-date-label">Registered</span>
                      <p className="vehicle-date">15/01/2023</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewCustomerModal;
