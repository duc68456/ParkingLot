import React, { useEffect, useState } from 'react';
import '../styles/components/EditCustomerModal.css';
import userIcon from '../assets/icons/dashboard/users.svg';

const EditCustomerModal = ({ customer, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || ''
  });

  useEffect(() => {
    setFormData({
      name: customer?.name || '',
      phone: customer?.phone || ''
    });
  }, [customer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    onSave({ ...customer, name: formData.name, phone: formData.phone });
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
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
