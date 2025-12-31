import '../styles/components/ViewEntrySessionModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function ViewEntrySessionModal({ session, onClose }) {
  if (!session) return null;

  const safeLower = (value) => (value ?? '').toString().toLowerCase();

  const getStatusClass = (status) => {
    switch (safeLower(status)) {
      case 'completed':
        return 'status-completed';
      case 'active':
        return 'status-active';
      default:
        return '';
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';

    // If backend already sends a formatted string, keep it.
    if (typeof value === 'string') return value;

    try {
      const dt = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(dt.getTime())) return '-';
      return dt.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  const cardType = session.cardType || session.type || session.cardCategory || 'Standard';
  const subscriptionLabel = session.subscriptionName ||
    session.subscription ||
    (session.inSubscription ? 'Active' : 'None');
  const finalFeeValue = typeof session.finalFee === 'number'
    ? session.finalFee
    : Number(session.finalFee);
  const finalFeeText = Number.isFinite(finalFeeValue) ? `$${finalFeeValue.toFixed(2)}` : '-';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content view-session-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title">Session Details</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <img src={closeIcon} alt="Close" width="20" height="20" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          <div className="session-details">
            {/* Summary */}
            <div className="session-summary">
              <div className="session-summary-left">
                <div className="session-summary-label">Session ID</div>
                <div className="session-summary-id">{session.id}</div>
              </div>
              <span className={`session-status-pill ${getStatusClass(session.status)}`}>
                {session.status}
              </span>
            </div>

            {/* Quick Info */}
            <div className="session-grid session-grid-2">
              <div className="session-info-card">
                <div className="session-info-label">Vehicle Plate</div>
                <div className="session-info-mono">{session.plate || '-'}</div>
              </div>
              <div className="session-info-card">
                <div className="session-info-label">Card ID</div>
                <div className="session-info-mono">{session.cardId || '-'}</div>
              </div>
            </div>

            {/* Card Type */}
            <div className="session-block">
              <div className="session-info-label">Card Type</div>
              <div className="session-type-pill">{cardType}</div>
            </div>

            {/* Time Information */}
            <div className="session-section">
              <div className="session-section-title">Time Information</div>
              <div className="session-section-card">
                <div className="session-kv-row">
                  <div className="session-kv-key">Entry Time</div>
                  <div className="session-kv-value">{formatDateTime(session.entryTime)}</div>
                </div>
                <div className="session-divider" />
                <div className="session-kv-row">
                  <div className="session-kv-key">Exit Time</div>
                  <div className="session-kv-value">{formatDateTime(session.exitTime)}</div>
                </div>
              </div>
            </div>

            {/* Subscription + Final Fee */}
            <div className="session-grid session-grid-2">
              <div className="session-info-card">
                <div className="session-info-label">Subscription</div>
                <div className="session-subscription-pill">{subscriptionLabel}</div>
              </div>
              <div className="session-info-card">
                <div className="session-info-label">Final Fee</div>
                <div className="session-fee">{finalFeeText}</div>
              </div>
            </div>

            {/* Processing Staff */}
            <div className="session-section">
              <div className="session-section-title">Processing Staff</div>
              <div className="session-section-card">
                <div className="session-kv-row">
                  <div className="session-kv-key">Entry Processed By</div>
                  <div className="session-kv-value">
                    {session.processedByEntry || session.staff || '-'}
                  </div>
                </div>
                <div className="session-divider" />
                <div className="session-kv-row">
                  <div className="session-kv-key">Exit Processed By</div>
                  <div className="session-kv-value">{session.processedByExit || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
