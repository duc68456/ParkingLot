import { useState } from 'react';
import '../styles/components/AddEmployeeModal.css';
import infoIcon from '../assets/icons/dashboard/alert-info.svg';

export default function AddEmployeeModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: '',
    employeeType: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      phone: '',
      gender: '',
      employeeType: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}></div>
      <div className="modal-container">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">Add Employee</h3>
            <button className="modal-close-btn" onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <form className="modal-body" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-header">
                <img src={infoIcon} alt="" className="section-icon" />
                <h4 className="section-title">Employee Information</h4>
              </div>

              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    Full Name<span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Jane Smith"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Phone<span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Employee Type<span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.employeeType}
                    onChange={(e) => handleChange('employeeType', e.target.value)}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="STAFF">Staff</option>
                    <option value="GATE_STAFF">Gate Staff</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Gender<span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-cancel" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit">
                Create Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
