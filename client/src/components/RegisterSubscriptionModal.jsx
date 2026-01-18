import React, { useMemo, useRef, useState, useEffect } from 'react';
import '../styles/components/RegisterSubscriptionModal.css';
import { useAuth } from '../contexts/AuthContext';
import AddVehicleModal from './AddVehicleModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const addDaysIso = (startIso, days) => {
  if (!startIso || !days) return '';
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
};

function RegisterSubscriptionModal({ onClose, onRegister, defaultCard = null }) {
  const { authHeaders } = useAuth();

  const [cardId, setCardId] = useState(defaultCard?.CardID || defaultCard?.id || '');
  const [vehicleId, setVehicleId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [price, setPrice] = useState('0.00');
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');

  const [subscriptionTypes, setSubscriptionTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Async search - cards
  const [cardQuery, setCardQuery] = useState('');
  const [cardResults, setCardResults] = useState([]);
  const [cardOpen, setCardOpen] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const cardReqId = useRef(0);

  // Async search - vehicles
  const [vehicleQuery, setVehicleQuery] = useState('');
  const [vehicleResults, setVehicleResults] = useState([]);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const vehicleReqId = useRef(0);

  // Add vehicle modal
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  // Latest items for initial display (5 most recent)
  const [latestCards, setLatestCards] = useState([]);
  const [latestVehicles, setLatestVehicles] = useState([]);

  const cardSelected = useMemo(
    () => {
      if (!cardId) return null;
      // If defaultCard provided and matches, use it (normalized)
      if (defaultCard && (defaultCard.CardID === cardId || defaultCard.id === cardId)) {
        return {
          id: defaultCard.CardID || defaultCard.id,
          uid: defaultCard.UID || defaultCard.uid,
          category: defaultCard.CardCategoryName || defaultCard.category || '',
          categoryId: defaultCard.CardCategoryID || defaultCard.categoryId || ''
        };
      }
      return cardResults.find(r => r.id === cardId) || null;
    },
    [cardId, cardResults, defaultCard]
  );
  const vehicleSelected = useMemo(
    () => (vehicleId ? vehicleResults.find(r => r.id === vehicleId) || null : null),
    [vehicleId, vehicleResults]
  );

  const selectedType = useMemo(
    () => (subscriptionType ? subscriptionTypes.find(t => t.id === subscriptionType) || null : null),
    [subscriptionType, subscriptionTypes]
  );

  // Set today's date on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  // Load subscription types, vehicle types, and 5 latest cards/vehicles on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        // Fetch subscription types
        const typesRes = await fetch(`${API_BASE_URL}/api/subscription-types?limit=200`, { headers: { ...authHeaders } });
        const typesJson = await typesRes.json().catch(() => null);
        if (!typesRes.ok) throw new Error(typesJson?.error?.message || `Failed to load subscription types (${typesRes.status})`);
        const typesItems = Array.isArray(typesJson?.data?.items) ? typesJson.data.items : [];

        // Fetch vehicle types (for AddVehicleModal)
        const vTypesRes = await fetch(`${API_BASE_URL}/api/vehicle-types?limit=50`, { headers: { ...authHeaders } });
        const vTypesJson = await vTypesRes.json().catch(() => null);
        const vTypesItems = Array.isArray(vTypesJson?.data?.vehicleTypes) ? vTypesJson.data.vehicleTypes : [];

        // Fetch 5 latest cards without subscriptions (only available cards)
        const cardsRes = await fetch(`${API_BASE_URL}/api/cards?limit=5&hasSubscription=false`, { headers: { ...authHeaders } });
        const cardsJson = await cardsRes.json().catch(() => null);
        let cardsItems = Array.isArray(cardsJson?.data?.items) ? cardsJson.data.items : [];

        // Fallback: if hasSubscription filter not supported by backend, fetch all cards and filter client-side
        // by checking if card has subscription
        if (cardsItems.length === 0 && !cardsJson?.data?.filtered) {
          // Fetch subscriptions to get list of CardIDs that already have subscriptions
          const subsRes = await fetch(`${API_BASE_URL}/api/subscriptions?limit=1000`, { headers: { ...authHeaders } });
          const subsJson = await subsRes.json().catch(() => null);
          const subsItems = Array.isArray(subsJson?.data?.items) ? subsJson.data.items : [];
          const cardsWithSubs = new Set(subsItems.map(s => s.CardID));

          // Fetch all cards and filter
          const allCardsRes = await fetch(`${API_BASE_URL}/api/cards?limit=100`, { headers: { ...authHeaders } });
          const allCardsJson = await allCardsRes.json().catch(() => null);
          const allCardsItems = Array.isArray(allCardsJson?.data?.items) ? allCardsJson.data.items : [];
          cardsItems = allCardsItems.filter(c => !cardsWithSubs.has(c?.CardID)).slice(0, 5);
        }

        // Latest 5 cards (without subscriptions)
        setLatestCards(
          cardsItems.map((c) => ({
            id: c?.CardID,
            uid: c?.UID,
            category: c?.CardCategoryID?.Name || c?.CardCategoryID?.name || '',
            categoryId: c?.CardCategoryID?.ID || c?.CardCategoryID?.id || ''
          })).filter((c) => c.id)
        );

        // Fetch 5 latest vehicles (sorted by createdAt desc)
        const vehiclesRes = await fetch(`${API_BASE_URL}/api/vehicles?limit=5`, { headers: { ...authHeaders } });
        const vehiclesJson = await vehiclesRes.json().catch(() => null);
        const vehiclesItems = Array.isArray(vehiclesJson?.data?.items) ? vehiclesJson.data.items : [];

        if (cancelled) return;

        // types: store business ID and duration; price may not exist in type schema
        setSubscriptionTypes(
          typesItems.map((t) => ({
            id: t?.ID,
            name: t?.TypeName,
            duration: Number(t?.DurationDays) || 0,
            price: Number(t?.Price) || null
          })).filter((t) => t.id)
        );

        // Vehicle types for AddVehicleModal
        setVehicleTypes(
          vTypesItems.map((vt) => ({
            id: vt?.VehicleTypeID || vt?.id,
            name: vt?.Name || vt?.name,
            IsActive: vt?.IsActive ?? true
          })).filter((vt) => vt.id)
        );

        // Latest 5 vehicles
        setLatestVehicles(
          vehiclesItems.map((v) => ({
            id: v?.VehicleID,
            plate: v?.PlateNumber,
            typeName: v?.VehicleType?.Name || v?.VehicleType?.name || '',
            typeId: v?.VehicleType?.VehicleTypeID || v?.VehicleType?.id || ''
          })).filter((v) => v.id)
        );
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load dropdown data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  // Search cards (async) - show latest 5 when no query
  useEffect(() => {
    const q = String(cardQuery || '').trim();
    if (!cardOpen) return;

    // If no query or too short, show latest cards
    if (q.length < 2) {
      setCardResults(latestCards);
      setCardLoading(false);
      return;
    }

    const thisReq = ++cardReqId.current;
    setCardLoading(true);

    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ search: q, limit: '20', hasSubscription: 'false' });
        const res = await fetch(`${API_BASE_URL}/api/cards?${qs.toString()}`, { headers: { ...authHeaders } });
        const json = await res.json().catch(() => null);
        if (thisReq !== cardReqId.current) return;
        if (!res.ok) throw new Error(json?.error?.message || `Failed to search cards (${res.status})`);
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        setCardResults(
          items.map((c) => ({
            id: c?.CardID,
            uid: c?.UID,
            category: c?.CardCategoryID?.Name || c?.CardCategoryID?.name || '',
            categoryId: c?.CardCategoryID?.ID || c?.CardCategoryID?.id || ''
          })).filter((c) => c.id)
        );
      } catch (e) {
        if (thisReq !== cardReqId.current) return;
        setCardResults([]);
      } finally {
        if (thisReq === cardReqId.current) setCardLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [cardQuery, cardOpen, authHeaders, latestCards]);

  // Search vehicles (async) - show latest 5 when no query
  useEffect(() => {
    const q = String(vehicleQuery || '').trim();
    if (!vehicleOpen) return;

    // If no query or too short, show latest vehicles
    if (q.length < 2) {
      setVehicleResults(latestVehicles);
      setVehicleLoading(false);
      return;
    }

    const thisReq = ++vehicleReqId.current;
    setVehicleLoading(true);

    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ search: q, limit: '20' });
        const res = await fetch(`${API_BASE_URL}/api/vehicles?${qs.toString()}`, { headers: { ...authHeaders } });
        const json = await res.json().catch(() => null);
        if (thisReq !== vehicleReqId.current) return;
        if (!res.ok) throw new Error(json?.error?.message || `Failed to search vehicles (${res.status})`);
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];
        setVehicleResults(
          items.map((v) => ({
            id: v?.VehicleID,
            plate: v?.PlateNumber,
            typeName: v?.VehicleType?.Name || v?.VehicleType?.name || '',
            typeId: v?.VehicleType?.VehicleTypeID || v?.VehicleType?.id || ''
          })).filter((v) => v.id)
        );
      } catch (e) {
        if (thisReq !== vehicleReqId.current) return;
        setVehicleResults([]);
      } finally {
        if (thisReq === vehicleReqId.current) setVehicleLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [vehicleQuery, vehicleOpen, authHeaders, latestVehicles]);

  // Calculate end date and price when subscription type changes
  useEffect(() => {
    if (subscriptionType && startDate) {
      if (selectedType) {
        setEndDate(addDaysIso(startDate, selectedType.duration));
      }
    }
  }, [subscriptionType, startDate, selectedType]);

  // Derive VehicleTypeID from selected vehicle
  useEffect(() => {
    if (!vehicleId) {
      setVehicleTypeId('');
      return;
    }

    const t = vehicleSelected?.typeId || '';
    setVehicleTypeId(t);
  }, [vehicleId, vehicleSelected]);

  // Derive CustomerID from selected card (best-effort)
  useEffect(() => {
    // Clear if no card selected
    if (!cardId) {
      setCustomerId('');
      return;
    }

    const derive = async () => {
      try {
        // Prefer reading customer directly from the selected card if present
        const immediate = cardSelected?.customerId || '';
        if (immediate) {
          setCustomerId(immediate);
          return;
        }

        // Fallback: fetch card by id and derive customer business ID if API includes it
        const res = await fetch(`${API_BASE_URL}/api/cards/${encodeURIComponent(cardId)}`, {
          headers: { ...authHeaders }
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) return;

        // Common shapes we've used elsewhere: CustomerID (business string) or populated customer with ID.
        const derived =
          json?.data?.CustomerID?.ID ||
          json?.data?.CustomerID?.id ||
          json?.data?.CustomerID ||
          json?.data?.customerId ||
          '';

        setCustomerId(String(derived || ''));
      } catch {
        // If derivation fails, keep customerId empty; subscription can still be registered without a customer.
        setCustomerId('');
      }
    };

    derive();
  }, [cardId, cardSelected, authHeaders]);

  // Load current subscription price based on (card category + vehicle type + subscription type)
  useEffect(() => {
    let cancelled = false;

    const loadCurrentPrice = async () => {
      setPriceError('');

      // Require the core inputs
      if (!subscriptionType || !vehicleTypeId) {
        setPrice('0.00');
        return;
      }

      // Card category is needed for subscription pricing rule; derive from selected card
      const cardCategoryId = cardSelected?.categoryId || '';
      if (!cardCategoryId) {
        setPrice('0.00');
        return;
      }

      setPriceLoading(true);

      try {
        const ruleRes = await fetch(
          `${API_BASE_URL}/api/subscription-pricing-rules/find/${encodeURIComponent(cardCategoryId)}/${encodeURIComponent(vehicleTypeId)}/${encodeURIComponent(subscriptionType)}`,
          { headers: { ...authHeaders } }
        );
        const ruleJson = await ruleRes.json().catch(() => null);
        if (!ruleRes.ok) {
          const msg = ruleJson?.error?.message || `Failed to find pricing rule (${ruleRes.status})`;
          throw new Error(msg);
        }

        const ruleBusinessId = ruleJson?.data?.ID || ruleJson?.data?.id;
        if (!ruleBusinessId) throw new Error('Pricing rule not found');

        const curRes = await fetch(
          `${API_BASE_URL}/api/subscription-pricing-rule-details/current/${encodeURIComponent(ruleBusinessId)}`,
          { headers: { ...authHeaders } }
        );
        const curJson = await curRes.json().catch(() => null);
        if (!curRes.ok) {
          const msg = curJson?.error?.message || `Failed to load current price (${curRes.status})`;
          throw new Error(msg);
        }

        const p = Number(curJson?.data?.Price);
        if (!Number.isFinite(p)) throw new Error('Invalid price returned');
        if (cancelled) return;
        setPrice(p.toFixed(2));
      } catch (e) {
        if (cancelled) return;
        setPrice('0.00');
        setPriceError(e?.message || 'Failed to load price');
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    };

    loadCurrentPrice();

    return () => {
      cancelled = true;
    };
  }, [subscriptionType, vehicleTypeId, cardSelected, authHeaders]);

  const handleSubmit = () => {
    if (!cardId || !vehicleId || !subscriptionType) {
      alert('Please fill in all required fields');
      return;
    }

    if (!vehicleTypeId) {
      alert('Please select a vehicle that has a vehicle type');
      return;
    }

    if (priceLoading) {
      alert('Price is still loading. Please wait a moment.');
      return;
    }

    if (priceError || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      alert(priceError || 'No valid price found for this subscription type');
      return;
    }

    const selectedCard = cardResults.find(c => c.id === cardId) || cardSelected;
    const selectedVehicle = vehicleResults.find(v => v.id === vehicleId) || vehicleSelected;

    const newSubscription = {
      id: `SUB${String(Date.now()).slice(-3)}`,
      cardId,
      vehicleId,
      customerId: customerId || undefined,
      subscriptionTypeId: subscriptionType,
      vehicleTypeId,
      vehiclePlate: selectedVehicle?.plate,
      customerName: customerId || '—',
      type: selectedType?.name,
      startDate,
      endDate,
      price: parseFloat(price),
      startDateRaw: startDate,
      status: 'Active'
    };

    onRegister(newSubscription);
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'register-subscription-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="register-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="register-subscription-modal">
        {/* Header */}
        <div className="register-subscription-modal-header">
          <h3>Register Subscription</h3>
          <button className="register-subscription-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="register-subscription-modal-content">
          {/* Info box */}
          <div className="register-subscription-info-box">
            <p className="register-subscription-info-title">New Subscription Registration</p>
            <p className="register-subscription-info-description">
              Fill in the required information to register a new subscription
            </p>
          </div>

          {/* Form fields */}
          <div className="register-subscription-form">
            {error ? (
              <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{error}</div>
            ) : null}
            {/* Card ID */}
            <div className="register-subscription-field">
              <label>
                Card ID <span className="required">*</span>
              </label>
              <div className="register-subscription-async">
                {cardId ? (
                  <div className="register-subscription-selected-pill">
                    <span>
                      {cardId}
                      {cardSelected?.uid ? ` - ${cardSelected.uid}` : ''}
                      {cardSelected?.category ? ` (${cardSelected.category})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setCardId('');
                        setCardQuery('');
                        setCardResults([]);
                        setCardOpen(false);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={cardQuery}
                      onChange={(e) => {
                        setCardQuery(e.target.value);
                        setCardOpen(true);
                      }}
                      onFocus={() => setCardOpen(true)}
                      onBlur={() => setTimeout(() => setCardOpen(false), 150)}
                      className="register-subscription-search-input"
                      placeholder="Search card ID or UID..."
                      disabled={loading}
                    />

                    {cardOpen ? (
                      <div className="register-subscription-async-list">
                        {cardLoading ? (
                          <div className="register-subscription-async-empty">Searching…</div>
                        ) : cardResults.length === 0 ? (
                          <div className="register-subscription-async-empty">
                            {cardQuery.trim().length >= 2 ? 'No results' : 'No cards available'}
                          </div>
                        ) : (
                          <>
                            {cardQuery.trim().length < 2 && (
                              <div className="register-subscription-async-header">Recent Cards</div>
                            )}
                            {cardResults.map((c) => (
                              <button
                                type="button"
                                key={c.id}
                                className="register-subscription-async-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setCardId(c.id);
                                  setCardOpen(false);
                                }}
                              >
                                <div className="register-subscription-async-item-title">{c.id}{c.uid ? ` - ${c.uid}` : ''}</div>
                                <div className="register-subscription-async-item-subtitle">{c.category || '—'}</div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Vehicle ID */}
            <div className="register-subscription-field">
              <label>
                Vehicle ID <span className="required">*</span>
              </label>
              <div className="register-subscription-async">
                {vehicleId ? (
                  <div className="register-subscription-selected-pill">
                    <span>
                      {vehicleId}
                      {vehicleSelected?.plate ? ` - ${vehicleSelected.plate}` : ''}
                      {vehicleSelected?.typeName ? ` (${vehicleSelected.typeName})` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVehicleId('');
                        setVehicleQuery('');
                        setVehicleResults([]);
                        setVehicleOpen(false);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={vehicleQuery}
                      onChange={(e) => {
                        setVehicleQuery(e.target.value);
                        setVehicleOpen(true);
                      }}
                      onFocus={() => setVehicleOpen(true)}
                      onBlur={() => setTimeout(() => setVehicleOpen(false), 150)}
                      className="register-subscription-search-input"
                      placeholder="Search vehicle ID or plate..."
                      disabled={loading}
                    />

                    {vehicleOpen ? (
                      <div className="register-subscription-async-list">
                        {vehicleLoading ? (
                          <div className="register-subscription-async-empty">Searching…</div>
                        ) : vehicleResults.length === 0 ? (
                          <>
                            <div className="register-subscription-async-empty">
                              {vehicleQuery.trim().length >= 2 ? 'No results' : 'No vehicles available'}
                            </div>
                            <button
                              type="button"
                              className="register-subscription-async-add-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setVehicleOpen(false);
                                setShowAddVehicle(true);
                              }}
                            >
                              + Add New Vehicle
                            </button>
                          </>
                        ) : (
                          <>
                            {vehicleQuery.trim().length < 2 && (
                              <div className="register-subscription-async-header">Recent Vehicles</div>
                            )}
                            {vehicleResults.map((v) => (
                              <button
                                type="button"
                                key={v.id}
                                className="register-subscription-async-item"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setVehicleId(v.id);
                                  setVehicleOpen(false);
                                }}
                              >
                                <div className="register-subscription-async-item-title">{v.id}{v.plate ? ` - ${v.plate}` : ''}</div>
                                <div className="register-subscription-async-item-subtitle">{v.typeName || '—'}</div>
                              </button>
                            ))}
                            <button
                              type="button"
                              className="register-subscription-async-add-btn"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setVehicleOpen(false);
                                setShowAddVehicle(true);
                              }}
                            >
                              + Add New Vehicle
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* Subscription Type */}
            <div className="register-subscription-field">
              <label>
                Subscription Type <span className="required">*</span>
              </label>
              <select
                value={subscriptionType}
                onChange={(e) => setSubscriptionType(e.target.value)}
                className="register-subscription-dropdown"
                disabled={loading}
              >
                <option value="">Select type...</option>
                {subscriptionTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.duration} days)
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="register-subscription-field">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="register-subscription-date-picker"
              />
              <p className="register-subscription-field-hint">Auto-set to today's date</p>
            </div>

            {/* End Date */}
            <div className="register-subscription-field">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                readOnly
                className="register-subscription-date-picker"
              />
              <p className="register-subscription-field-hint">
                {subscriptionType ? 'Calculated based on subscription type' : 'Select a subscription type to calculate'}
              </p>
            </div>

            {/* Price */}
            <div className="register-subscription-field">
              <label>Price</label>
              <div className="register-subscription-price-input">
                <span className="register-subscription-dollar-sign">$</span>
                <input
                  type="text"
                  value={price}
                  readOnly
                  className="register-subscription-price-field"
                />
              </div>
              <p className="register-subscription-field-hint">
                {priceLoading
                  ? 'Loading current price…'
                  : subscriptionType
                    ? (priceError ? `Price unavailable: ${priceError}` : 'Current active price based on pricing rules')
                    : 'Select a subscription type to calculate price'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="register-subscription-modal-footer">
          <button className="register-subscription-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="register-subscription-submit-button" onClick={handleSubmit}>
            Register Subscription
          </button>
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <AddVehicleModal
          vehicleTypes={vehicleTypes}
          onClose={() => setShowAddVehicle(false)}
          onSave={async (vehicleData) => {
            try {
              // Find vehicle type ID from name
              const vehicleType = vehicleTypes.find(vt => vt.name === vehicleData.type);

              const res = await fetch(`${API_BASE_URL}/api/vehicles`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders
                },
                body: JSON.stringify({
                  PlateNumber: vehicleData.licensePlate,
                  VehicleTypeID: vehicleType?.id,
                  Color: vehicleData.color
                })
              });

              const json = await res.json().catch(() => null);

              if (!res.ok) {
                throw new Error(json?.error?.message || 'Failed to create vehicle');
              }

              const newVehicle = json?.data;
              const newVehicleId = newVehicle?.VehicleID;

              // Refresh latest vehicles
              const refreshRes = await fetch(`${API_BASE_URL}/api/vehicles?limit=5`, { headers: { ...authHeaders } });
              const refreshJson = await refreshRes.json().catch(() => null);
              const refreshItems = Array.isArray(refreshJson?.data?.items) ? refreshJson.data.items : [];

              setLatestVehicles(
                refreshItems.map((v) => ({
                  id: v?.VehicleID,
                  plate: v?.PlateNumber,
                  typeName: v?.VehicleType?.Name || v?.VehicleType?.name || '',
                  typeId: v?.VehicleType?.VehicleTypeID || v?.VehicleType?.id || ''
                })).filter((v) => v.id)
              );

              // Auto-select the new vehicle
              if (newVehicleId) {
                setVehicleId(newVehicleId);
                // Add to results so vehicleSelected can find it
                setVehicleResults(prev => [{
                  id: newVehicleId,
                  plate: newVehicle?.PlateNumber,
                  typeName: vehicleType?.name || '',
                  typeId: vehicleType?.id || ''
                }, ...prev]);
              }

              setShowAddVehicle(false);
            } catch (err) {
              alert(err?.message || 'Failed to create vehicle');
            }
          }}
        />
      )}
    </div>
  );
}

export default RegisterSubscriptionModal;
