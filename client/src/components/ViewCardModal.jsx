import '../styles/components/ViewCardModal.css';

export default function ViewCardModal({ card, onClose }) {
  if (!card) return null;

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'lost':
        return 'status-lost';
      case 'damaged':
        return 'status-damaged';
      case 'expired':
        return 'status-expired';
      default:
        return '';
    }
  };

  return (
    <div className="view-card-modal-overlay" onClick={onClose}>
      <div className="view-card-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="view-card-modal-header">
          <h3 className="view-card-modal-title">Card Details</h3>
          <button className="view-card-modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="view-card-modal-body">
          {/* Card Header Section - Icon + Info */}
          <div className="view-card-header-section">
            <div className="view-card-icon-wrapper" style={{ backgroundImage: card.gradient }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="view-card-icon">
                <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 10H22" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div className="view-card-info">
              <h3 className="view-card-uid">{card.uid}</h3>
              <p className="view-card-category">{card.type}</p>
              <span className={`view-card-status-badge ${getStatusClass(card.status)}`}>
                {card.status}
              </span>
            </div>
          </div>

          {/* Card Details Grid */}
          <div className="view-card-details-grid">
            <div className="view-card-detail-item">
              <label className="view-card-detail-label">CARD ID</label>
              <p className="view-card-detail-value view-card-detail-mono">{card.id}</p>
            </div>

            <div className="view-card-detail-item">
              <label className="view-card-detail-label">UID</label>
              <p className="view-card-detail-value view-card-detail-mono">{card.uid}</p>
            </div>

            <div className="view-card-detail-item">
              <label className="view-card-detail-label">CATEGORY</label>
              <p className="view-card-detail-value">{card.type}</p>
            </div>

            <div className="view-card-detail-item">
              <label className="view-card-detail-label">STATUS</label>
              <p className="view-card-detail-value">{card.status}</p>
            </div>

            <div className="view-card-detail-item">
              <label className="view-card-detail-label">OWNER TYPE</label>
              <p className="view-card-detail-value">{card.ownerType || '-'}</p>
            </div>

            <div className="view-card-detail-item">
              <label className="view-card-detail-label">OWNER</label>
              <p className="view-card-detail-value">{card.owner || 'Unassigned'}</p>
            </div>

            <div className="view-card-detail-item view-card-detail-full">
              <label className="view-card-detail-label">EXPIRY DATE</label>
              <p className="view-card-detail-value">{card.expiry}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
