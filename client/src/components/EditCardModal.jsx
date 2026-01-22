import { useState, useEffect } from 'react';
import '../styles/components/ViewCardModal.css'; // Reusing ViewCardModal styles where possible
import '../styles/components/EditCardModal.css'; // New styles specific to editing

export default function EditCardModal({ card, isOpen, onClose, onSave }) {
  const [status, setStatus] = useState(card?.status || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (card) {
      // Initialize with correct casing if needed, though usually standardized by parent
      setStatus(card.rawStatus || card.status || 'ACTIVE');
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await onSave(card.id, status);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update card');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
    { value: 'PENDING_RFID', label: 'Pending RFID' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'UNASSIGNED', label: 'Unassigned' }
  ];

  return (
    <div className="view-card-modal-overlay" onClick={onClose}>
      <div className="view-card-modal-content edit-card-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="view-card-modal-header">
          <h3 className="view-card-modal-title">Edit Card</h3>
          <button className="view-card-modal-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="view-card-modal-body">
          {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

          {/* Read-only details */}
          <div className="view-card-details-grid" style={{ marginBottom: '24px' }}>
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
              <label className="view-card-detail-label">OWNER</label>
              <p className="view-card-detail-value">{card.owner || 'Unassigned'}</p>
            </div>
          </div>

          {/* Edit Form */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>
              STATUS
            </label>
            <select
              className="form-select"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: 'white',
              color: '#475569',
              cursor: 'pointer'
            }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
