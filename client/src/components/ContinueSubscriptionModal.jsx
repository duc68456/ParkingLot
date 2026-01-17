import React from 'react';
import '../styles/components/ContinueSubscriptionModal.css';

function ContinueSubscriptionModal({ subscription, onClose, onContinue }) {
  if (!subscription) return null;

  const handleSubmit = () => {
    onContinue(subscription.id);
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'continue-subscription-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="continue-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="continue-subscription-modal">
        {/* Header */}
        <div className="continue-subscription-modal-header">
          <h3>Resume Subscription</h3>
          <button className="continue-subscription-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="continue-subscription-modal-content">
          {/* Info box */}
          <div className="continue-subscription-info-box">
            <p className="continue-subscription-id">{subscription.subscriptionId || subscription.id}</p>
            <p className="continue-subscription-customer">{subscription.customerName}</p>
          </div>

          {/* Confirmation message */}
          <p className="continue-subscription-message">
            Are you sure you want to resume this subscription? The customer will be able to use the parking again.
          </p>
        </div>

        {/* Footer */}
        <div className="continue-subscription-modal-footer">
          <button className="continue-subscription-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="continue-subscription-submit-button" onClick={handleSubmit}>
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContinueSubscriptionModal;
