import { useEffect } from 'react';
import '../styles/components/EntryPricingHistoryModal.css';

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

function formatDateOrActive(value) {
  if (!value) return '--';
  if (String(value).toLowerCase() === 'active') return 'Active';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatPeriod(start, end) {
  const s = formatDateOrActive(start);
  const e = formatDateOrActive(end);
  return `${s} → ${e}`;
}

export default function EntryPricingHistoryModal({
  isOpen,
  title,
  current,
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

  const currentDay = current?.dayPrice;
  const currentFirst = current?.firstHour;
  const currentNext = current?.nextHour;

  return (
    <div className="ephm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <div className="ephm-modal">
        <div className="ephm-header">
          <h3 className="ephm-title">{title || 'Pricing History'}</h3>
          <button className="ephm-close" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="ephm-body">
          {isLoading && <div className="ephm-state">Loading...</div>}
          {!isLoading && error && <div className="ephm-state ephm-error">{error}</div>}

          {!isLoading && !error && (
            <>
              <div className="ephm-current">
                <div className="ephm-current-header">
                  <div className="ephm-current-heading">Current Active Rule</div>
                  <span className="ephm-pill ephm-pill-active">Active</span>
                </div>

                <div className="ephm-prices">
                  <div className="ephm-price">
                    <div className="ephm-price-label">Day Price</div>
                    <div className="ephm-price-value">{formatMoney(currentDay)}</div>
                  </div>
                  <div className="ephm-price">
                    <div className="ephm-price-label">First Hour</div>
                    <div className="ephm-price-value">{formatMoney(currentFirst)}</div>
                  </div>
                  <div className="ephm-price">
                    <div className="ephm-price-label">Next Hour</div>
                    <div className="ephm-price-value">{formatMoney(currentNext)}</div>
                  </div>
                </div>

                <div className="ephm-current-dates">
                  <div className="ephm-date">
                    <span className="ephm-date-label">Start Date:</span>
                    <span className="ephm-date-value">{formatDateOrActive(current?.startDate)}</span>
                  </div>
                  <div className="ephm-date">
                    <span className="ephm-date-label">End Date:</span>
                    <span className="ephm-date-value">{formatDateOrActive(current?.endDate)}</span>
                  </div>
                </div>
              </div>

              <div className="ephm-history">
                <div className="ephm-history-title">Historical Pricing Periods</div>

                <div className="ephm-history-scroll">
                  {historyItems?.length ? (
                    historyItems.map((item) => (
                      <div key={item?.id || item?.startDate || Math.random()} className="ephm-history-card">
                        <div className="ephm-history-header">
                          <span className="ephm-pill ephm-pill-date">{formatDateOrActive(item?.startDate)}</span>
                          <span className="ephm-history-by">by {item?.changedBy || 'Unknown'}</span>
                        </div>

                        <div className="ephm-delta-grid">
                          <div className="ephm-delta">
                            <div className="ephm-delta-label">Day Price</div>
                            <div className="ephm-delta-values">
                              <span className="ephm-old">{formatMoney(item?.prev?.dayPrice)}</span>
                              <span className="ephm-arrow">→</span>
                              <span className="ephm-new">{formatMoney(item?.dayPrice)}</span>
                            </div>
                          </div>

                          <div className="ephm-delta">
                            <div className="ephm-delta-label">First Hour</div>
                            <div className="ephm-delta-values">
                              <span className="ephm-old">{formatMoney(item?.prev?.firstHour)}</span>
                              <span className="ephm-arrow">→</span>
                              <span className="ephm-new">{formatMoney(item?.firstHour)}</span>
                            </div>
                          </div>

                          <div className="ephm-delta">
                            <div className="ephm-delta-label">Next Hour</div>
                            <div className="ephm-delta-values">
                              <span className="ephm-old">{formatMoney(item?.prev?.nextHour)}</span>
                              <span className="ephm-arrow">→</span>
                              <span className="ephm-new">{formatMoney(item?.nextHour)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ephm-history-footer">
                          <div className="ephm-period">
                            <span className="ephm-period-label">Active Period:</span>
                            <span className="ephm-period-value">
                              {formatPeriod(item?.periodStart, item?.periodEnd)}
                            </span>
                          </div>

                          <div className="ephm-reason">
                            <div className="ephm-reason-label">Reason</div>
                            <div className="ephm-reason-value">{item?.reason || '---'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="ephm-empty">No historical pricing periods available</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="ephm-footer">
          <button type="button" className="ephm-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
