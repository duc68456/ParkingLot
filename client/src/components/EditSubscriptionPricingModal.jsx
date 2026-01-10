import { useEffect, useMemo, useState } from 'react';
import '../styles/components/EditSubscriptionPricingModal.css';

export default function EditSubscriptionPricingModal({
  isOpen,
  rule,
  isSaving,
  error,
  onClose,
  onSubmit
}) {
  const [newPrice, setNewPrice] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setNewPrice('');
  setReason('');
    setTouched(false);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const validationError = useMemo(() => {
    if (!touched) return '';

    const n = Number(newPrice);
    if (newPrice === '' || Number.isNaN(n)) return 'New price is required';
    if (!Number.isFinite(n)) return 'New price is invalid';
    if (n < 0) return 'New price must be non-negative';
    return '';
  }, [newPrice, touched]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (validationError) return;

    const n = Number(newPrice);
    await onSubmit?.({ newPrice: n, reason: reason?.trim() ? reason.trim() : null });
  };

  const isBusy = Boolean(isSaving);

  return (
    <div className="espm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <form className="espm-modal" onSubmit={submit}>
        <div className="espm-header">
          <h3 className="espm-title">Edit Subscription Pricing</h3>
          <button className="espm-close" type="button" onClick={onClose} aria-label="Close" disabled={isBusy}>
            ×
          </button>
        </div>

        <div className="espm-body">
          {error && <div className="espm-state espm-error">{error}</div>}

          <div className="espm-info">
            <div className="espm-info-col">
              <div className="espm-info-label">Card Category</div>
              <div className="espm-info-value">{rule?.cardCategory || '--'}</div>
            </div>
            <div className="espm-info-col">
              <div className="espm-info-label">Vehicle Type</div>
              <div className="espm-info-value">{rule?.vehicleType || '--'}</div>
            </div>
            <div className="espm-info-col">
              <div className="espm-info-label">Subscription Type</div>
              <div className="espm-info-value">{rule?.subscriptionType || '--'}</div>
            </div>
          </div>

          <div className="espm-price">
            <label className="espm-price-label">Price</label>
            <div className="espm-money-wrap">
              <span className="espm-money-prefix">$</span>
              <input
                className="espm-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={isBusy}
              />
            </div>
            {validationError && <div className="espm-validation">{validationError}</div>}
          </div>

          <div className="espm-price">
            <label className="espm-price-label">Reason</label>
            <input
              className="espm-input"
              type="text"
              placeholder="Optional"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isBusy}
            />
          </div>
        </div>

        <div className="espm-footer">
          <button className="espm-btn espm-btn-secondary" type="button" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="espm-btn espm-btn-primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Updating...' : 'Update Rule'}
          </button>
        </div>
      </form>
    </div>
  );
}
