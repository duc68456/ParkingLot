import '../styles/components/ViewCardModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const cardIcon = "http://localhost:3845/assets/2008ec9e3ba7dda5340ecb3da13eded4b691a341.svg";

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
            <img src={closeIcon} alt="Close" width="20" height="20" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="view-card-modal-body">
          {/* Card Header Section - Icon + Info */}
          <div className="view-card-header-section">
            <div className="view-card-icon-wrapper" style={{ backgroundImage: card.gradient }}>
              <img src={cardIcon} alt="Card" className="view-card-icon" />
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
