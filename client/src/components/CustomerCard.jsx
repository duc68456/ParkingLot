import React from 'react';
import '../styles/components/CustomerCard.css';

export default function CustomerCard({ customer, onSelect, variant = 'default' }) {
  const handleClick = () => {
    if (onSelect) onSelect(customer);
  };

  const isCompact = variant === 'compact';

  return (
    <div
      className={`customer-card ${isCompact ? 'customer-card--compact' : ''}`}
      onClick={handleClick}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="customer-card-content">
        <div className="customer-avatar">{customer.initials}</div>
        <div className="customer-details">
          <div className="customer-name">{customer.name}</div>
          <div className="customer-email">{customer.email}</div>
          {!isCompact && <div className="customer-phone">{customer.phone}</div>}
        </div>
      </div>
      {!isCompact && (
        <button
          className="customer-select-btn"
          onClick={handleClick}
          aria-label="Select customer"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}
