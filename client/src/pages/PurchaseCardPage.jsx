import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import StepIndicator from '../components/StepIndicator';
import SearchInput from '../components/SearchInput';
import CustomerCard from '../components/CustomerCard';
import '../styles/pages/PurchaseCardPage.css';

const searchIcon = "http://localhost:3845/assets/da9097a84ec21b5d04531a516eeb0578b045e45f.svg";
const plusIcon = "http://localhost:3845/assets/d5adc677833421c90551d173e93323a33412b09b.svg";

// Mock customer data
const mockCustomers = [
  {
    id: 'CUST001',
    name: 'John Doe',
    initials: 'JD',
    email: 'john.doe@email.com',
    phone: '+1234567890'
  },
  {
    id: 'CUST002',
    name: 'Jane Smith',
    initials: 'JS',
    email: 'jane.smith@email.com',
    phone: '+1234567891'
  },
  {
    id: 'CUST003',
    name: 'Bob Johnson',
    initials: 'BJ',
    email: 'bob.j@email.com',
    phone: '+1234567892'
  }
];

export default function PurchaseCardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    hometown: '',
    gender: ''
  });
  const [errors, setErrors] = useState({});
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState({
    category: '',
    expiryDate: '',
    plateNumber: '',
    vehicleType: ''
  });
  const [cardErrors, setCardErrors] = useState({});

  const steps = [
    {
      number: 1,
      title: 'Customer',
      subtitle: 'Select or Create',
      active: currentStep === 1
    },
    {
      number: 2,
      title: 'Purchase Cards',
      subtitle: 'Add Cards',
      active: currentStep === 2
    },
    {
      number: 3,
      title: 'Review',
      subtitle: 'Confirm Payment',
      active: currentStep === 3
    }
  ];

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCurrentStep(2);
  };

  const handleCreateCustomer = () => {
    setShowCreateForm(true);
  };

  const handleBackToSelect = () => {
    setShowCreateForm(false);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      hometown: '',
      gender: ''
    });
    setErrors({});
  };

  const handleFormChange = (e) => {
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

  const handleSubmitCustomer = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    console.log('New customer data:', formData);
    // TODO: Add customer to backend/state
    // Generate customer ID
    const newCustomer = {
      id: `CUST${String(mockCustomers.length + 1).padStart(3, '0')}`,
      name: formData.fullName,
      initials: formData.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase(),
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      hometown: formData.hometown,
      gender: formData.gender
    };
    
    setSelectedCustomer(newCustomer);
    // Navigate to step 2
    setCurrentStep(2);
  };

  const handleCardFormChange = (e) => {
    const { name, value } = e.target;
    setCardForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (cardErrors[name]) {
      setCardErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateCardForm = () => {
    const newErrors = {};

    if (!cardForm.category) {
      newErrors.category = 'Card category is required';
    }

    if (!cardForm.plateNumber.trim()) {
      newErrors.plateNumber = 'Plate number is required';
    }

    if (!cardForm.vehicleType) {
      newErrors.vehicleType = 'Vehicle type is required';
    }

    setCardErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!validateCardForm()) {
      return;
    }

    const newCard = {
      id: `CARD${String(cards.length + 1).padStart(3, '0')}`,
      ...cardForm
    };

    setCards(prev => [...prev, newCard]);
    
    // Reset form
    setCardForm({
      category: '',
      expiryDate: '',
      plateNumber: '',
      vehicleType: ''
    });
    setCardErrors({});
  };

  const handleBackFromStep2 = () => {
    setCurrentStep(1);
  };

  const handleContinueToReview = () => {
    if (cards.length > 0) {
      setCurrentStep(3);
    }
  };

  const handleRemoveCard = (cardId) => {
    setCards(cards.filter(card => card.id !== cardId));
  };

  const getCategoryPrice = (category) => {
    const prices = {
      'Standard': 10,
      'Premium': 25,
      'VIP': 50,
      'Staff': 15
    };
    return prices[category] || 0;
  };

  const getGroupedCards = () => {
    const grouped = {};
    cards.forEach(card => {
      if (!grouped[card.category]) {
        grouped[card.category] = [];
      }
      grouped[card.category].push(card);
    });
    return grouped;
  };

  const calculateSubtotal = () => {
    return cards.reduce((total, card) => {
      return total + getCategoryPrice(card.category);
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleConfirmPayment = () => {
    console.log('Payment confirmed!');
    console.log('Customer:', selectedCustomer);
    console.log('Cards:', cards);
    console.log('Total:', calculateTotal());
    // TODO: Integrate with backend API
    alert(`Payment of $${calculateTotal().toFixed(2)} confirmed!`);
  };

  const filteredCustomers = mockCustomers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.phone.includes(query)
    );
  });

  return (
    <div className="purchase-card-page">
      <PageHeader
        title="Purchase Card"
        subtitle="Register new customers and issue parking cards"
      />

      {/* Step Indicator */}
      <div className="step-indicator-wrapper">
        <StepIndicator steps={steps} />
      </div>

      {/* Step 1: Select or Create Customer */}
      {currentStep === 1 && !showCreateForm && (
        <div className="select-customer-section">
          <div className="section-header">
            <h2 className="section-title">Select Customer</h2>
            <p className="section-subtitle">Choose an existing customer or create a new one</p>
          </div>

          {/* Search Input */}
          <SearchInput
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={searchIcon}
            className="customer-search"
          />

          {/* Existing Customers */}
          <div className="existing-customers">
            <h3 className="customers-heading">Existing Customers ({filteredCustomers.length})</h3>
            <div className="customers-grid">
              {filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onSelect={handleCustomerSelect}
                />
              ))}
            </div>
          </div>

          {/* Create New Customer Button */}
          <div className="create-customer-section">
            <button className="create-customer-btn" onClick={handleCreateCustomer}>
              <img src={plusIcon} alt="" />
              Create New Customer
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Create New Customer Form */}
      {currentStep === 1 && showCreateForm && (
        <div className="create-customer-form-section">
          <div className="section-header">
            <h2 className="section-title">Create New Customer</h2>
            <p className="section-subtitle">Fill in the customer information to proceed</p>
          </div>

          <form onSubmit={handleSubmitCustomer} className="customer-form">
            {/* Form Fields */}
            <div className="form-fields">
              {/* Row 1: Full Name and Phone */}
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">
                    Full Name<span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    className={`form-input ${errors.fullName ? 'error' : ''}`}
                  />
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Phone<span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+1234567890"
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>
              </div>

              {/* Row 2: Email */}
              <div className="form-field form-field-full">
                <label className="form-label">
                  Email<span className="required">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="john@example.com"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
              </div>

              {/* Row 3: Address */}
              <div className="form-field form-field-full">
                <label className="form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  placeholder="123 Main Street"
                  className="form-input"
                />
              </div>

              {/* Row 4: Hometown and Gender */}
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">Hometown</label>
                  <input
                    type="text"
                    name="hometown"
                    value={formData.hometown}
                    onChange={handleFormChange}
                    placeholder="City Name"
                    className="form-input"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleFormChange}
                    className="form-select"
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
            <div className="form-actions">
              <button
                type="button"
                onClick={handleBackToSelect}
                className="back-btn"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Back
              </button>
              <button type="submit" className="submit-btn">
                Continue to Purchase Cards
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Purchase Cards */}
      {currentStep === 2 && selectedCustomer && (
        <div className="purchase-cards-section">
          <div className="section-header">
            <h2 className="section-title">Purchase Cards</h2>
            <p className="section-subtitle">
              Add parking cards with vehicle information for {selectedCustomer.name}
            </p>
          </div>

          {/* Selected Customer Info */}
          <div className="selected-customer-info">
            <div className="customer-avatar-large" style={{
              backgroundImage: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)'
            }}>
              {selectedCustomer.initials}
            </div>
            <div className="customer-details">
              <p className="customer-name">{selectedCustomer.name}</p>
              <p className="customer-email">{selectedCustomer.email}</p>
            </div>
          </div>

          {/* Add New Card Form */}
          <form onSubmit={handleAddCard} className="add-card-form">
            <div className="form-header">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16M4 10H16" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="form-title">Add New Card</h3>
            </div>

            <div className="card-form-fields">
              {/* Row 1: Card Category and Expiry Date */}
              <div className="card-form-row">
                <div className="form-field">
                  <label className="form-label">
                    Card Category<span className="required">*</span>
                  </label>
                  <select
                    name="category"
                    value={cardForm.category}
                    onChange={handleCardFormChange}
                    className={`form-select ${cardErrors.category ? 'error' : ''}`}
                  >
                    <option value="">Select Category</option>
                    <option value="Standard">Standard ($10)</option>
                    <option value="Premium">Premium ($25)</option>
                    <option value="VIP">VIP ($50)</option>
                    <option value="Staff">Staff ($15)</option>
                  </select>
                  {cardErrors.category && <span className="error-message">{cardErrors.category}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={cardForm.expiryDate}
                    onChange={handleCardFormChange}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 2: Plate Number and Vehicle Type */}
              <div className="card-form-row">
                <div className="form-field">
                  <label className="form-label">
                    Plate Number<span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="plateNumber"
                    value={cardForm.plateNumber}
                    onChange={handleCardFormChange}
                    placeholder="ABC-1234"
                    className={`form-input plate-input ${cardErrors.plateNumber ? 'error' : ''}`}
                  />
                  {cardErrors.plateNumber && <span className="error-message">{cardErrors.plateNumber}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Vehicle Type<span className="required">*</span>
                  </label>
                  <select
                    name="vehicleType"
                    value={cardForm.vehicleType}
                    onChange={handleCardFormChange}
                    className={`form-select ${cardErrors.vehicleType ? 'error' : ''}`}
                  >
                    <option value="">Select Type</option>
                    <option value="Car">Car</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Truck">Truck</option>
                    <option value="Van">Van</option>
                  </select>
                  {cardErrors.vehicleType && <span className="error-message">{cardErrors.vehicleType}</span>}
                </div>
              </div>
            </div>

            <button type="submit" className="add-card-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3.2V12.8M3.2 8H12.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add Card to List
            </button>
          </form>

          {/* Cards to Purchase List */}
          {cards.length > 0 && (
            <div className="cards-to-purchase">
              <div className="cards-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="12" height="10" rx="2" stroke="#009966" strokeWidth="1.5" fill="none"/>
                  <path d="M2 6H14" stroke="#009966" strokeWidth="1.5"/>
                </svg>
                <h3 className="cards-title">Cards to Purchase</h3>
                <span className="cards-count">{cards.length}</span>
              </div>

              <div className="cards-list">
                {cards.map((card) => {
                  const price = getCategoryPrice(card.category);

                  return (
                    <div key={card.id} className="card-group-item">
                      <div className="card-group-content">
                        <div className="card-icon">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                            <path d="M3 8H17" stroke="white" strokeWidth="1.5"/>
                          </svg>
                        </div>
                        <div className="card-group-details">
                          <div className="card-group-header">
                            <span className="card-type">{card.category}</span>
                            <span className="card-price-badge">${price}</span>
                          </div>
                          <div className="card-plate-info">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M2 5.5L4.5 3L7 5.5M9 3L11.5 5.5" stroke="#312c85" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="plate-text">{card.plateNumber} ({card.vehicleType})</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleRemoveCard(card.id)}
                        className="card-delete-btn"
                        aria-label="Remove card"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M13 4L3 14M3 4L13 14" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning Message */}
          {cards.length === 0 && (
            <div className="warning-message">
              <p>Please add at least one card to continue</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleBackFromStep2}
              className="back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button 
              type="button"
              onClick={handleContinueToReview} 
              className={`submit-btn ${cards.length === 0 ? 'disabled' : ''}`}
              disabled={cards.length === 0}
            >
              Continue to Review
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review Invoice */}
      {currentStep === 3 && (
        <div className="review-section">
          <div className="review-header">
            <h2 className="review-title">Review Invoice</h2>
            <p className="review-subtitle">Review the details before confirming payment</p>
          </div>

          {/* Customer Info */}
          <div className="review-customer-info">
            <div className="review-customer-avatar">
              {selectedCustomer.initials}
            </div>
            <div className="review-customer-details">
              <p className="review-customer-name">{selectedCustomer.name}</p>
              <p className="review-customer-email">{selectedCustomer.email}</p>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details">
            <div className="invoice-detail-item">
              <label className="invoice-label">Invoice Number</label>
              <p className="invoice-value invoice-number">INV-{Date.now()}</p>
            </div>
            <div className="invoice-detail-item">
              <label className="invoice-label">Date</label>
              <p className="invoice-value">{new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* Items Section */}
          <div className="invoice-items-section">
            <div className="invoice-items-header">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="3" width="12" height="10" rx="2" stroke="#0f172b" strokeWidth="1.5" fill="none"/>
                <path d="M2 6H14" stroke="#0f172b" strokeWidth="1.5"/>
              </svg>
              <h3 className="invoice-items-title">Items ({cards.length})</h3>
            </div>

            <div className="invoice-items-list">
              {Object.entries(getGroupedCards()).map(([category, categoryCards]) => {
                const price = getCategoryPrice(category);
                const count = categoryCards.length;
                const total = price * count;

                return (
                  <div key={category} className="invoice-item">
                    <div className="invoice-item-content">
                      <div className="invoice-item-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/>
                          <path d="M3 8H17" stroke="white" strokeWidth="1.5"/>
                        </svg>
                      </div>
                      <div className="invoice-item-details">
                        <div className="invoice-item-header">
                          <span className="invoice-item-category">{category}</span>
                          <span className="invoice-item-count">{count} card{count > 1 ? 's' : ''}</span>
                        </div>
                        <div className="invoice-item-calculation">
                          ${price} × {count} = ${total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="invoice-item-actions">
                      <span className="invoice-item-total">${total.toFixed(2)}</span>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 8L10 12L14 8" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="payment-summary">
            <div className="payment-row">
              <span className="payment-label">Subtotal:</span>
              <span className="payment-value">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="payment-row payment-row-border">
              <span className="payment-label">Tax (10%):</span>
              <span className="payment-value">${calculateTax().toFixed(2)}</span>
            </div>
            <div className="payment-total-row">
              <span className="payment-total-label">Total:</span>
              <span className="payment-total-value">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="review-actions">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="review-back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <button 
              type="button"
              onClick={handleConfirmPayment}
              className="confirm-payment-btn"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.667 5L7.5 14.167L3.333 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Confirm Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
