import React from 'react';
import '../styles/components/StepIndicator.css';

export default function StepIndicator({ steps }) {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          {/* Step Circle and Info */}
          <div className="step-item">
            <div className={`step-circle ${step.active ? 'active' : ''}`}>
              <span className="step-number">{step.number}</span>
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-subtitle">{step.subtitle}</div>
            </div>
          </div>

          {/* Divider Line (not after last step) */}
          {index < steps.length - 1 && (
            <div className="step-divider" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
