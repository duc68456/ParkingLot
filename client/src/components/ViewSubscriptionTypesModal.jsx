import { useEffect, useState } from 'react';
import '../styles/components/ViewSubscriptionTypesModal.css';
import SubscriptionPriceHistoryModal from './SubscriptionPriceHistoryModal';
import AddSubscriptionPricingModal from './AddSubscriptionPricingModal';
import EditSubscriptionPricingModal from './EditSubscriptionPricingModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `$${Number(value).toFixed(2)}`;
}

// Inline History Icon
const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V8L10.5 10.5" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C9.8 2 11.4 2.8 12.5 4" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Inline Edit Icon
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Inline Add Icon
const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 3.33333V12.6667M3.33333 8H12.6667" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function ViewSubscriptionTypesModal({
  isOpen,
  subscriptionType,
  onClose,
  authHeaders,
  user
}) {
  const [pricingRules, setPricingRules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // History modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyRule, setHistoryRule] = useState(null);
  const [historyCurrent, setHistoryCurrent] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Add/Edit pricing modal state
  const [isAddPricingOpen, setIsAddPricingOpen] = useState(false);
  const [isEditPricingOpen, setIsEditPricingOpen] = useState(false);
  const [selectedRuleForEdit, setSelectedRuleForEdit] = useState(null);
  const [editPricingSaving, setEditPricingSaving] = useState(false);
  const [editPricingError, setEditPricingError] = useState('');

  useEffect(() => {
    if (!isOpen || !subscriptionType) return;

    const fetchPricingRules = async () => {
      setIsLoading(true);
      setError('');

      try {
        const subscriptionTypeId = subscriptionType.ID || subscriptionType.id;
        const rulesRes = await fetch(
          `${API_BASE_URL}/api/subscription-pricing-rules?subscriptionTypeId=${encodeURIComponent(subscriptionTypeId)}&limit=100`,
          { headers: { ...authHeaders } }
        );

        const rulesJson = await rulesRes.json().catch(() => null);
        if (!rulesRes.ok) {
          throw new Error(rulesJson?.error?.message || 'Failed to fetch pricing rules');
        }

        const rulesList = Array.isArray(rulesJson?.data?.items) ? rulesJson.data.items : [];

        // Fetch current price for each rule
        const rulesWithPrices = await Promise.all(
          rulesList.map(async (rule) => {
            try {
              const priceRes = await fetch(
                `${API_BASE_URL}/api/subscription-pricing-rule-details/current/${encodeURIComponent(rule.ID || rule.id)}`,
                { headers: { ...authHeaders } }
              );
              const priceJson = await priceRes.json().catch(() => null);
              return {
                ...rule,
                currentPrice: priceRes.ok ? priceJson?.data : null
              };
            } catch {
              return { ...rule, currentPrice: null };
            }
          })
        );

        // Sort by currentPrice descending (highest first)
        rulesWithPrices.sort((a, b) => {
          const priceA = a.currentPrice?.Price ?? 0;
          const priceB = b.currentPrice?.Price ?? 0;
          return priceB - priceA;
        });

        setPricingRules(rulesWithPrices);
      } catch (err) {
        console.error('Failed to fetch pricing rules:', err);
        setError(err?.message || 'Failed to load pricing rules');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPricingRules();
  }, [isOpen, subscriptionType, authHeaders]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleViewHistory = async (rule) => {
    setIsHistoryOpen(true);
    setHistoryRule({
      cardCategory: rule.CardCategory?.Name || '--',
      vehicleType: rule.VehicleType?.Name || '--',
      subscriptionType: rule.SubscriptionType?.TypeName || subscriptionType.TypeName || subscriptionType.name || '--'
    });
    setHistoryCurrent(rule.currentPrice || null);
    setHistoryLoading(true);
    setHistoryError('');

    try {
      const ruleId = rule.ID || rule.id;
      const historyRes = await fetch(
        `${API_BASE_URL}/api/subscription-pricing-rule-details/history/${encodeURIComponent(ruleId)}?limit=50`,
        { headers: { ...authHeaders } }
      );

      const historyJson = await historyRes.json().catch(() => null);
      if (!historyRes.ok) {
        throw new Error(historyJson?.error?.message || 'Failed to fetch pricing history');
      }

      setHistoryItems(Array.isArray(historyJson?.data?.items) ? historyJson.data.items : []);
    } catch (err) {
      console.error('Failed to fetch pricing history:', err);
      setHistoryError(err?.message || 'Failed to load pricing history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setIsHistoryOpen(false);
    setHistoryRule(null);
    setHistoryCurrent(null);
    setHistoryItems([]);
    setHistoryError('');
  };

  const handleAddPricingRule = () => {
    setIsAddPricingOpen(true);
  };

  const handleCloseAddPricing = () => {
    setIsAddPricingOpen(false);
  };

  const handleSubmitAddPricing = async (payload) => {
    try {
      const subscriptionTypeId = subscriptionType.ID || subscriptionType.id;

      // Create subscription pricing rule first
      const ruleRes = await fetch(`${API_BASE_URL}/api/subscription-pricing-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          CardCategoryID: payload.CardCategoryID,
          VehicleTypeID: payload.VehicleTypeID,
          SubscriptionTypeID: subscriptionTypeId
        })
      });

      const ruleJson = await ruleRes.json().catch(() => null);
      if (!ruleRes.ok) {
        throw new Error(ruleJson?.error?.message || 'Failed to create subscription pricing rule');
      }

      const createdRule = ruleJson?.data;
      const ruleId = createdRule?.ID || createdRule?.id;

      // Get employee business ID from user context
      const employeeBusinessId = user?.employeeBusinessId || user?.employeeId;
      if (!employeeBusinessId) {
        throw new Error('Employee information not found. Please log in again.');
      }

      // Create initial price detail
      const priceRes = await fetch(`${API_BASE_URL}/api/subscription-pricing-rule-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          SubscriptionPricingRuleID: ruleId,
          Price: payload.Price,
          StartDateApply: new Date().toISOString(),
          ChangedBy: employeeBusinessId,
          Reason: 'Initial price'
        })
      });

      const priceJson = await priceRes.json().catch(() => null);
      if (!priceRes.ok) {
        throw new Error(priceJson?.error?.message || 'Failed to create price detail');
      }

      // Refresh the pricing rules list
      const rulesRes = await fetch(
        `${API_BASE_URL}/api/subscription-pricing-rules?subscriptionTypeId=${encodeURIComponent(subscriptionTypeId)}&limit=100`,
        { headers: { ...authHeaders } }
      );

      const rulesJson = await rulesRes.json().catch(() => null);
      if (rulesRes.ok) {
        const rulesList = Array.isArray(rulesJson?.data?.items) ? rulesJson.data.items : [];
        const rulesWithPrices = await Promise.all(
          rulesList.map(async (rule) => {
            try {
              const priceRes = await fetch(
                `${API_BASE_URL}/api/subscription-pricing-rule-details/current/${encodeURIComponent(rule.ID || rule.id)}`,
                { headers: { ...authHeaders } }
              );
              const priceJson = await priceRes.json().catch(() => null);
              return {
                ...rule,
                currentPrice: priceRes.ok ? priceJson?.data : null
              };
            } catch {
              return { ...rule, currentPrice: null };
            }
          })
        );
        // Sort by currentPrice descending
        rulesWithPrices.sort((a, b) => (b.currentPrice?.Price ?? 0) - (a.currentPrice?.Price ?? 0));
        setPricingRules(rulesWithPrices);
      }

      setIsAddPricingOpen(false);
    } catch (err) {
      throw new Error(err?.message || 'Failed to add pricing rule');
    }
  };

  const handleEditPricingRule = (rule) => {
    setSelectedRuleForEdit(rule);
    setIsEditPricingOpen(true);
  };

  const handleCloseEditPricing = () => {
    setIsEditPricingOpen(false);
    setSelectedRuleForEdit(null);
    setEditPricingSaving(false);
    setEditPricingError('');
  };

  const handleSubmitEditPricing = async ({ newPrice, reason }) => {
    setEditPricingSaving(true);
    setEditPricingError('');

    try {
      const ruleId = selectedRuleForEdit?.ID || selectedRuleForEdit?.id;

      // Get employee business ID from user context
      const employeeBusinessId = user?.employeeBusinessId || user?.employeeId;
      if (!employeeBusinessId) {
        throw new Error('Employee information not found. Please log in again.');
      }

      const res = await fetch(`${API_BASE_URL}/api/subscription-pricing-rule-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          SubscriptionPricingRuleID: ruleId,
          Price: Number(newPrice),
          StartDateApply: new Date().toISOString(),
          ChangedBy: employeeBusinessId,
          Reason: reason || 'Price update'
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to update price');
      }

      // Refresh the pricing rules list
      const subscriptionTypeId = subscriptionType.ID || subscriptionType.id;
      const rulesRes = await fetch(
        `${API_BASE_URL}/api/subscription-pricing-rules?subscriptionTypeId=${encodeURIComponent(subscriptionTypeId)}&limit=100`,
        { headers: { ...authHeaders } }
      );

      const rulesJson = await rulesRes.json().catch(() => null);
      if (rulesRes.ok) {
        const rulesList = Array.isArray(rulesJson?.data?.items) ? rulesJson.data.items : [];
        const rulesWithPrices = await Promise.all(
          rulesList.map(async (rule) => {
            try {
              const priceRes = await fetch(
                `${API_BASE_URL}/api/subscription-pricing-rule-details/current/${encodeURIComponent(rule.ID || rule.id)}`,
                { headers: { ...authHeaders } }
              );
              const priceJson = await priceRes.json().catch(() => null);
              return {
                ...rule,
                currentPrice: priceRes.ok ? priceJson?.data : null
              };
            } catch {
              return { ...rule, currentPrice: null };
            }
          })
        );
        // Sort by currentPrice descending
        rulesWithPrices.sort((a, b) => (b.currentPrice?.Price ?? 0) - (a.currentPrice?.Price ?? 0));
        setPricingRules(rulesWithPrices);
      }

      setIsEditPricingOpen(false);
      setSelectedRuleForEdit(null);
      setEditPricingSaving(false);
    } catch (err) {
      console.error('Failed to update price:', err);
      setEditPricingError(err?.message || 'Failed to update price');
    } finally {
      setEditPricingSaving(false);
    }
  };

  return (
    <>
      <div className="vstm-overlay" onMouseDown={overlayClick} role="dialog" aria-modal="true">
        <div className="vstm-modal">
          <div className="vstm-header">
            <h3 className="vstm-title">
              Pricing Rules - {subscriptionType?.TypeName || subscriptionType?.name || 'Subscription Type'}
            </h3>
            <button className="vstm-close" type="button" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="vstm-body">
            {/* Subscription Type Info */}
            <div className="vstm-info-section">
              <div className="vstm-info-grid">
                <div className="vstm-info-field">
                  <div className="vstm-info-label">Type ID</div>
                  <div className="vstm-info-value">{subscriptionType?.ID || subscriptionType?.id}</div>
                </div>
                <div className="vstm-info-field">
                  <div className="vstm-info-label">Duration</div>
                  <div className="vstm-info-value">{subscriptionType?.DurationDays || subscriptionType?.duration} days</div>
                </div>
                <div className="vstm-info-field vstm-info-field-full">
                  <div className="vstm-info-label">Description</div>
                  <div className="vstm-info-value">{subscriptionType?.Description || subscriptionType?.description || '--'}</div>
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="vstm-add-section">
              <button className="vstm-add-btn" onClick={handleAddPricingRule}>
                <AddIcon />
                Add Pricing Rule
              </button>
            </div>

            {/* Pricing Rules Table */}
            {isLoading ? (
              <div className="vstm-state">Loading pricing rules...</div>
            ) : error ? (
              <div className="vstm-state vstm-error">{error}</div>
            ) : pricingRules.length === 0 ? (
              <div className="vstm-empty">
                <div className="vstm-empty-icon" aria-hidden="true">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="6" y="10" width="36" height="32" rx="2" stroke="#CBD5E1" strokeWidth="3" fill="none" />
                    <path d="M14 18H34M14 26H34M14 34H26" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="vstm-empty-text">No pricing rules found</div>
                <div className="vstm-empty-subtext">Add pricing rules to define prices for different card categories and vehicle types</div>
              </div>
            ) : (
              <div className="vstm-table-wrapper">
                <table className="vstm-table">
                  <thead>
                    <tr>
                      <th>CARD CATEGORY</th>
                      <th>VEHICLE TYPE</th>
                      <th className="text-right">CURRENT PRICE</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pricingRules.map((rule) => (
                      <tr key={rule.ID || rule.id}>
                        <td>{rule.CardCategory?.Name || '--'}</td>
                        <td>{rule.VehicleType?.Name || '--'}</td>
                        <td className="text-right vstm-price-cell">
                          {formatMoney(rule.currentPrice?.Price)}
                        </td>
                        <td>
                          <div className="action-buttons action-buttons-right">
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEditPricingRule(rule)}
                              title="Edit Price"
                            >
                              <EditIcon />
                            </button>
                            <button
                              className="action-btn action-btn--history"
                              onClick={() => handleViewHistory(rule)}
                              title="View History"
                            >
                              <HistoryIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="vstm-footer">
            <button type="button" className="vstm-btn-close" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {/* History Modal */}
      <SubscriptionPriceHistoryModal
        isOpen={isHistoryOpen}
        title={`Pricing History - ${historyRule?.cardCategory} / ${historyRule?.vehicleType} / ${historyRule?.subscriptionType}`}
        rule={historyRule}
        currentPrice={historyCurrent}
        historyItems={historyItems}
        isLoading={historyLoading}
        error={historyError}
        onClose={handleCloseHistory}
      />

      {/* Add Pricing Modal */}
      {isAddPricingOpen && (
        <AddSubscriptionPricingModal
          onClose={handleCloseAddPricing}
          onSubmit={handleSubmitAddPricing}
          prefilledSubscriptionTypeId={subscriptionType?.ID || subscriptionType?.id}
        />
      )}

      {/* Edit Pricing Modal */}
      {isEditPricingOpen && selectedRuleForEdit && (
        <EditSubscriptionPricingModal
          isOpen={isEditPricingOpen}
          rule={{
            id: selectedRuleForEdit.ID || selectedRuleForEdit.id,
            cardCategory: selectedRuleForEdit.CardCategory?.Name || '--',
            vehicleType: selectedRuleForEdit.VehicleType?.Name || '--',
            subscriptionType: selectedRuleForEdit.SubscriptionType?.TypeName || subscriptionType?.TypeName || subscriptionType?.name || '--',
            currentPrice: selectedRuleForEdit.currentPrice?.Price || 0
          }}
          isSaving={editPricingSaving}
          error={editPricingError}
          onClose={handleCloseEditPricing}
          onSubmit={handleSubmitEditPricing}
        />
      )}
    </>
  );
}
