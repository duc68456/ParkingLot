import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import PricingRulesTable from '../components/PricingRulesTable';
import CardPriceHistoryModal from '../components/CardPriceHistoryModal';
import EditCardPriceModal from '../components/EditCardPriceModal';
import '../styles/pages/PricingPage.css';

import addIcon from '../assets/icons/common/actions/add.svg';
import editIcon from '../assets/icons/common/actions/edit.svg';
import deleteIcon from '../assets/icons/common/actions/trash.svg';
import viewIcon from '../assets/icons/common/actions/view.svg';

import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Mock data for entry pricing rules
const mockEntryPricingRules = [
  {
    id: 'PR001',
    cardCategory: 'Standard',
    vehicleType: 'Car',
    startDate: '01/01/2024',
    endDate: 'Active',
    dayPrice: 20.00,
    firstHour: 5.00,
    nextHour: 3.00
  },
  {
    id: 'PR002',
    cardCategory: 'Premium',
    vehicleType: 'Car',
    startDate: '01/01/2024',
    endDate: 'Active',
    dayPrice: 15.00,
    firstHour: 4.00,
    nextHour: 2.00
  }
];

// Card pricing will be loaded from backend (CardCategory + CardPrice)

// Mock data for subscription pricing
const mockSubscriptionPricing = [
  {
    id: 'SPR001',
    cardCategory: 'Standard',
    vehicleType: 'Car',
    subscriptionType: 'Monthly',
    price: 100.00
  },
  {
    id: 'SPR002',
    cardCategory: 'Premium',
    vehicleType: 'Car',
    subscriptionType: 'Monthly',
    price: 80.00
  }
];

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('entry-pricing');
  const [pricingRules, setPricingRules] = useState(mockEntryPricingRules);
  const [cardPricing, setCardPricing] = useState([]);
  const [subscriptionPricing, setSubscriptionPricing] = useState(mockSubscriptionPricing);

  const [cardPricingLoading, setCardPricingLoading] = useState(false);
  const [cardPricingError, setCardPricingError] = useState('');

  const { authHeaders } = useAuth();

  // Card Pricing History Modal state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('Price History');
  const [historyCurrent, setHistoryCurrent] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Edit Card Price Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCurrentPrice, setEditCurrentPrice] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Map mock row (CAT001/Standard) -> backend CardCategoryID (e.g. "CAT001").
  // Assumption: your backend uses the CardCategory.ID string (not Mongo _id) as the identifier.
  const cardCategoryIdByName = useMemo(() => {
    const map = new Map();
    for (const row of cardPricing) {
      if (row?.category && row?.id) map.set(row.category, row.id);
    }
    return map;
  }, [cardPricing]);

  const closeHistory = () => {
    setIsHistoryOpen(false);
    setHistoryError('');
    setHistoryLoading(false);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditError('');
    setEditSaving(false);
  };

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

  const formatDate = (value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const loadCardPricing = async () => {
    setCardPricingLoading(true);
    setCardPricingError('');

    try {
      // 1) Load card categories
      const categoriesRes = await fetchJson('/api/card-categories?page=1&limit=200');
      const categoriesRaw = categoriesRes?.data?.cardCategories;
      const categories = Array.isArray(categoriesRaw)
        ? categoriesRaw
        : Array.isArray(categoriesRaw?.items)
          ? categoriesRaw.items
          : [];

      // 2) For each category, load current price (may 404 if none yet)
      const rows = await Promise.all(
        categories.map(async (cat) => {
          const categoryId = cat?.ID;
          let current = null;

          if (categoryId) {
            try {
              const currentRes = await fetchJson(`/api/card-prices/current/${encodeURIComponent(categoryId)}`);
              current = currentRes?.data || null;
            } catch (e) {
              // No current price yet is not fatal to the table
              const msg = e?.message || '';
              if (!/no current price/i.test(msg) && !/404/.test(msg)) {
                // Swallow only "no current" / 404; surface other errors.
                throw e;
              }
            }
          }

          return {
            id: categoryId || cat?.id,
            category: cat?.Name || '--',
            price: typeof current?.Price === 'number' ? current.Price : 0,
            lastUpdated: current?.StartDateApply ? formatDate(current.StartDateApply) : '--'
          };
        })
      );

      // Sort by category ID (matches Figma style table ordering)
      rows.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
      setCardPricing(rows);
    } catch (e) {
      setCardPricingError(e?.message || 'Failed to load card pricing');
      setCardPricing([]);
    } finally {
      setCardPricingLoading(false);
    }
  };

  // Load card pricing when switching to the tab (and whenever auth changes)
  useEffect(() => {
    if (activeTab !== 'card-pricing') return;
    loadCardPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authHeaders]);

  const handleViewCardPriceHistory = async (card) => {
    const cardCategoryId = cardCategoryIdByName.get(card.category) || card.id;
    setHistoryTitle(`Price History - ${card.category}`);
    setHistoryCurrent(null);
    setHistoryItems([]);
    setHistoryError('');
    setIsHistoryOpen(true);
    setHistoryLoading(true);

    try {
      const [currentRes, historyRes] = await Promise.all([
        fetchJson(`/api/card-prices/current/${encodeURIComponent(cardCategoryId)}`),
        fetchJson(`/api/card-prices/history/${encodeURIComponent(cardCategoryId)}?page=1&limit=20`)
      ]);

      setHistoryCurrent(currentRes?.data || null);
      setHistoryItems(historyRes?.data?.items || []);
    } catch (e) {
      setHistoryError(e?.message || 'Failed to load price history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // If authHeaders change while modal is open, refresh.
  useEffect(() => {
    if (!isHistoryOpen) return;
    // No automatic refresh without knowing which category is open.
  }, [authHeaders, isHistoryOpen]);

  const tabs = [
    { id: 'entry-pricing', label: 'Entry Pricing' },
    { id: 'card-pricing', label: 'Card Pricing' },
    { id: 'subscription-pricing', label: 'Subscription Pricing' }
  ];

  const handleAddPricingRule = () => {
    alert('Add Pricing Rule functionality coming soon!');
  };

  const handleEditRule = (rule) => {
    alert(`Edit pricing rule: ${rule.id}`);
  };

  const handleDeleteRule = (rule) => {
    if (confirm(`Are you sure you want to delete pricing rule ${rule.id}?`)) {
      setPricingRules(pricingRules.filter(r => r.id !== rule.id));
      alert(`Pricing rule ${rule.id} deleted successfully!`);
    }
  };

  const handleEditCardPrice = async (card) => {
    const cardCategoryId = cardCategoryIdByName.get(card.category) || card.id;

    setEditCategoryId(cardCategoryId);
    setEditCategoryName(card.category);
    setEditCurrentPrice(typeof card.price === 'number' ? card.price : 0);
    setEditError('');
    setIsEditOpen(true);

    // Best-effort refresh current price right before editing
    try {
      const currentRes = await fetchJson(`/api/card-prices/current/${encodeURIComponent(cardCategoryId)}`);
      const current = currentRes?.data || null;
      if (typeof current?.Price === 'number') setEditCurrentPrice(current.Price);
    } catch {
      // Ignore; user can still set a new price.
    }
  };

  const handleSubmitEditCardPrice = async ({ newPrice, reason }) => {
    setEditSaving(true);
    setEditError('');

    try {
      // Server currently requires ChangedBy, but we'll add a safer endpoint next.
      await fetchJson('/api/card-prices/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CardCategoryID: editCategoryId,
          Price: newPrice,
          Reason: reason
        })
      });

      closeEdit();
      await loadCardPricing();
    } catch (e) {
      setEditError(e?.message || 'Failed to update price');
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddSubscriptionRule = () => {
    alert('Add Subscription Pricing Rule functionality coming soon!');
  };

  const handleEditSubscriptionRule = (rule) => {
    alert(`Edit subscription pricing rule: ${rule.id}`);
  };

  const handleDeleteSubscriptionRule = (rule) => {
    if (confirm(`Are you sure you want to delete subscription pricing rule ${rule.id}?`)) {
      setSubscriptionPricing(subscriptionPricing.filter(r => r.id !== rule.id));
      alert(`Subscription pricing rule ${rule.id} deleted successfully!`);
    }
  };

  return (
    <div className="pricing-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Config Price</h2>
        <p className="page-subtitle">Manage pricing rules and configurations</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation-wrapper">
        <div className="tab-navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Pricing Tab Content */}
      {activeTab === 'entry-pricing' && (
        <div className="pricing-content">
          {/* Add Pricing Rule Button */}
          <div className="add-rule-section">
            <button className="btn-add-rule" onClick={handleAddPricingRule}>
              <img src={addIcon} alt="" className="btn-icon" />
              Add Pricing Rule
            </button>
          </div>

          {/* Pricing Rules Table */}
          <PricingRulesTable 
            pricingRules={pricingRules}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
          />
        </div>
      )}

      {/* Card Pricing Tab Content */}
      {activeTab === 'card-pricing' && (
        <div className="pricing-content">
          {/* Card Pricing Table */}
          <div className="data-table">
            {cardPricingError && (
              <div className="cphm-state cphm-error" style={{ padding: '12px 24px' }}>
                {cardPricingError}
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>LAST UPDATED</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {cardPricingLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '21.2px 24px' }}>
                      Loading...
                    </td>
                  </tr>
                ) : (
                  cardPricing.map((card) => (
                  <tr key={card.id}>
                    <td className="card-id-cell">{card.id}</td>
                    <td>{card.category}</td>
                    <td>${card.price.toFixed(2)}</td>
                    <td>{card.lastUpdated}</td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          className="action-btn"
                          onClick={() => handleViewCardPriceHistory(card)}
                          title="View Price History"
                        >
                          <img src={viewIcon} alt="View" width="16" height="16" />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleEditCardPrice(card)}
                          title="Edit"
                        >
                          <img src={editIcon} alt="Edit" width="16" height="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{cardPricing.length}</span> results
              </p>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardPriceHistoryModal
        isOpen={isHistoryOpen}
        title={historyTitle}
        currentPrice={historyCurrent}
        historyItems={historyItems}
        isLoading={historyLoading}
        error={historyError}
        onClose={closeHistory}
      />

      <EditCardPriceModal
        isOpen={isEditOpen}
        categoryName={editCategoryName}
        currentPrice={editCurrentPrice}
        isSaving={editSaving}
        error={editError}
        onClose={closeEdit}
        onSubmit={handleSubmitEditCardPrice}
      />

      {/* Subscription Pricing Tab Content */}
      {activeTab === 'subscription-pricing' && (
        <div className="pricing-content">
          {/* Add Subscription Rule Button */}
          <div className="add-rule-section">
            <button className="btn-add-rule" onClick={handleAddSubscriptionRule}>
              <img src={addIcon} alt="" className="btn-icon" />
              Add Rule
            </button>
          </div>

          {/* Subscription Pricing Table */}
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CARD CATEGORY</th>
                  <th>VEHICLE TYPE</th>
                  <th>SUB. TYPE</th>
                  <th>PRICE</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionPricing.map((rule) => (
                  <tr key={rule.id}>
                    <td className="card-id-cell">{rule.id}</td>
                    <td>{rule.cardCategory}</td>
                    <td>{rule.vehicleType}</td>
                    <td>{rule.subscriptionType}</td>
                    <td>${rule.price.toFixed(2)}</td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          className="action-btn"
                          onClick={() => handleEditSubscriptionRule(rule)}
                          title="Edit"
                        >
                          <img src={editIcon} alt="Edit" width="16" height="16" />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleDeleteSubscriptionRule(rule)}
                          title="Delete"
                        >
                          <img src={deleteIcon} alt="Delete" width="16" height="16" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{subscriptionPricing.length}</span> results
              </p>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
