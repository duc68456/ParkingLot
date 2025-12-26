import '../styles/components/ViewCardsModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const cardIcon = "http://localhost:3845/assets/923d46cce1e4af18f527473ac71c6e5e36154ca6.svg";
const vehicleIcon = "http://localhost:3845/assets/8c8ebc739042e975e5552a2edeb4a45061f5e4ea.svg";

export default function ViewCardsModal({ customer, cards, onClose }) {
  if (!customer || !cards) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStatusClass = (status) => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'active') return 'view-cards-status-active';
    if (statusLower === 'damaged') return 'view-cards-status-damaged';
    if (statusLower === 'inactive') return 'view-cards-status-inactive';
    return 'view-cards-status-default';
  };

  return (
    <>
      <div className="view-cards-overlay" onClick={handleOverlayClick}></div>
      <div className="view-cards-modal-wrapper">
        <div className="view-cards-modal">
          <div className="view-cards-header">
            <h3 className="view-cards-title">Cards - {customer.name}</h3>
            <button className="view-cards-close-btn" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="view-cards-body">
            <div className="view-cards-list">
              {cards.map((card, index) => (
                <div key={card.cardId || index} className="view-cards-item">
                  <div className="view-cards-item-left">
                    <div className="view-cards-icon">
                      <img src={cardIcon} alt="Card" />
                    </div>
                    <div className="view-cards-info">
                      <div className="view-cards-row">
                        <span className="view-cards-label">Card ID:</span>
                        <span className="view-cards-value">{card.cardId}</span>
                      </div>
                      <div className="view-cards-row">
                        <span className="view-cards-uid-label">UID:</span>
                        <span className="view-cards-uid-value">{card.uid}</span>
                      </div>
                      {card.licensePlate && (
                        <div className="view-cards-vehicle-badge">
                          <img src={vehicleIcon} alt="Vehicle" className="view-cards-vehicle-icon" />
                          <span className="view-cards-vehicle-plate">{card.licensePlate}</span>
                          <span className="view-cards-vehicle-type">({card.vehicleType})</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="view-cards-item-right">
                    <div className="view-cards-status-container">
                      <span className="view-cards-status-label">Status</span>
                      <span className={`view-cards-status-badge ${getStatusClass(card.status)}`}>
                        {card.status}
                      </span>
                    </div>
                    <div className="view-cards-expiry-container">
                      <span className="view-cards-expiry-label">Expiry</span>
                      <span className="view-cards-expiry-date">{card.expiryDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
