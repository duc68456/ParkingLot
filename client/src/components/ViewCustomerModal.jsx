import { useEffect, useState } from 'react';
import '../styles/components/ViewCustomerModal.css';
import vehicleIcon from '../assets/icons/vehicles.svg';
import carIcon from '../assets/icons/dashboard/car.svg';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function ViewCustomerModal({ customer, onClose }) {
  const { authHeaders } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!customer?.id) return;

    let isMounted = true;
    setLoading(true);

    const fetchVehicles = async () => {
      try {
        // Fetch active subscriptions for this customer to find registered vehicles
        const res = await fetch(`${API_BASE_URL}/api/subscriptions?customerId=${customer.id}&isActive=true`, {
          headers: { ...authHeaders }
        });
        const json = await res.json().catch(() => null);

        if (isMounted && res.ok && json?.success && Array.isArray(json?.data?.items)) {
          // Extract unique vehicles from subscriptions
          const uniqueVehicles = [];
          const seenIds = new Set();

          json.data.items.forEach(sub => {
            const v = sub.Vehicle;
            if (v && !seenIds.has(v.VehicleID)) {
              seenIds.add(v.VehicleID);
              uniqueVehicles.push({
                plateNumber: v.PlateNumber,
                vehicleType: sub.VehicleType?.Name || 'Car',
                registeredDate: sub.StartDate
              });
            }
          });
          setVehicles(uniqueVehicles);
        }
      } catch (err) {
        console.error('Failed to fetch customer vehicles:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchVehicles();

    return () => {
      isMounted = false;
    };
  }, [customer, authHeaders]);

  if (!customer) return null;

  const safeText = (value, fallback = '-') => {
    if (value === null || value === undefined) return fallback;
    const str = String(value).trim();
    return str.length ? str : fallback;
  };

  const formatDateShort = (value) => {
    if (!value || value === '-') return '-';
    // If it's already a localized string "dd/mm/yyyy", return it
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleDateString('en-GB');
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
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
                    {formatDateShort(customer.registeredDay || customer.registered)}
                  </p>
                </div>

                <div className="detail-field detail-field-subscriptions">
                  <label className="detail-field-label">Active Subscriptions</label>
                  <div className="detail-field-value">
                    <span className="subscriptions-badge--large">
                      {loading ? '...' : vehicles.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicles Section */}
              <div className="vehicles-section">
                <div className="vehicles-header">
                  <img src={vehicleIcon} alt="Vehicle" className="vehicles-icon" />
                  <h4 className="vehicles-title">Registered Vehicles</h4>
                  <span className="vehicles-count-badge">
                    {loading ? '...' : vehicles.length}
                  </span>
                </div>

                <div className="vehicles-list-container">
                  {loading ? (
                    <div className="vehicle-card" style={{ justifyContent: 'center', color: '#64748b' }}>
                      Loading vehicles...
                    </div>
                  ) : vehicles && vehicles.length > 0 ? (
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
                            {formatDateShort(vehicle.registeredDate)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="vehicle-card" style={{ justifyContent: 'center', color: '#64748b' }}>
                      No active vehicles found
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
