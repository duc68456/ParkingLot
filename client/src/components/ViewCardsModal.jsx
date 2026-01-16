import '../styles/components/ViewCardsModal.css';
import { useEffect, useState } from 'react';
import AddEmployeeCardModal from './AddEmployeeCardModal';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

import vehicleIcon from '../assets/icons/vehicles.svg';
import plusIcon from '../assets/icons/common/actions/add.svg';
import listCardIcon from '../assets/icons/cards/general/cards-list.svg';

export default function ViewCardsModal({ customer, cards, onClose, loading = false, error = '' }) {
  if (!customer || !Array.isArray(cards)) return null;

  const { authHeaders } = useAuth();

  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [localCards, setLocalCards] = useState(cards);

  // Keep internal list synced with latest prop (e.g. after async fetch).
  useEffect(() => {
    let active = true;
    const initialCards = Array.isArray(cards) ? cards : [];
    setLocalCards(initialCards);

    // If we have cards and a customer ID, fetch active subscriptions to get plates
    if (initialCards.length > 0 && customer?.id) {
      const fetchSubscriptions = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/subscriptions?customerId=${customer.id}&isActive=true`, {
            headers: { ...authHeaders }
          });
          const json = await res.json().catch(() => null);

          if (active && res.ok && json?.success && Array.isArray(json?.data?.items)) {
            const subs = json.data.items;
            const subsByCardId = new Map();
            subs.forEach(s => {
              if (s.CardID && s.Vehicle) {
                // CardID object or string
                const cId = s.CardID.CardID || s.CardID;
                subsByCardId.set(cId, s.Vehicle);
              }
            });

            setLocalCards(prev => prev.map(c => {
              // Try to match by business CardID
              const cId = c.CardID || c.cardId || c.ID || c.id;
              const vehicle = subsByCardId.get(cId);
              if (vehicle) {
                return {
                  ...c,
                  plateNumber: vehicle.PlateNumber,
                  vehicleType: vehicle.VehicleTypeID?.Name || null // Optional if populated
                };
              }
              return c;
            }));
          }
        } catch (err) {
          console.error('Failed to fetch card subscriptions:', err);
        }
      };

      fetchSubscriptions();
    }

    return () => { active = false; };
  }, [cards, customer, authHeaders]);

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

  // Employee records in this app often come in as { ID: 'EMP0001', ... } without role/type.
  // Use a robust heuristic so employee cards modal shows the Add Card UI reliably.
  const isEmployeeFlow =
    (customer?.role || customer?.type || '').toLowerCase() === 'employee' ||
    String(customer?.ID || customer?.id || '').toUpperCase().startsWith('EMP');

  const handleAddCard = () => {
    if (hasActiveCard) return;
    setShowAddCardModal(true);
  };

  const handleCloseAddCardModal = () => {
    setShowAddCardModal(false);
  };

  const handleCreateCard = (payload) => {
    (async () => {
      try {
        // Employee flow contract:
        // - OwnerID must be the Person business ID (PER####)
        // - Category must be 'Staff'
        // - UID is required for staff cards (scanned at creation)
        const uidValue = String(payload?.uid || '').trim();
        if (!uidValue) throw new Error('Card UID is required');

        const ownerPersonBusinessId = String(customer?.PersonBusinessId || customer?.personBusinessId || '').trim();
        // normalizeEmployee provides personId as Mongo ObjectId, but OwnerID in Card is Person.ID (PER####).
        // So try to use a PER#### field if already present; otherwise we cannot proceed safely.
        const ownerId = /^PER\d{4}$/i.test(ownerPersonBusinessId)
          ? ownerPersonBusinessId.toUpperCase()
          : null;

        if (!ownerId) {
          throw new Error('Missing employee Person business ID (PER####) for card owner');
        }

        // Find Staff category business ID (CardCategory.ID) by name.
        const catsRes = await fetch(`${API_BASE_URL}/api/card-categories?limit=200`, {
          headers: { ...authHeaders }
        });
        const catsJson = await catsRes.json().catch(() => null);
        if (!catsRes.ok) {
          const msg = catsJson?.error?.message || `Failed to load categories (${catsRes.status})`;
          throw new Error(msg);
        }

        const cats = Array.isArray(catsJson?.data?.cardCategories) ? catsJson.data.cardCategories : [];
        const staffCat = cats.find((c) => String(c?.Name || '').trim().toLowerCase() === 'staff');
        const staffCategoryId = staffCat?.ID;
        if (!staffCategoryId) {
          throw new Error("Card category 'Staff' not found");
        }

        // Create card (server will generate CardID).
        const createRes = await fetch(`${API_BASE_URL}/api/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            CardCategoryID: staffCategoryId,
            OwnerID: ownerId,
            UID: uidValue,
            Status: 'ACTIVE',
            ExpireDay: payload?.expiryDate || null,
            UIDScannedAt: new Date().toISOString()
          })
        });
        const createJson = await createRes.json().catch(() => null);
        if (!createRes.ok) {
          const msg = createJson?.error?.message || `Create card failed (${createRes.status})`;
          throw new Error(msg);
        }

        // Refresh cards list for this employee (ownerId is PER####)
        const cardsRes = await fetch(`${API_BASE_URL}/api/cards?limit=200&ownerId=${encodeURIComponent(ownerId)}`, {
          headers: { ...authHeaders }
        });
        const cardsJson = await cardsRes.json().catch(() => null);
        if (!cardsRes.ok) {
          const msg = cardsJson?.error?.message || `Failed to refresh cards (${cardsRes.status})`;
          throw new Error(msg);
        }

        const items = Array.isArray(cardsJson?.data?.items) ? cardsJson.data.items : [];
        const normalized = items.map((c) => {
          const categoryName = c?.CardCategoryID?.Name || c?.CardCategoryID?.ID || c?.CardCategoryID;
          const rawStatus = String(c?.Status || '');
          const status = rawStatus
            ? rawStatus.charAt(0) + rawStatus.slice(1).toLowerCase().replace(/_(.)/g, (_, ch) => ` ${ch.toUpperCase()}`)
            : '-';

          const expiryDate = c?.ExpireDay
            ? (() => {
              const d = new Date(c.ExpireDay);
              if (Number.isNaN(d.getTime())) return '-';
              return d.toLocaleDateString('en-GB');
            })()
            : '-';

          return {
            cardId: c?.CardID || c?.id || c?._id,
            uid: c?.UID,
            status,
            expiryDate,
            category: categoryName || '-'
          };
        });

        setLocalCards(normalized);
        handleCloseAddCardModal();
      } catch (err) {
        console.error('Create employee card error:', err);
        window.alert(err?.message || 'Failed to create employee card');
      }
    })();
  };

  const formatExpiryDate = (value) => {
    if (!value || value === '-') return '-';
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('en-GB');
    return String(value);
  };

  const getCardDisplayId = (card) => card?.cardId || card?.CardID || card?.ID || card?.id || '-';
  const getUid = (card) => card?.uid || card?.UID || card?.Uid || '-';
  const getPlate = (card) => card?.plateNumber || card?.vehiclePlate || card?.plate || card?.PlateNumber || '';
  const getVehicleType = (card) => card?.vehicleType || card?.type || card?.VehicleType || '';

  return (
    <>
      {!showAddCardModal && (
        <>
          <div className="view-cards-overlay" onClick={handleOverlayClick}></div>
          <div className="view-cards-modal-wrapper">
            <div className={`view-cards-modal ${isEmployeeFlow ? 'view-cards-modal--employee' : ''}`}>
              <div className="view-cards-header">
                <h3 className="view-cards-title">Cards ({localCards.length}) - {customer.name}</h3>
                <button className="view-cards-close-btn" onClick={onClose}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
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
                  <div className="view-cards-employee-topbar">
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

                {loading ? (
                  <div className="view-cards-empty">
                    <p className="view-cards-empty-title">Loading cards...</p>
                  </div>
                ) : error ? (
                  <div className="view-cards-empty">
                    <p className="view-cards-empty-title">{error}</p>
                  </div>
                ) : localCards.length === 0 ? (
                  <div className={`view-cards-empty ${isEmployeeFlow ? 'view-cards-empty--employee' : ''}`}>
                    <div className="view-cards-empty-icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M2 10H22" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
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
                      const cardId = getCardDisplayId(card);
                      const uid = getUid(card);
                      const expiryDate = formatExpiryDate(card.expiryDate || card.expiry || card.ExpiryDate);
                      const plate = getPlate(card);
                      const vehicleType = getVehicleType(card);

                      return (
                        <div key={`${cardId}-${index}`} className={`view-cards-card ${plate ? 'view-cards-card--with-plate' : ''}`}>
                          <div className="view-cards-card-left">
                            <div className="view-cards-card-icon" aria-hidden="true">
                              <img src={listCardIcon} alt="" />
                            </div>

                            <div className="view-cards-card-main">
                              <div className="view-cards-card-line">
                                <span className="view-cards-card-label">Card ID:</span>
                                <span className="view-cards-card-mono">{cardId}</span>
                              </div>
                              <div className="view-cards-card-subline">
                                <span className="view-cards-card-subLabel">UID:</span>
                                <span className="view-cards-card-subMono">{uid}</span>
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

                          <div className="view-cards-card-right">
                            <div className="view-cards-card-meta">
                              <div className="view-cards-card-metaLabel">Status</div>
                              <span className={`view-cards-status-badge ${getStatusClass(card.status)}`}>
                                {card.status || '-'}
                              </span>
                            </div>
                            <div className="view-cards-card-meta">
                              <div className="view-cards-card-metaLabel">Expiry</div>
                              <div className="view-cards-card-expiry">{expiryDate}</div>
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
