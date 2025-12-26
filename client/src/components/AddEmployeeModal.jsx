import { useState } from 'react';
import '../styles/components/AddEmployeeModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const infoIcon = "http://localhost:3845/assets/75a784162eadb383fb8b7b9265d6f214fe3ead16.svg";

export default function AddEmployeeModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    birthDate: '',
    gender: '',
    address: '',
    hometown: '',
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
      birthDate: '',
      gender: '',
      address: '',
      hometown: '',
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
              <img src={closeIcon} alt="Close" />
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
                    Birth Date<span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.birthDate}
                    onChange={(e) => handleChange('birthDate', e.target.value)}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-field full-width">
                  <label className="form-label">Address</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Hometown</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="City Name"
                    value={formData.hometown}
                    onChange={(e) => handleChange('hometown', e.target.value)}
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
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="GATE_STAFF">Gate Staff</option>
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
