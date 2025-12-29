import React, { useState } from 'react';
import '../styles/components/EditCustomerModal.css';

const closeIcon = "http://localhost:3845/assets/f3b68ee63c00f3b4ed26718b9bc9abea1cd47155.svg";
const userIcon = "http://localhost:3845/assets/d38c2540fd134289cfebec39e7d204dae339d6b1.svg";

const EditCustomerModal = ({ customer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    hometown: customer?.hometown || '',
    gender: customer?.gender || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    onSave({ ...customer, ...formData });
    onClose();
  };

  if (!customer) return null;

  return (
    <div className="edit-customer-modal-overlay" onClick={onClose}>
      <div className="edit-customer-modal-wrapper">
        <div className="edit-customer-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="edit-modal-header">
            <h3 className="modal-title">Edit Customer</h3>
            <button className="modal-close-btn" onClick={onClose}>
              <img src={closeIcon} alt="Close" />
            </button>
          </div>

          {/* Body */}
          <div className="edit-modal-body">
            <div className="form-content">
              {/* Section Header */}
              <div className="section-title-row">
                <img src={userIcon} alt="User" className="title-icon" />
                <h4 className="section-title-text">Customer Information</h4>
              </div>

              {/* Form Fields Container */}
              <div className="form-fields-container">
                {/* Row 1: Full Name & Phone */}
                <div className="field-wrapper field-name">
                  <label className="field-label">
                    Full Name <span className="required-mark">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="field-input"
                  />
                </div>

                <div className="field-wrapper field-phone">
                  <label className="field-label">
                    Phone <span className="required-mark">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1234567890"
                    className="field-input"
                  />
                </div>

                {/* Row 2: Email (full width) */}
                <div className="field-wrapper field-email">
                  <label className="field-label">
                    Email <span className="required-mark">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@email.com"
                    className="field-input"
                  />
                </div>

                {/* Row 3: Address (full width) */}
                <div className="field-wrapper field-address">
                  <label className="field-label">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main St, City"
                    className="field-input"
                  />
                </div>

                {/* Row 4: Hometown & Gender */}
                <div className="field-wrapper field-hometown">
                  <label className="field-label">Hometown</label>
                  <input
                    type="text"
                    name="hometown"
                    value={formData.hometown}
                    onChange={handleChange}
                    placeholder="Springfield"
                    className="field-input"
                  />
                </div>

                <div className="field-wrapper field-gender">
                  <label className="field-label">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="field-input field-select"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="edit-modal-footer">
            <button className="footer-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="footer-submit-btn" onClick={handleSubmit}>
              Update Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCustomerModal;
