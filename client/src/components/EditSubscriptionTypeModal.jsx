import { useEffect, useMemo, useState } from 'react';
import '../styles/components/EditSubscriptionTypeModal.css';

export default function EditSubscriptionTypeModal({ type, onClose, onSubmit }) {
  const [name, setName] = useState(type?.name ?? '');
  const [durationDays, setDurationDays] = useState(type?.duration ?? '');
  const [description, setDescription] = useState(type?.description ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedName = useMemo(() => String(name).trim(), [name]);
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
        id: type?.id,
        name: trimmedName,
        durationDays: Number(trimmedDuration),
        description: String(description ?? '').trim(),
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to update subscription type.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="edit-subscription-type-overlay" onClick={handleOverlayClick} />
      <div className="edit-subscription-type-wrapper" onClick={handleOverlayClick}>
        <div className="edit-subscription-type-modal" role="dialog" aria-modal="true" aria-label="Edit Subscription Type">
          <form onSubmit={handleSubmit}>
            <div className="edit-subscription-type-header">
              <h3 className="edit-subscription-type-title">Edit Subscription Type</h3>
              <button
                type="button"
                className="edit-subscription-type-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="edit-subscription-type-body">
              <div className="edit-subscription-type-info">
                <p className="edit-subscription-type-info-title">Edit Subscription Type</p>
                <p className="edit-subscription-type-info-subtitle">
                  Update the required information to edit this subscription type
                </p>
              </div>

              <div className="edit-subscription-type-field">
                <label className="edit-subscription-type-label">
                  Name <span className="edit-subscription-type-required">*</span>
                </label>
                <input
                  className="edit-subscription-type-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter type name..."
                  autoFocus
                  required
                />
              </div>

              <div className="edit-subscription-type-field">
                <label className="edit-subscription-type-label">
                  Duration (days) <span className="edit-subscription-type-required">*</span>
                </label>
                <input
                  className="edit-subscription-type-input"
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Enter duration in days..."
                  min={1}
                  step={1}
                  required
                />
              </div>

              <div className="edit-subscription-type-field edit-subscription-type-field--textarea">
                <label className="edit-subscription-type-label">Description</label>
                <textarea
                  className="edit-subscription-type-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>

              {error ? <div className="edit-subscription-type-error">{error}</div> : null}
            </div>

            <div className="edit-subscription-type-footer">
              <button type="button" className="edit-subscription-type-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="edit-subscription-type-submit" disabled={isSubmitting}>
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
