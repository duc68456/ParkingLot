import React, { useState } from 'react';
import '../styles/components/PauseSubscriptionModal.css';

function PauseSubscriptionModal({ subscription, onClose, onPause }) {
  const [reason, setReason] = useState('');

  if (!subscription) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please enter a reason for suspension');
      return;
    }

    onPause(subscription.id, reason);
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'pause-subscription-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="pause-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="pause-subscription-modal">
        {/* Header */}
        <div className="pause-subscription-modal-header">
          <h3>Suspend Subscription</h3>
          <button className="pause-subscription-modal-close" onClick={onClose}>
            <img src="http://localhost:3845/assets/3b1fd7a264c04d18910cf128ec5c8c34e71cbeef.svg" alt="Close" />
          </button>
        </div>

        {/* Content */}
        <div className="pause-subscription-modal-content">
          {/* Warning box */}
          <div className="pause-subscription-warning-box">
            <p className="pause-subscription-id">{subscription.id}</p>
            <p className="pause-subscription-customer">{subscription.customerName}</p>
          </div>

          {/* Warning message */}
          <p className="pause-subscription-message">
            Are you sure you want to suspend this subscription? The customer will not be able to use the parking until it is resumed.
          </p>

          {/* Reason field */}
          <div className="pause-subscription-field">
            <label>Reason</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              className="pause-subscription-textarea"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pause-subscription-modal-footer">
          <button className="pause-subscription-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="pause-subscription-submit-button" onClick={handleSubmit}>
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

export default PauseSubscriptionModal;
