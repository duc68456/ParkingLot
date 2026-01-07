import { useEffect, useMemo, useState } from 'react';
import '../styles/components/AddSubscriptionPricingModal.css';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export default function AddSubscriptionPricingModal({ onClose, onSubmit }) {
  const { authHeaders } = useAuth();

  const [cardCategoryId, setCardCategoryId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [subscriptionTypeId, setSubscriptionTypeId] = useState('');
  const [price, setPrice] = useState('');

  const [categories, setCategories] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [subscriptionTypes, setSubscriptionTypes] = useState([]);

  const [loadingLists, setLoadingLists] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedPrice = useMemo(() => String(price).trim(), [price]);

  const fetchJson = async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl, {
      ...options,
      headers: { ...authHeaders, ...(options.headers || {}) }
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = body?.error?.message || body?.message || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return body;
  };

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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingLists(true);
      setError('');
      try {
        const [catsRes, vtsRes, stsRes] = await Promise.all([
          fetchJson('/api/card-categories?page=1&limit=200'),
          fetchJson('/api/vehicle-types?page=1&limit=200'),
          fetchJson('/api/subscription-types?page=1&limit=200')
        ]);

        // Load employees for ChangedBy selection

        const catsRaw = catsRes?.data?.cardCategories;
        const cats = Array.isArray(catsRaw)
          ? catsRaw
          : Array.isArray(catsRaw?.items)
            ? catsRaw.items
            : [];

        const vtsRaw = vtsRes?.data?.vehicleTypes;
        const vts = Array.isArray(vtsRaw)
          ? vtsRaw
          : Array.isArray(vtsRaw?.items)
            ? vtsRaw.items
            : [];

        const stsRaw = stsRes?.data?.items;
        const sts = Array.isArray(stsRaw) ? stsRaw : [];

        if (cancelled) return;

        setCategories(
          cats.map((c) => ({ id: c?.ID, name: c?.Name })).filter((c) => c.id)
        );

        setVehicleTypes(
          vts.map((v) => ({ id: v?.VehicleTypeID, name: v?.Name })).filter((v) => v.id)
        );

        setSubscriptionTypes(
          sts.map((t) => ({ id: t?.ID, name: t?.TypeName })).filter((t) => t.id)
        );
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load dropdown data');
      } finally {
        if (!cancelled) setLoadingLists(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [authHeaders]);

  const validate = () => {
    if (!cardCategoryId) return 'Card Category is required.';
    if (!vehicleTypeId) return 'Vehicle Type is required.';
    if (!subscriptionTypeId) return 'Subscription Type is required.';

    const p = Number(trimmedPrice);
    if (!trimmedPrice) return 'Price is required.';
    if (!Number.isFinite(p) || Number.isNaN(p)) return 'Price must be a number.';
    if (p < 0) return 'Price must be non-negative.';

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
        CardCategoryID: cardCategoryId,
        VehicleTypeID: vehicleTypeId,
        SubscriptionTypeID: subscriptionTypeId,
        Price: Number(trimmedPrice)
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to create subscription pricing rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="add-subscription-pricing-overlay" onClick={handleOverlayClick} />
      <div className="add-subscription-pricing-wrapper" onClick={handleOverlayClick}>
        <div className="add-subscription-pricing-modal" role="dialog" aria-modal="true" aria-label="Add Subscription Pricing">
          <form onSubmit={handleSubmit}>
            <div className="add-subscription-pricing-header">
              <h3 className="add-subscription-pricing-title">Add Subscription Pricing</h3>
              <button
                type="button"
                className="add-subscription-pricing-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            <div className="add-subscription-pricing-body">
              <div className="add-subscription-pricing-grid">
                <div className="add-subscription-pricing-field">
                  <label className="add-subscription-pricing-label">Card Category</label>
                  <select
                    className="add-subscription-pricing-select"
                    value={cardCategoryId}
                    onChange={(e) => setCardCategoryId(e.target.value)}
                    disabled={loadingLists || isSubmitting}
                  >
                    <option value="">Select category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="add-subscription-pricing-field">
                  <label className="add-subscription-pricing-label">Vehicle Type</label>
                  <select
                    className="add-subscription-pricing-select"
                    value={vehicleTypeId}
                    onChange={(e) => setVehicleTypeId(e.target.value)}
                    disabled={loadingLists || isSubmitting}
                  >
                    <option value="">Select type...</option>
                    {vehicleTypes.map((v) => (
                      <option key={v.id} value={v.id}>{v.id} - {v.name}</option>
                    ))}
                  </select>
                </div>

                <div className="add-subscription-pricing-field">
                  <label className="add-subscription-pricing-label">Subscription Type</label>
                  <select
                    className="add-subscription-pricing-select"
                    value={subscriptionTypeId}
                    onChange={(e) => setSubscriptionTypeId(e.target.value)}
                    disabled={loadingLists || isSubmitting}
                  >
                    <option value="">Select type...</option>
                    {subscriptionTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.id} - {t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="add-subscription-pricing-field">
                  <label className="add-subscription-pricing-label">Price</label>
                  <div className="add-subscription-pricing-price-wrap">
                    <span className="add-subscription-pricing-dollar">$</span>
                    <input
                      className="add-subscription-pricing-price-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      disabled={loadingLists || isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {error ? <div className="add-subscription-pricing-error">{error}</div> : null}
            </div>

            <div className="add-subscription-pricing-footer">
              <button type="button" className="add-subscription-pricing-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="add-subscription-pricing-submit" disabled={isSubmitting || loadingLists}>
                Create Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
