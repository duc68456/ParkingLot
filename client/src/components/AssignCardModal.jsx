import { useEffect, useMemo, useState } from 'react';
import '../styles/components/AssignCardModal.css';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const cardIcon = "http://localhost:3845/assets/016247162025cce483fc4b098b7f2094b688d944.svg";

function AssignCardModal({ card, onClose, onAssign, defaultAssignType = '', defaultPersonId = '' }) {
  const { authHeaders } = useAuth();
  // Figma 241:1604 uses a single dropdown listing both customers and employees.
  // We keep internal compatibility with the old onAssign({type, personId}) shape.
  const initialAssignKey = useMemo(() => {
    if (!defaultPersonId || !defaultAssignType) return '';
    return `${defaultAssignType}:${String(defaultPersonId)}`;
  }, [defaultAssignType, defaultPersonId]);

  const [selectedAssignKey, setSelectedAssignKey] = useState(initialAssignKey);

  const [cardUid, setCardUid] = useState('');

  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setPeopleLoading(true);
        setPeopleError('');

        const custRes = await fetch(`${API_BASE_URL}/api/customers?limit=200`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const custJson = await custRes.json().catch(() => null);

        if (!custRes.ok) {
          const msg = custJson?.error?.message || `Failed to fetch customers (${custRes.status})`;
          throw new Error(msg);
        }
        const custList = Array.isArray(custJson?.data?.customers) ? custJson.data.customers : [];

        // Normalize into { id: PERSON_ID, name: FULL_NAME, type }
        setCustomers(
          custList
            .map((c) => {
              const p = c?.PersonID;
              return {
                id: p?.ID ?? p?._id ?? c?.PersonID,
                name: p?.FullName ?? 'Unknown',
                type: 'Customer'
              };
            })
            .filter((x) => !!x.id)
        );
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch people error:', err);
          setPeopleError(err?.message || 'Failed to load people');
          setCustomers([]);
        }
      } finally {
        if (!controller.signal.aborted) setPeopleLoading(false);
      }
    })();

    return () => controller.abort();
  }, [authHeaders]);

  // Keep the UID field prefilled when opening the modal or when card changes.
  useEffect(() => {
    const nextUid = String(card?.uid || card?.UID || card?.Uid || '').trim();
    // When purchasing cards, UID can legitimately be blank until scanned.
    // Keep the field empty in that case so the user can scan/type the real UID.
    setCardUid(nextUid);
  }, [card]);

  const peopleOptions = useMemo(() => {
    const customerOptions = customers.map((c) => ({
      key: `customer:${c.id}`,
      label: c.name,
      type: 'customer',
      id: String(c.id),
    }));
    return customerOptions;
  }, [customers]);

  const selectedPersonMeta = useMemo(() => {
    if (!selectedAssignKey) return null;
    const [type, id] = selectedAssignKey.split(':');
    if (!type || !id) return null;
    return { type, id };
  }, [selectedAssignKey]);

  const handleAssign = () => {
    if (!selectedPersonMeta) return;

    const uidValue = String(cardUid || '').trim();
    if (!uidValue) return;

    onAssign({
      cardId: card.id,
      uid: uidValue,
      personId: selectedPersonMeta.id,
      type: selectedPersonMeta.type,
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'assign-card-overlay') {
      onClose();
    }
  };

  return (
    <div className="assign-card-overlay" onClick={handleOverlayClick}>
      <div className="assign-card-modal">
        <div className="assign-card-header">
          <h3 className="assign-card-title">Assign Card</h3>
          <button className="assign-card-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="assign-card-content">
          {card && (
            <div className="assign-card-cardinfo" aria-label="Card information">
              <div className="assign-card-cardinfo-icon" aria-hidden="true">
                <img src={cardIcon} alt="" />
              </div>
              <div className="assign-card-cardinfo-text">
                <div className="assign-card-carduid" title={card.uid || ''}>{card.uid || card.id}</div>
                <div className="assign-card-cardcat">{card.category}</div>
              </div>
            </div>
          )}

          {peopleError ? (
            <div className="assign-card-error" role="alert">
              {peopleError}
            </div>
          ) : null}

          <div className="assign-card-fieldblock">
            <label className="assign-card-label">
              Card UID<span className="assign-card-required">*</span>
            </label>
            <input
              className="assign-card-input"
              value={cardUid}
              onChange={(e) => setCardUid(e.target.value)}
              placeholder="UID-123458"
              inputMode="text"
              autoComplete="off"
            />
            <p className="assign-card-help">Enter the card UID manually or use a card reader to scan it</p>
          </div>

          <div className="assign-card-fieldblock">
            <label className="assign-card-label">Assign To</label>
            <select
              className="assign-card-select"
              value={selectedAssignKey}
              onChange={(e) => setSelectedAssignKey(e.target.value)}
              disabled={peopleLoading}
            >
              <option value="">{peopleLoading ? 'Loading...' : 'Select...'}</option>
              {peopleOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="assign-card-footer">
          <button className="assign-card-cancel" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="assign-card-assign"
            type="button"
            onClick={handleAssign}
            disabled={!selectedPersonMeta || !String(cardUid || '').trim()}
          >
            Assign Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignCardModal;
