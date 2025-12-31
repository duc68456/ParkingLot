import '../styles/components/ViewCardsModal.css';
import { useState } from 'react';
import AddEmployeeCardModal from './AddEmployeeCardModal';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const cardIcon = "http://localhost:3845/assets/923d46cce1e4af18f527473ac71c6e5e36154ca6.svg";
const vehicleIcon = "http://localhost:3845/assets/8c8ebc739042e975e5552a2edeb4a45061f5e4ea.svg";
const plusIcon = "http://localhost:3845/assets/10fef702e521cd978007cbf6b09f2fa3cf287e8a.svg";
const listCardIcon = "http://localhost:3845/assets/037bbde1a147a4d17c55cfd547055d79a35649cb.svg";

export default function ViewCardsModal({ customer, cards, onClose }) {
  if (!customer || !Array.isArray(cards)) return null;

  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [localCards, setLocalCards] = useState(cards);

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

  const hasActiveCard = localCards.some((c) => (c.status || '').toLowerCase() === 'active');

  const isEmployeeFlow = (customer?.role || customer?.type || '').toLowerCase() === 'employee';

  const handleAddCard = () => {
    if (hasActiveCard) return;
    setShowAddCardModal(true);
  };

  const handleCloseAddCardModal = () => {
    setShowAddCardModal(false);
  };

  const handleCreateCard = (payload) => {
    // TODO: Wire to backend/API. For now just log for visibility.
    console.log('Create & assign card:', payload);

    // Update list immediately so the new card shows up when returning to the list.
    const nextCardId = `CARD-${String(localCards.length + 1).padStart(3, '0')}`;
    const expiryDate = payload.expiryDate
      ? new Date(payload.expiryDate).toLocaleDateString('en-GB')
      : '-';

    setLocalCards((prev) => [
      ...prev,
      {
        cardId: nextCardId,
        uid: payload.uid,
        status: payload.status || 'Active',
        expiryDate
      }
    ]);

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
                {isEmployeeFlow && hasActiveCard && (
                  <div className="employee-card-warning">
                    <div className="employee-card-warning-icon" aria-hidden="true">
                      !
                    </div>
                    <div className="employee-card-warning-content">
                      <div className="employee-card-warning-title">Active Card Exists</div>
                      <div className="employee-card-warning-subtitle">
                        This employee already has an active card. New cards can only be created for employees without active cards.
                      </div>
                    </div>
                  </div>
                )}

                {isEmployeeFlow && (
                  <div className="view-cards-toolbar">
                    <button
                      className="view-cards-add-btn"
                      onClick={handleAddCard}
                      disabled={hasActiveCard}
                    >
                      <img className="view-cards-add-icon" src={plusIcon} alt="" aria-hidden="true" />
                      Add Card
                    </button>
                  </div>
                )}

                {localCards.length === 0 ? (
                  <div className="view-cards-empty">
                    <div className="view-cards-empty-icon" aria-hidden="true">
                      <img src={cardIcon} alt="" />
                    </div>
                    <p className="view-cards-empty-title">
                      {isEmployeeFlow ? 'No cards found for this employee' : 'No cards found for this customer'}
                    </p>
                    {isEmployeeFlow && (
                      <p className="view-cards-empty-subtitle">Click "Add Card" above to create one</p>
                    )}
                  </div>
                ) : (
                  <div className="view-cards-list">
                    {localCards.map((card, index) => {
                      const cardId = card.cardId || card.id || '-';
                      const uid = card.uid || '-';
                      const expiryDate = card.expiryDate || card.expiry || '-';
                      const plate = card.plateNumber || card.vehiclePlate || card.plate || '';
                      const vehicleType = card.vehicleType || card.type || '';

                      return (
                        <div key={cardId || index} className="view-cards-item">
                          <div className="view-cards-item-left">
                            <div className="view-cards-icon" aria-hidden="true">
                              <img src={listCardIcon} alt="" />
                            </div>

                            <div className="view-cards-info">
                              <div className="view-cards-row">
                                <span className="view-cards-label">Card ID:</span>
                                <span className="view-cards-value">{cardId}</span>
                              </div>
                              <div className="view-cards-row">
                                <span className="view-cards-uid-label">UID:</span>
                                <span className="view-cards-uid-value">{uid}</span>
                              </div>

                              {plate && (
                                <div className="view-cards-vehicle-badge">
                                  <img className="view-cards-vehicle-icon" src={vehicleIcon} alt="" aria-hidden="true" />
                                  <span className="view-cards-vehicle-plate">{plate}</span>
                                  {vehicleType && (
                                    <span className="view-cards-vehicle-type">({vehicleType})</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="view-cards-item-right">
                            <div className="view-cards-status-container">
                              <div className="view-cards-status-label">Status</div>
                              <span className={`view-cards-status-badge ${getStatusClass(card.status)}`}>
                                {card.status || '-'}
                              </span>
                            </div>

                            <div className="view-cards-expiry-container">
                              <div className="view-cards-expiry-label">Expiry</div>
                              <div className="view-cards-expiry-date">{expiryDate}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
