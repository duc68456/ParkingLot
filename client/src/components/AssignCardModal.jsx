import { useState } from 'react';
import '../styles/components/AssignCardModal.css';

function AssignCardModal({ card, onClose, onAssign }) {
  const [assignType, setAssignType] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');

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

  const getPeopleList = () => {
    if (assignType === 'customer') return customers;
    if (assignType === 'employee') return employees;
    return [];
  };

  const handleAssign = () => {
    if (!assignType || !selectedPerson) return;
    
    onAssign({
      cardId: card.id,
      personId: selectedPerson,
      type: assignType
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
        <div className="modal-header">
          <h3>Assign Card</h3>
          <button className="close-button" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-content">
          <div className="card-info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="13" rx="2" stroke="#1447e6" strokeWidth="1.5"/>
              <path d="M3 10h18" stroke="#1447e6" strokeWidth="1.5"/>
            </svg>
            <div className="card-details">
              <div className="card-uid">{card.uid}</div>
              <div className="card-category">{card.category}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Assign To</label>
            <select 
              value={assignType} 
              onChange={(e) => {
                setAssignType(e.target.value);
                setSelectedPerson('');
              }}
              className="form-select"
            >
              <option value="">Select type...</option>
              <option value="customer">Customer</option>
              <option value="employee">Employee</option>
            </select>
          </div>

          <div className="form-group">
            <label>Select Person</label>
            <select 
              value={selectedPerson} 
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="form-select"
              disabled={!assignType}
            >
              <option value="">Select...</option>
              {getPeopleList().map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn-assign" 
            onClick={handleAssign}
            disabled={!assignType || !selectedPerson}
          >
            Assign Card
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignCardModal;
