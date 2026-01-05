import { useEffect } from 'react';
import '../styles/components/CardPriceHistoryModal.css';

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function getChangedByName(record) {
  const personName = record?.ChangedBy?.PersonID?.FullName;
  if (personName) return personName;
  return record?.ChangedBy?.ID || 'Unknown';
}

export default function CardPriceHistoryModal({
  isOpen,
  title,
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

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="cphm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <div className="cphm-modal">
        <div className="cphm-header">
          <h3 className="cphm-title">{title || 'Price History'}</h3>
          <button className="cphm-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="cphm-body">
          {isLoading && <div className="cphm-state">Loading...</div>}
          {!isLoading && error && <div className="cphm-state cphm-error">{error}</div>}

          {!isLoading && !error && (
            <>
              <div className="cphm-section">
                <div className="cphm-current">
                  <div className="cphm-current-header">
                    <div className="cphm-current-heading">Current Active Price</div>
                    <span className="cphm-pill cphm-pill-active">Active</span>
                  </div>

                  <div className="cphm-current-main">
                    <div className="cphm-current-label">Price</div>
                    <div className="cphm-current-price-stack">
                      <div className="cphm-current-price">{formatMoney(currentPrice?.Price)}</div>
                    </div>
                  </div>

                  <div className="cphm-current-footer">
                    <span className="cphm-current-last-label">Last Updated:</span>
                    <span className="cphm-current-last-value">{formatDateTime(currentPrice?.StartDateApply)}</span>
                  </div>
                </div>
              </div>

              <div className="cphm-section">
                <div className="cphm-history-title">Historical Price Changes</div>

                {historyItems?.length ? (
                  <div className="cphm-history-list">
                    {historyItems.map((item) => {
                      const oldPrice = item?.CardPricePrev?.Price;
                      const newPrice = item?.Price;

                      return (
                        <div key={item?.id || item?.ID} className="cphm-history-card">
                          <div className="cphm-history-header">
                            <span className="cphm-pill cphm-pill-date">
                              {formatDateTime(item?.StartDateApply)}
                            </span>
                            <span className="cphm-history-by">by Admin {getChangedByName(item)}</span>
                          </div>

                          <div className="cphm-history-grid">
                            <div className="cphm-history-field">
                              <div className="cphm-meta-label">Old Price</div>
                              <div className="cphm-meta-value">{formatMoney(oldPrice)}</div>
                            </div>
                            <div className="cphm-history-field">
                              <div className="cphm-meta-label">New Price</div>
                              <div className="cphm-meta-value">{formatMoney(newPrice)}</div>
                            </div>
                          </div>

                          <div className="cphm-history-reason">
                            <div className="cphm-meta-label">Reason</div>
                            <div className="cphm-meta-value">{item?.Reason || '---'}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="cphm-empty">
                    <div className="cphm-empty-icon" aria-hidden="true">
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
                        <path
                          d="M10 4V12"
                          stroke="#CBD5E1"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                        <path
                          d="M38 4V12"
                          stroke="#CBD5E1"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="cphm-empty-text">No price change history available</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="cphm-footer">
          <button type="button" className="cphm-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
