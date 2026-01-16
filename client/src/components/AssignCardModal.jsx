import { useEffect, useMemo, useState } from 'react';
import '../styles/components/AssignCardModal.css';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// UID validation regex matching backend format: UID-XXXX (4 digits)
const UID_REGEX = /^UID-\d{4}$/;

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
  const [uidError, setUidError] = useState('');
  const [uidLoading, setUidLoading] = useState(false);

  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState('');
  const [customers, setCustomers] = useState([]);

  // Validate UID format
  const validateUid = (uid) => {
    const trimmedUid = String(uid || '').trim();
    if (!trimmedUid) {
      return 'UID is required';
    }
    if (!UID_REGEX.test(trimmedUid)) {
      return 'UID must be in format UID-XXXX (e.g. UID-0001)';
    }
    return '';
  };

  // Handle UID input change with validation
  const handleUidChange = (e) => {
    const newValue = e.target.value;
    setCardUid(newValue);
    // Clear error while typing, validate on blur
    if (uidError) {
      setUidError('');
    }
  };

  // Validate on blur
  const handleUidBlur = () => {
    const error = validateUid(cardUid);
    setUidError(error);
  };

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

        // Normalize into { id: PERSON_BUSINESS_ID (PER####), name: FULL_NAME, type }
        // The assign endpoint expects a *person business id*:
        //   POST /api/cards/:id/assign  body: { type: 'customer', personId: 'PER####' }
        // After the PersonID refactor:
        // - `c.PersonID` is already a string PER####
        // - `c.person` is the populated Person doc (virtual populate)
        setCustomers(
          custList
            .map((c) => {
              const person = c?.person;
              const fullName =
                person?.FullName ??
                person?.fullName ??
                c?.FullName ??
                c?.name ??
                '';

              const personBusinessId =
                person?.ID ??
                (typeof c?.PersonID === 'string' ? c.PersonID : undefined);

              return {
                id: personBusinessId,
                name: fullName || 'Unknown',
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

  // Always auto-fetch next UID when modal opens (for new format UID-XXXX)
  useEffect(() => {
    const controller = new AbortController();

    // Always fetch next available UID in new format
    (async () => {
      try {
        setUidLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/cards/next-uid`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });
        const json = await response.json().catch(() => null);

        if (response.ok && json?.data?.nextUid) {
          setCardUid(json.data.nextUid);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Failed to fetch next UID:', err);
          // Fallback: let user enter manually
        }
      } finally {
        if (!controller.signal.aborted) setUidLoading(false);
      }
    })();

    return () => controller.abort();
  }, [card, authHeaders]);

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

    // Validate UID format before submission
    const validationError = validateUid(uidValue);
    if (validationError) {
      setUidError(validationError);
      return;
    }

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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="6" width="20" height="12" rx="2" stroke="#4169E1" strokeWidth="1.5" />
                  <path d="M2 10H22" stroke="#4169E1" strokeWidth="1.5" />
                </svg>
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
              className={`assign-card-input${uidError ? ' assign-card-input-error' : ''}`}
              value={cardUid}
              onChange={handleUidChange}
              onBlur={handleUidBlur}
              placeholder={uidLoading ? 'Loading...' : 'UID-0001'}
              inputMode="text"
              autoComplete="off"
              disabled={uidLoading}
            />
            {uidError ? (
              <p className="assign-card-field-error">{uidError}</p>
            ) : (
              <p className="assign-card-help">Format: UID-XXXX (e.g. UID-0001). Auto-generated if empty.</p>
            )}
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
