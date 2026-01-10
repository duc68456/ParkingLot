import { useEffect, useMemo } from 'react';
import '../styles/components/SubscriptionPriceHistoryModal.css';

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export default function SubscriptionPriceHistoryModal({
  isOpen,
  title,
  rule,
  currentPrice,
  historyItems,
  isLoading,
  error,
  onClose
}) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const computedTitle = useMemo(() => {
    if (title) return title;
    const parts = [rule?.cardCategory, rule?.vehicleType, rule?.subscriptionType].filter(Boolean);
    return parts.length ? `Subscription Pricing History - ${parts.join(' / ')}` : 'Subscription Pricing History';
  }, [title, rule]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="sphm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <div className="sphm-modal">
        <div className="sphm-header">
          <h3 className="sphm-title">{computedTitle}</h3>
          <button className="sphm-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="sphm-body">
          {isLoading && <div className="sphm-state">Loading...</div>}
          {!isLoading && error && <div className="sphm-state sphm-error">{error}</div>}

          {!isLoading && !error && (
            <>
              <div className="sphm-section">
                <div className="sphm-current">
                  <div className="sphm-current-header">
                    <div className="sphm-current-heading">Current Active Price</div>
                    <span className="sphm-pill sphm-pill-active">Active</span>
                  </div>

                  <div className="sphm-current-fields">
                    <div className="sphm-current-field">
                      <div className="sphm-current-label">Card Category</div>
                      <div className="sphm-current-value">{rule?.cardCategory || '--'}</div>
                    </div>
                    <div className="sphm-current-field">
                      <div className="sphm-current-label">Vehicle Type</div>
                      <div className="sphm-current-value">{rule?.vehicleType || '--'}</div>
                    </div>
                    <div className="sphm-current-field">
                      <div className="sphm-current-label">Subscription Type</div>
                      <div className="sphm-current-value">{rule?.subscriptionType || '--'}</div>
                    </div>
                  </div>

                  <div className="sphm-current-price-row">
                    <div className="sphm-current-price-label">Current Price</div>
                    <div className="sphm-current-price">{formatMoney(currentPrice?.Price)}</div>
                  </div>
                </div>
              </div>

              <div className="sphm-section">
                <div className="sphm-history-title">Historical Price Changes</div>

                {historyItems?.length ? (
                  <div className="sphm-history-list">
                    {historyItems.map((item) => (
                      <div key={item?.id || item?.ID} className="sphm-history-card">
                        <div className="sphm-history-header">
                          <span className="sphm-pill sphm-pill-date">{formatDate(item?.StartDateApply)}</span>
                          <span className="sphm-history-by">by {item?.ChangedBy?.PersonID?.FullName || item?.ChangedBy?.ID || 'Unknown'}</span>
                        </div>

                        <div className="sphm-history-grid">
                          <div className="sphm-history-field">
                            <div className="sphm-meta-label">Old Price</div>
                            <div className="sphm-meta-value">{formatMoney(item?.SubscriptionPricingRuleDetailPrev?.Price)}</div>
                          </div>
                          <div className="sphm-history-field">
                            <div className="sphm-meta-label">New Price</div>
                            <div className="sphm-meta-value">{formatMoney(item?.Price)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sphm-empty">
                    <div className="sphm-empty-icon" aria-hidden="true">
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4Z"
                          stroke="#CBD5E1"
                          strokeWidth="3"
                        />
                        <path
                          d="M24 12V24L32 28"
                          stroke="#CBD5E1"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="sphm-empty-text">No historical pricing changes available</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sphm-footer">
          <button type="button" className="sphm-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
