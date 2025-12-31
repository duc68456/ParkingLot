import { useMemo, useState } from 'react';
import '../styles/components/AddEmployeeCardModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function AddEmployeeCardModal({ employee, onBackToCards, onClose, onCreate }) {
  if (!employee) return null;

  const [cardUid, setCardUid] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  const initials = employee.initials || employee.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canSubmit = Boolean(cardUid.trim());

  const handleSubmit = () => {
    if (!canSubmit) return;

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
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          <div className="add-employee-card-body">
            <div className="employee-summary">
              <div className="employee-avatar">{initials}</div>
              <div className="employee-summary-info">
                <div className="employee-summary-name">{employee.name}</div>
                <div className="employee-summary-meta">
                  {employee.role}  Employee
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
                className="form-control add-employee-card-uid"
                value={cardUid}
                onChange={(e) => setCardUid(e.target.value)}
                placeholder="Enter or scan card UID (e.g., UID-123456)"
              />
              <div className="add-employee-card-help">
                Enter the card UID manually or use a card reader to scan it
              </div>
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
