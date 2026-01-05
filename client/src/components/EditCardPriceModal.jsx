import { useEffect, useMemo, useState } from 'react';
import '../styles/components/EditCardPriceModal.css';

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

export default function EditCardPriceModal({
  isOpen,
  categoryName,
  currentPrice,
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

    // Reset form each time modal opens
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
    await onSubmit?.({ newPrice: n, reason: reason?.trim() || null });
  };

  const isBusy = Boolean(isSaving);

  return (
    <div className="ecpm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <form className="ecpm-modal" onSubmit={submit}>
        <div className="ecpm-header">
          <h3 className="ecpm-title">Edit Card Price - {categoryName || ''}</h3>
          <button className="ecpm-close" type="button" onClick={onClose} aria-label="Close" disabled={isBusy}>
            ×
          </button>
        </div>

        <div className="ecpm-body">
          {error && <div className="ecpm-state ecpm-error">{error}</div>}

          <div className="ecpm-field">
            <label className="ecpm-label">Category Name</label>
            <div className="ecpm-input ecpm-input-readonly" aria-readonly="true">
              {categoryName || '--'}
            </div>
          </div>

          <div className="ecpm-field">
            <label className="ecpm-label">Current Price</label>
            <div className="ecpm-money-wrap">
              <span className="ecpm-money-prefix">$</span>
              <div className="ecpm-input ecpm-input-readonly" aria-readonly="true">
                {currentPrice === null || currentPrice === undefined ? '--' : Number(currentPrice).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="ecpm-field">
            <label className="ecpm-label">
              New Price <span className="ecpm-required">*</span>
            </label>
            <div className="ecpm-money-wrap">
              <span className="ecpm-money-prefix">$</span>
              <input
                className="ecpm-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={isBusy}
              />
            </div>
            {validationError && <div className="ecpm-validation">{validationError}</div>}
          </div>

          <div className="ecpm-field">
            <label className="ecpm-label">Reason for Change</label>
            <textarea
              className="ecpm-textarea"
              placeholder="Enter reason for price change..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isBusy}
              rows={4}
            />
          </div>
        </div>

        <div className="ecpm-footer">
          <button className="ecpm-btn ecpm-btn-secondary" type="button" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="ecpm-btn ecpm-btn-primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Updating...' : 'Update Price'}
          </button>
        </div>
      </form>
    </div>
  );
}
