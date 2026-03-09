import React, { useState, useEffect } from 'react';
import '../styles/components/EditSubscriptionModal.css';
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE_URL = getApiBaseUrl()

function EditSubscriptionModal({ subscription, onClose, onSubmit, authHeaders }) {
  const [subscriptionTypeId, setSubscriptionTypeId] = useState('');
  const [subscriptionTypes, setSubscriptionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch subscription types
    const fetchSubscriptionTypes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/subscription-types?limit=200`, {
          headers: { ...authHeaders }
        });
        const json = await res.json().catch(() => null);
        if (res.ok) {
          const list = Array.isArray(json?.data?.items)
            ? json.data.items
            : Array.isArray(json?.data)
              ? json.data
              : [];
          setSubscriptionTypes(list);
        }
      } catch (err) {
        console.error('Failed to fetch subscription types:', err);
      }
    };

    fetchSubscriptionTypes();
  }, [authHeaders]);

  useEffect(() => {
    if (subscription && subscription.type) {
      // Find the subscription type ID from the type name
      const matchedType = subscriptionTypes.find(
        (t) => (t.TypeName || t.name) === subscription.type
      );
      if (matchedType) {
        setSubscriptionTypeId(matchedType.ID || matchedType.id);
      }
    }
  }, [subscription, subscriptionTypes]);

  if (!subscription) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'edit-subscription-modal-overlay') {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!subscriptionTypeId) {
      setError('Please select a subscription type');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        SubscriptionTypeID: subscriptionTypeId
      };

      await onSubmit(subscription.id, payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="edit-subscription-modal">
        {/* Header */}
        <div className="edit-subscription-modal-header">
          <h3>Edit Subscription</h3>
          <button className="edit-subscription-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="edit-subscription-modal-content">
            {/* Info Section */}
            <div className="edit-subscription-info-box">
              <p className="edit-subscription-id">{subscription.subscriptionId || subscription.id}</p>
              <p className="edit-subscription-customer">{subscription.customerName}</p>
            </div>

            {error && (
              <div className="edit-subscription-error">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="edit-subscription-form-grid">
              <div className="edit-subscription-field edit-subscription-field-full">
                <label>Subscription Type *</label>
                <select
                  name="subscriptionTypeId"
                  value={subscriptionTypeId}
                  onChange={(e) => setSubscriptionTypeId(e.target.value)}
                  className="edit-subscription-input"
                  required
                >
                  <option value="">Select subscription type</option>
                  {subscriptionTypes.map((type) => (
                    <option key={type.ID || type.id} value={type.ID || type.id}>
                      {type.TypeName || type.name} ({type.DurationDays || type.duration} days)
                    </option>
                  ))}
                </select>
              </div>

              <div className="edit-subscription-info-note">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#155dfc" strokeWidth="1.5" />
                  <path d="M8 7.5V11.5M8 5V5.5" stroke="#155dfc" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>Changing the subscription type will recalculate the end date and price based on the new type's duration and pricing rules.</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="edit-subscription-modal-footer">
            <button
              type="button"
              className="edit-subscription-cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-subscription-submit-button"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditSubscriptionModal;
