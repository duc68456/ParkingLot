import { useEffect, useState } from 'react';
import '../styles/components/AddEmployeeCardModal.css';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const UID_REGEX = /^UID-\d{4}$/;

export default function AddEmployeeCardModal({ employee, onBackToCards, onClose, onCreate }) {
  if (!employee) return null;

  const { authHeaders } = useAuth();
  const [cardUid, setCardUid] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uidLoading, setUidLoading] = useState(false);
  const [uidError, setUidError] = useState('');

  const initials = employee.initials || employee.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Auto-fetch next UID
  useEffect(() => {
    const controller = new AbortController();

    const fetchNextUid = async () => {
      try {
        setUidLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/cards/next-uid`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.data?.nextUid) {
          setCardUid(json.data.nextUid);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch next UID:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setUidLoading(false);
        }
      }
    };

    fetchNextUid();

    return () => controller.abort();
  }, [authHeaders]);

  const validateUid = (uid) => {
    const trimmed = String(uid || '').trim();
    if (!trimmed) return 'UID is required';
    if (!UID_REGEX.test(trimmed)) return 'UID must be in format UID-XXXX (e.g. UID-0001)';
    return '';
  };

  const handleUidChange = (e) => {
    const val = e.target.value;
    setCardUid(val);
    if (uidError) setUidError('');
  };

  const handleUidBlur = () => {
    setUidError(validateUid(cardUid));
  };

  const canSubmit = Boolean(cardUid.trim()) && !uidError && !uidLoading;

  const handleSubmit = () => {
    const error = validateUid(cardUid);
    if (error) {
      setUidError(error);
      return;
    }

    const payload = {
      employeeId: employee.id,
      uid: cardUid.trim(),
      category: 'staff',
      status: 'Active',
      expiryDate: expiryDate || null
    };

    onCreate?.(payload);
  };

  return (
    <>
      <div className="add-employee-card-overlay" onClick={handleOverlayClick} />
      <div className="add-employee-card-wrapper">
        <div className="add-employee-card-modal">
          <div className="add-employee-card-header">
            <h3 className="add-employee-card-title">Add Card for {employee.name}</h3>
            <button className="add-employee-card-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="add-employee-card-body">
            <div className="employee-summary">
              <div className="employee-avatar">{initials}</div>
              <div className="employee-summary-info">
                <div className="employee-summary-name">{employee.name}</div>
                <div className="employee-summary-meta">
                  {employee.role}   Employee
                </div>
                <div className="employee-summary-hint">
                  This card will be automatically assigned to this employee upon creation.
                </div>
              </div>
            </div>

            <div className="card-note">
              <div className="card-note-icon">!</div>
              <div className="card-note-text">
                <strong>Note:</strong> Employee cards can only be created if the employee doesn't have any active cards. This ensures one active card per employee.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Card UID<span className="required">*</span>
              </label>
              <input
                type="text"
                className={`form-control add-employee-card-uid${uidError ? ' form-control-error' : ''}`}
                value={cardUid}
                onChange={handleUidChange}
                onBlur={handleUidBlur}
                placeholder={uidLoading ? 'Loading...' : 'Enter or scan card UID (e.g., UID-123456)'}
                disabled={uidLoading}
              />
              {uidError ? (
                <div className="add-employee-card-error" style={{ color: '#dc2626', fontSize: '13px', marginTop: '4px' }}>{uidError}</div>
              ) : (
                <div className="add-employee-card-help">
                  {uidLoading ? 'Fetching next available UID...' : 'Enter the card UID manually or use a card reader to scan it'}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                Expiry Date<span className="optional">(Optional)</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="card-info">
              <strong>Info:</strong> The card category will be automatically set to "Staff" and the status will be "Active" by default.
            </div>
          </div>

          <div className="add-employee-card-footer">
            <button className="btn-secondary" onClick={onBackToCards}>
              Back to Cards
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
              Create &amp; Assign Card
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
