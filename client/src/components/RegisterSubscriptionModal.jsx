import React, { useState, useEffect } from 'react';
import '../styles/components/RegisterSubscriptionModal.css';

function RegisterSubscriptionModal({ onClose, onRegister }) {
  const [cardId, setCardId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [subscriptionType, setSubscriptionType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [price, setPrice] = useState('0.00');

  // Mock data for dropdowns
  const cards = [
    { id: 'CARD001', uid: 'UID-123456', category: 'Premium' },
    { id: 'CARD002', uid: 'UID-123457', category: 'Standard' },
    { id: 'CARD004', uid: 'UID-123459', category: 'Standard' }
  ];

  const vehicles = [
    { id: 'VEH001', plate: 'ABC-1234', type: 'Car' },
    { id: 'VEH002', plate: 'XYZ-5678', type: 'Motorcycle' },
    { id: 'VEH003', plate: 'DEF-9012', type: 'Truck' }
  ];

  const subscriptionTypes = [
    { id: 'monthly', name: 'Monthly', duration: 30, price: 50 },
    { id: 'quarterly', name: 'Quarterly', duration: 90, price: 140 },
    { id: 'annual', name: 'Annual', duration: 365, price: 500 }
  ];

  // Set today's date on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
  }, []);

  // Calculate end date and price when subscription type changes
  useEffect(() => {
    if (subscriptionType && startDate) {
      const selectedType = subscriptionTypes.find(t => t.id === subscriptionType);
      if (selectedType) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + selectedType.duration);
        setEndDate(end.toISOString().split('T')[0]);
        setPrice(selectedType.price.toFixed(2));
      }
    }
  }, [subscriptionType, startDate]);

  const handleSubmit = () => {
    if (!cardId || !vehicleId || !subscriptionType) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedCard = cards.find(c => c.id === cardId);
    const selectedVehicle = vehicles.find(v => v.id === vehicleId);
    const selectedType = subscriptionTypes.find(t => t.id === subscriptionType);

    const newSubscription = {
      id: `SUB${String(Date.now()).slice(-3)}`,
      cardId,
      vehicleId,
      vehiclePlate: selectedVehicle.plate,
      customerName: 'New Customer', // In real app, get from card/vehicle owner
      type: selectedType.name,
      startDate,
      endDate,
      price: parseFloat(price),
      status: 'Active'
    };

    onRegister(newSubscription);
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'register-subscription-modal-overlay') {
      onClose();
    }
  };

  return (
    <div className="register-subscription-modal-overlay" onClick={handleOverlayClick}>
      <div className="register-subscription-modal">
        {/* Header */}
        <div className="register-subscription-modal-header">
          <h3>Register Subscription</h3>
          <button className="register-subscription-modal-close" onClick={onClose}>
            <img src="http://localhost:3845/assets/3b1fd7a264c04d18910cf128ec5c8c34e71cbeef.svg" alt="Close" />
          </button>
        </div>

        {/* Content */}
        <div className="register-subscription-modal-content">
          {/* Info box */}
          <div className="register-subscription-info-box">
            <p className="register-subscription-info-title">New Subscription Registration</p>
            <p className="register-subscription-info-description">
              Fill in the required information to register a new subscription
            </p>
          </div>

          {/* Form fields */}
          <div className="register-subscription-form">
            {/* Card ID */}
            <div className="register-subscription-field">
              <label>
                Card ID <span className="required">*</span>
              </label>
              <select 
                value={cardId} 
                onChange={(e) => setCardId(e.target.value)}
                className="register-subscription-dropdown"
              >
                <option value="">Select card...</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.id} - {card.uid} ({card.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle ID */}
            <div className="register-subscription-field">
              <label>
                Vehicle ID <span className="required">*</span>
              </label>
              <select 
                value={vehicleId} 
                onChange={(e) => setVehicleId(e.target.value)}
                className="register-subscription-dropdown"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.id} - {vehicle.plate} ({vehicle.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Subscription Type */}
            <div className="register-subscription-field">
              <label>
                Subscription Type <span className="required">*</span>
              </label>
              <select 
                value={subscriptionType} 
                onChange={(e) => setSubscriptionType(e.target.value)}
                className="register-subscription-dropdown"
              >
                <option value="">Select type...</option>
                {subscriptionTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.duration} days)
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="register-subscription-field">
              <label>Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="register-subscription-date-picker"
              />
              <p className="register-subscription-field-hint">Auto-set to today's date</p>
            </div>

            {/* End Date */}
            <div className="register-subscription-field">
              <label>End Date</label>
              <input 
                type="date" 
                value={endDate} 
                readOnly
                className="register-subscription-date-picker"
              />
              <p className="register-subscription-field-hint">
                {subscriptionType ? 'Calculated based on subscription type' : 'Select a subscription type to calculate'}
              </p>
            </div>

            {/* Price */}
            <div className="register-subscription-field">
              <label>Price</label>
              <div className="register-subscription-price-input">
                <span className="register-subscription-dollar-sign">$</span>
                <input 
                  type="text" 
                  value={price} 
                  readOnly
                  className="register-subscription-price-field"
                />
              </div>
              <p className="register-subscription-field-hint">
                {subscriptionType ? 'Calculated based on subscription type' : 'Select a subscription type to calculate price'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="register-subscription-modal-footer">
          <button className="register-subscription-cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="register-subscription-submit-button" onClick={handleSubmit}>
            Register Subscription
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterSubscriptionModal;
