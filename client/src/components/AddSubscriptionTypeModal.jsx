import { useEffect, useMemo, useState } from 'react';
import '../styles/components/AddSubscriptionTypeModal.css';

export default function AddSubscriptionTypeModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = useMemo(() => name.trim(), [name]);
  const trimmedDuration = useMemo(() => String(durationDays).trim(), [durationDays]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const validate = () => {
    if (!trimmedName) return 'Name is required.';

    const n = Number(trimmedDuration);
    if (!trimmedDuration) return 'Duration (days) is required.';
    if (!Number.isFinite(n) || Number.isNaN(n)) return 'Duration (days) must be a number.';
    if (!Number.isInteger(n)) return 'Duration (days) must be a whole number.';
    if (n <= 0) return 'Duration (days) must be greater than 0.';

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await onSubmit?.({
        name: trimmedName,
        durationDays: Number(trimmedDuration),
        description: description.trim(),
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to add subscription type.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="add-subscription-type-overlay" onClick={handleOverlayClick} />
      <div className="add-subscription-type-wrapper" onClick={handleOverlayClick}>
        <div className="add-subscription-type-modal" role="dialog" aria-modal="true" aria-label="Add Subscription Type">
          <form onSubmit={handleSubmit}>
            <div className="add-subscription-type-header">
              <h3 className="add-subscription-type-title">Add Subscription Type</h3>
              <button
                type="button"
                className="add-subscription-type-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="add-subscription-type-body">
              <div className="add-subscription-type-info">
                <p className="add-subscription-type-info-title">Add Subscription Type</p>
                <p className="add-subscription-type-info-subtitle">
                  Fill in the required information to add a subscription type
                </p>
              </div>

              <div className="add-subscription-type-field">
                <label className="add-subscription-type-label">
                  Name <span className="add-subscription-type-required">*</span>
                </label>
                <input
                  className="add-subscription-type-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter type name..."
                  autoFocus
                  required
                />
              </div>

              <div className="add-subscription-type-field">
                <label className="add-subscription-type-label">
                  Duration (days) <span className="add-subscription-type-required">*</span>
                </label>
                <input
                  className="add-subscription-type-input"
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Enter duration in days..."
                  min={1}
                  step={1}
                  required
                />
              </div>

              <div className="add-subscription-type-field add-subscription-type-field--textarea">
                <label className="add-subscription-type-label">Description</label>
                <textarea
                  className="add-subscription-type-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>

              {error ? <div className="add-subscription-type-error">{error}</div> : null}
            </div>

            <div className="add-subscription-type-footer">
              <button type="button" className="add-subscription-type-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="add-subscription-type-submit" disabled={isSubmitting}>
                Add Type
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
