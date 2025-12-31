import React from 'react';
import '../styles/components/StepIndicator.css';

export default function StepIndicator({ steps }) {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          {/* Step Circle and Info */}
          <div className="step-item">
            <div
              className={`step-circle ${step.active ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
              aria-current={step.active ? 'step' : undefined}
            >
              {step.completed ? (
                <svg
                  className="step-check"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M16.6667 5L7.5 14.1667L3.33333 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="step-number">{step.number}</span>
              )}
            </div>
            <div className="step-info">
              <div className="step-title">{step.title}</div>
              <div className="step-subtitle">{step.subtitle}</div>
            </div>
          </div>

          {/* Divider Line (not after last step) */}
          {index < steps.length - 1 && (
            <div
              className={`step-divider ${steps[index].active || steps[index].completed ? 'active' : ''}`}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
