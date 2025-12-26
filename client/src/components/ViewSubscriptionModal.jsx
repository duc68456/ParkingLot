import React from 'react';
import '../styles/components/ViewSubscriptionModal.css';

function ViewSubscriptionModal({ subscription, onClose }) {
  if (!subscription) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'view-subscription-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="view-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="view-subscription-modal">
        {/* Header */}
        <div className="view-subscription-modal-header">
          <h3>Subscription Details</h3>
          <button className="view-subscription-modal-close" onClick={onClose}>
            <img src="http://localhost:3845/assets/3b1fd7a264c04d18910cf128ec5c8c34e71cbeef.svg" alt="Close" />
          </button>
        </div>

        {/* Content */}
        <div className="view-subscription-modal-content">
          {/* Title Section */}
          <div className="view-subscription-title-section">
            <div className="view-subscription-id-info">
              <h4 className="view-subscription-id">{subscription.id}</h4>
              <p className="view-subscription-customer-name">{subscription.customerName}</p>
            </div>
            <div className="view-subscription-status-badge">
              {subscription.status}
            </div>
          </div>

          {/* Details Grid */}
          <div className="view-subscription-details-grid">
            {/* Row 1 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Subscription ID</label>
              <p className="view-subscription-value view-subscription-id-value">{subscription.id}</p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">Customer ID</label>
              <p className="view-subscription-value view-subscription-id-value">
                {subscription.customerId || 'CUST001'}
              </p>
            </div>

            {/* Row 2 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Customer Name</label>
              <p className="view-subscription-value">{subscription.customerName}</p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">Card ID</label>
              <p className="view-subscription-value view-subscription-id-value">
                {subscription.cardId || 'CARD001'}
              </p>
            </div>

            {/* Row 3 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Vehicle ID</label>
              <p className="view-subscription-value view-subscription-id-value">
                {subscription.vehicleId || 'VEH001'}
              </p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">Vehicle Plate</label>
              <p className="view-subscription-value">{subscription.vehiclePlate}</p>
            </div>

            {/* Row 4 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Card Category</label>
              <p className="view-subscription-value">
                {subscription.cardCategory || 'Premium'}
              </p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">Subscription Type</label>
              <p className="view-subscription-value">{subscription.type}</p>
            </div>

            {/* Row 5 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Start Date</label>
              <p className="view-subscription-value">{subscription.startDate}</p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">End Date</label>
              <p className="view-subscription-value">{subscription.endDate}</p>
            </div>

            {/* Row 6 */}
            <div className="view-subscription-field">
              <label className="view-subscription-label">Price Paid</label>
              <p className="view-subscription-value">
                ${subscription.price ? subscription.price.toFixed(2) : '100.00'}
              </p>
            </div>

            <div className="view-subscription-field">
              <label className="view-subscription-label">Status</label>
              <p className="view-subscription-value">{subscription.status}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewSubscriptionModal;
