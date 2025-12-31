import '../styles/components/ViewCardsModal.css';
import { useState } from 'react';
import AddEmployeeCardModal from './AddEmployeeCardModal';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const cardIcon = "http://localhost:3845/assets/923d46cce1e4af18f527473ac71c6e5e36154ca6.svg";
const vehicleIcon = "http://localhost:3845/assets/8c8ebc739042e975e5552a2edeb4a45061f5e4ea.svg";
const plusIcon = "http://localhost:3845/assets/10fef702e521cd978007cbf6b09f2fa3cf287e8a.svg";

export default function ViewCardsModal({ customer, cards, onClose }) {
  if (!customer || !Array.isArray(cards)) return null;

  const [showAddCardModal, setShowAddCardModal] = useState(false);

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

  const handleAddCard = () => {
    setShowAddCardModal(true);
  };

  const handleCloseAddCardModal = () => {
    setShowAddCardModal(false);
  };

  const handleCreateCard = (payload) => {
    // TODO: Wire to backend/API. For now just log for visibility.
    console.log('Create & assign card:', payload);
    handleCloseAddCardModal();
    // In the real flow we'd refresh cards. For now, we keep the cards modal visible
    // again after creating (per the requested UX).
  };

  return (
    <>
      {!showAddCardModal && (
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
                <div className="view-cards-toolbar">
                  <button className="view-cards-add-btn" onClick={handleAddCard}>
                    <img className="view-cards-add-icon" src={plusIcon} alt="" aria-hidden="true" />
                    Add Card
                  </button>
                </div>
                {cards.length === 0 ? (
                  <div className="view-cards-empty">
                    <div className="view-cards-empty-icon" aria-hidden="true">
                      <img src={cardIcon} alt="" />
                    </div>
                    <p className="view-cards-empty-title">No cards found for this employee</p>
                    <p className="view-cards-empty-subtitle">Click "Add Card" above to create one</p>
                  </div>
                ) : (
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
                                <img
                                  src={vehicleIcon}
                                  alt="Vehicle"
                                  className="view-cards-vehicle-icon"
                                />
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
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showAddCardModal && (
        <AddEmployeeCardModal
          employee={customer}
          onBackToCards={handleCloseAddCardModal}
          onClose={handleCloseAddCardModal}
          onCreate={handleCreateCard}
        />
      )}
    </>
  );
}
