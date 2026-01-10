import { useEffect, useMemo, useState } from 'react';
import '../styles/components/EditEntryPricingModal.css';

export default function EditEntryPricingModal({
  isOpen,
  mode = 'edit', // 'edit' | 'create'
  rule,
  cardCategoryOptions = [],
  vehicleTypeOptions = [],
  isSaving,
  error,
  onClose,
  onSubmit
}) {
  // In create mode these hold selected IDs (CardCategoryID / VehicleTypeID)
  const [cardCategoryId, setCardCategoryId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [dayPrice, setDayPrice] = useState('');
  const [firstHour, setFirstHour] = useState('');
  const [nextHour, setNextHour] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCardCategoryId(rule?.cardCategoryId || '');
    setVehicleTypeId(rule?.vehicleTypeId || '');
    setDayPrice(typeof rule?.dayPrice === 'number' ? String(rule.dayPrice) : '');
    setFirstHour(typeof rule?.firstHour === 'number' ? String(rule.firstHour) : '');
    setNextHour(typeof rule?.nextHour === 'number' ? String(rule.nextHour) : '');
    setReason('');
    setTouched(false);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, rule]);

  const validationError = useMemo(() => {
    if (!touched) return '';

    const toNum = (v) => Number(v);
    const nums = [
      { label: 'Day Price', value: dayPrice },
      { label: 'First Hour Price', value: firstHour },
      { label: 'Next Hour Price', value: nextHour }
    ];

    for (const n of nums) {
      const v = toNum(n.value);
      if (n.value === '' || Number.isNaN(v)) return `${n.label} is required`;
      if (!Number.isFinite(v)) return `${n.label} is invalid`;
      if (v < 0) return `${n.label} must be non-negative`;
    }

    // In edit mode, category/type are not editable (per design), so don't validate.
    if (mode === 'create') {
      if (!cardCategoryId.trim()) return 'Card Category is required';
      if (!vehicleTypeId.trim()) return 'Vehicle Type is required';
    } else {
      if (!reason.trim()) return 'Reason is required';
    }

    return '';
  }, [touched, mode, cardCategoryId, vehicleTypeId, dayPrice, firstHour, nextHour, reason]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (validationError) return;

    await onSubmit?.({
      id: rule?.id,
      // In edit mode, backend/state already knows these values.
      ...(mode === 'create'
        ? {
          cardCategoryId: cardCategoryId.trim(),
          vehicleTypeId: vehicleTypeId.trim()
        }
        : {
          reason: reason.trim()
        }),
      dayPrice: Number(dayPrice),
      firstHour: Number(firstHour),
      nextHour: Number(nextHour)
    });
  };

  const isBusy = Boolean(isSaving);
  const title = mode === 'create' ? 'Add Pricing Rule' : 'Edit Pricing Rule';
  const primaryLabel = mode === 'create' ? 'Create Rule' : 'Update Rule';

  return (
    <div className="eepm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
      <form className="eepm-modal" onSubmit={submit}>
        <div className="eepm-header">
          <h3 className="eepm-title">{title}</h3>
          <button className="eepm-close" type="button" onClick={onClose} aria-label="Close" disabled={isBusy}>
            ×
          </button>
        </div>

        <div className="eepm-body">
          {error && <div className="eepm-state eepm-error">{error}</div>}

          {mode === 'create' ? (
            <div className="eepm-grid2">
              <div className="eepm-field">
                <label className="eepm-label">Card Category</label>
                <select
                  className="eepm-input"
                  value={cardCategoryId}
                  onChange={(e) => setCardCategoryId(e.target.value)}
                  disabled={isBusy}
                >
                  <option value="">Select category...</option>
                  {cardCategoryOptions.map((opt) => (
                    <option key={String(opt?.id ?? opt)} value={String(opt?.id ?? opt)}>
                      {String(opt?.name ?? opt)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="eepm-field">
                <label className="eepm-label">Vehicle Type</label>
                <select
                  className="eepm-input"
                  value={vehicleTypeId}
                  onChange={(e) => setVehicleTypeId(e.target.value)}
                  disabled={isBusy}
                >
                  <option value="">Select type...</option>
                  {vehicleTypeOptions.map((opt) => (
                    <option key={String(opt?.id ?? opt)} value={String(opt?.id ?? opt)}>
                      {String(opt?.name ?? opt)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="eepm-note">
            <div className="eepm-note-text">
              <strong>Note:</strong> Start date will be automatically set to now. When you create a new pricing rule, the previous rule&apos;s end date will be automatically set to maintain pricing history.
            </div>
          </div>

          <div className="eepm-grid3">
            <div className="eepm-field">
              <label className="eepm-label">Day Price</label>
              <div className="eepm-money">
                <span className="eepm-money-prefix">$</span>
                <input
                  className="eepm-input eepm-input-money"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={dayPrice}
                  onChange={(e) => setDayPrice(e.target.value)}
                  onBlur={() => setTouched(true)}
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="eepm-field">
              <label className="eepm-label">First Hour Price</label>
              <div className="eepm-money">
                <span className="eepm-money-prefix">$</span>
                <input
                  className="eepm-input eepm-input-money"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={firstHour}
                  onChange={(e) => setFirstHour(e.target.value)}
                  onBlur={() => setTouched(true)}
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="eepm-field">
              <label className="eepm-label">Next Hour Price</label>
              <div className="eepm-money">
                <span className="eepm-money-prefix">$</span>
                <input
                  className="eepm-input eepm-input-money"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={nextHour}
                  onChange={(e) => setNextHour(e.target.value)}
                  onBlur={() => setTouched(true)}
                  disabled={isBusy}
                />
              </div>
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="eepm-field" style={{ marginTop: '12px' }}>
              <label className="eepm-label">Reason</label>
              <textarea
                className="eepm-input"
                rows={3}
                placeholder="Why are you changing this pricing rule?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => setTouched(true)}
                disabled={isBusy}
              />
            </div>
          ) : null}

          {validationError && <div className="eepm-validation">{validationError}</div>}
        </div>

        <div className="eepm-footer">
          <button className="eepm-btn eepm-btn-secondary" type="button" onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button className="eepm-btn eepm-btn-primary" type="submit" disabled={isBusy}>
            {isBusy ? 'Saving...' : primaryLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
