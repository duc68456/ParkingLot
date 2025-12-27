import '../styles/components/ViewEntrySessionModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function ViewEntrySessionModal({ session, onClose }) {
  if (!session) return null;

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'active':
        return 'status-active';
      default:
        return '';
    }
  };

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
            <div className="detail-row">
              <span className="detail-label">Session ID:</span>
              <span className="detail-value">{session.id}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Card:</span>
              <span className="detail-value">{session.cardId}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Plate:</span>
              <span className="detail-value">{session.plate}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Entry Time:</span>
              <span className="detail-value">{session.entryTime}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Exit Time:</span>
              <span className="detail-value">{session.exitTime || '-'}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className={`status-badge ${getStatusClass(session.status)}`}>
                {session.status}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">In Subscription:</span>
              <span className="subscription-badge">
                {session.inSubscription ? 'Yes' : 'No'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Final Fee:</span>
              <span className="detail-value">${session.finalFee.toFixed(2)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Processed By Entry:</span>
              <span className="detail-value">{session.processedByEntry || session.staff}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Processed By Exit:</span>
              <span className="detail-value">{session.processedByExit || 'Sarah Manager'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
