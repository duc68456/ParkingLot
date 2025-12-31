import { useMemo, useState } from 'react';
import '../styles/components/AssignCardModal.css';

const cardIcon = "http://localhost:3845/assets/016247162025cce483fc4b098b7f2094b688d944.svg";

function AssignCardModal({ card, onClose, onAssign, defaultAssignType = '', defaultPersonId = '' }) {
  // Figma 241:1604 uses a single dropdown listing both customers and employees.
  // We keep internal compatibility with the old onAssign({type, personId}) shape.
  const initialAssignKey = useMemo(() => {
    if (!defaultPersonId || !defaultAssignType) return '';
    return `${defaultAssignType}:${String(defaultPersonId)}`;
  }, [defaultAssignType, defaultPersonId]);

  const [selectedAssignKey, setSelectedAssignKey] = useState(initialAssignKey);

  // Mock data for people
  const customers = [
    { id: 1, name: 'John Doe', type: 'Customer' },
    { id: 2, name: 'Jane Smith', type: 'Customer' },
    { id: 3, name: 'Bob Johnson', type: 'Customer' },
  ];

  const employees = [
    { id: 4, name: 'Alice Manager', type: 'Employee' },
    { id: 5, name: 'Tom Staff', type: 'Employee' },
    { id: 6, name: 'Sarah Manager', type: 'Employee' },
  ];

  const peopleOptions = useMemo(() => {
    const customerOptions = customers.map((c) => ({
      key: `customer:${c.id}`,
      label: `${c.name} (Customer)`,
      type: 'customer',
      id: String(c.id),
    }));
    const employeeOptions = employees.map((e) => ({
      key: `employee:${e.id}`,
      label: `${e.name} (Employee)`,
      type: 'employee',
      id: String(e.id),
    }));
    return [...customerOptions, ...employeeOptions];
  }, [customers, employees]);

  const selectedPersonMeta = useMemo(() => {
    if (!selectedAssignKey) return null;
    const [type, id] = selectedAssignKey.split(':');
    if (!type || !id) return null;
    return { type, id };
  }, [selectedAssignKey]);

  const handleAssign = () => {
    if (!selectedPersonMeta) return;
    onAssign({
      cardId: card.id,
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
                <div className="assign-card-carduid">{card.uid}</div>
                <div className="assign-card-cardcat">{card.category}</div>
              </div>
            </div>
          )}

          <div className="assign-card-fieldblock">
            <label className="assign-card-label">Assign To</label>
            <select
              className="assign-card-select"
              value={selectedAssignKey}
              onChange={(e) => setSelectedAssignKey(e.target.value)}
            >
              <option value="">Select...</option>
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
            disabled={!selectedPersonMeta}
          >
            Assign Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignCardModal;
