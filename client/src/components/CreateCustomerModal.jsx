import { useState } from 'react';
import '../styles/components/CreateCustomerModal.css';

const CreateCustomerModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    hometown: '',
    gender: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="create-customer-overlay" onClick={onClose}>
      <div className="create-customer-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="create-customer-form">
          {/* Header */}
          <div className="create-customer-header">
            <h2 className="create-customer-title">Create New Customer</h2>
            <p className="create-customer-subtitle">Fill in the customer information to proceed</p>
          </div>

          {/* Form Fields */}
          <div className="create-customer-fields">
            {/* Row 1: Full Name and Phone */}
            <div className="create-customer-row">
              <div className="create-customer-field">
                <label className="create-customer-label">
                  Full Name<span className="create-customer-required">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className={`create-customer-input ${errors.fullName ? 'error' : ''}`}
                />
                {errors.fullName && <span className="create-customer-error">{errors.fullName}</span>}
              </div>

              <div className="create-customer-field">
                <label className="create-customer-label">
                  Phone<span className="create-customer-required">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+1234567890"
                  className={`create-customer-input ${errors.phone ? 'error' : ''}`}
                />
                {errors.phone && <span className="create-customer-error">{errors.phone}</span>}
              </div>
            </div>

            {/* Row 2: Email */}
            <div className="create-customer-field create-customer-field-full">
              <label className="create-customer-label">
                Email<span className="create-customer-required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className={`create-customer-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <span className="create-customer-error">{errors.email}</span>}
            </div>

            {/* Row 3: Address */}
            <div className="create-customer-field create-customer-field-full">
              <label className="create-customer-label">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Main Street"
                className="create-customer-input"
              />
            </div>

            {/* Row 4: Hometown and Gender */}
            <div className="create-customer-row">
              <div className="create-customer-field">
                <label className="create-customer-label">Hometown</label>
                <input
                  type="text"
                  name="hometown"
                  value={formData.hometown}
                  onChange={handleChange}
                  placeholder="City Name"
                  className="create-customer-input"
                />
              </div>

              <div className="create-customer-field">
                <label className="create-customer-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="create-customer-select"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="create-customer-actions">
            <button
              type="button"
              onClick={onClose}
              className="create-customer-back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button type="submit" className="create-customer-submit-btn">
              Continue to Purchase Cards
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCustomerModal;
