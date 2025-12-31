import { useMemo, useState } from 'react';
import '../styles/components/AddEmployeeCardModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";

export default function AddEmployeeCardModal({ employee, onBackToCards, onClose, onCreate }) {
  if (!employee) return null;

  const [category, setCategory] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Temporary mock categories until backend/API is wired.
  const categories = useMemo(
    () => [
      { id: 'standard', label: 'Standard - $10.00' },
      { id: 'premium', label: 'Premium - $25.00' },
      { id: 'vip', label: 'VIP - $50.00' },
      { id: 'staff', label: 'Staff - $15.00' }
    ],
    []
  );

  const initials = employee.initials || employee.name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const canSubmit = Boolean(category);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const payload = {
      employeeId: employee.id,
      category,
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
                  {employee.role}  Employee
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
                Card Category<span className="required">*</span>
              </label>
              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
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
              <strong>Info:</strong> The card UID will be automatically generated and the status will be set to "Active" by default.
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
