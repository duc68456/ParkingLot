import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import PricingRulesTable from '../components/PricingRulesTable';
import CardPriceHistoryModal from '../components/CardPriceHistoryModal';
import EditCardPriceModal from '../components/EditCardPriceModal';
import AddSubscriptionPricingModal from '../components/AddSubscriptionPricingModal';
import EditSubscriptionPricingModal from '../components/EditSubscriptionPricingModal';
import SubscriptionPriceHistoryModal from '../components/SubscriptionPriceHistoryModal';
import EditEntryPricingModal from '../components/EditEntryPricingModal';
import EntryPricingHistoryModal from '../components/EntryPricingHistoryModal';
import '../styles/pages/PricingPage.css';

import addIcon from '../assets/icons/common/actions/add.svg';
import editIcon from '../assets/icons/common/actions/edit.svg';
import viewIcon from '../assets/icons/common/actions/view.svg';

import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const normalizeSinglePricingRule = (rule) => {
  const cardCategory = rule?.CardCategory;
  const vehicleType = rule?.VehicleType;
  const changedByEmployee = rule?.ChangedByEmployee;
  const changedByPerson = changedByEmployee?.Person;

  return {
    // Mongo id for row key / potential admin delete
    mongoId: rule?.id ?? rule?._id,
    // Business ID (chain reference)
    id: rule?.ID || rule?.id || rule?._id,
    cardCategory: cardCategory?.Name || '--',
    cardCategoryId: cardCategory?.ID || rule?.CardCategoryID,
    vehicleType: vehicleType?.Name || '--',
    vehicleTypeId: vehicleType?.VehicleTypeID || rule?.VehicleTypeID,
    startDate: rule?.StartDateApply || null,
    endDate: null,
    dayPrice: typeof rule?.DayPrice === 'number' ? rule.DayPrice : 0,
    firstHour: typeof rule?.HourPrice === 'number' ? rule.HourPrice : 0,
    nextHour: typeof rule?.NextHourPrice === 'number' ? rule.NextHourPrice : 0,
    // Display-friendly name and raw IDs
    changedBy: changedByPerson?.FullName || changedByPerson?.fullName || changedByEmployee?.ID || rule?.ChangedBy,
    changedByEmployeeId: changedByEmployee?.ID || rule?.ChangedBy,
    reason: rule?.Reason || null
  };
};

// Card pricing will be loaded from backend (CardCategory + CardPrice)

const normalizeSubscriptionPricingRule = (rule, currentPrice) => {
  // Server may return hydrated objects as CardCategory/VehicleType/SubscriptionType.
  // Legacy responses might send them as CardCategoryID/VehicleTypeID/SubscriptionTypeID (either strings or populated docs).
  const cardCategory = rule?.CardCategory || rule?.CardCategoryID;
  const vehicleType = rule?.VehicleType || rule?.VehicleTypeID;
  const subscriptionType = rule?.SubscriptionType || rule?.SubscriptionTypeID;
  return {
    // Mongo id: used for delete GET/DELETE endpoints
    mongoId: rule?.id ?? rule?._id,
    // Business ID: used for pricing detail endpoints (current/history/change)
    id: rule?.ID || rule?.id || rule?._id,
    cardCategory: cardCategory?.Name || cardCategory?.name || '--',
    cardCategoryId: cardCategory?.ID || (typeof rule?.CardCategoryID === 'string' ? rule.CardCategoryID : ''),
    vehicleType: vehicleType?.Name || vehicleType?.name || '--',
    vehicleTypeId: vehicleType?.VehicleTypeID || (typeof rule?.VehicleTypeID === 'string' ? rule.VehicleTypeID : ''),
    subscriptionType: subscriptionType?.TypeName || subscriptionType?.typeName || '--',
    subscriptionTypeId: subscriptionType?.ID || (typeof rule?.SubscriptionTypeID === 'string' ? rule.SubscriptionTypeID : ''),
    price: typeof currentPrice?.Price === 'number' ? currentPrice.Price : 0
  };
};

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('entry-pricing');
  const [pricingRules, setPricingRules] = useState([]);
  const [entryPricingLoading, setEntryPricingLoading] = useState(false);
  const [entryPricingError, setEntryPricingError] = useState('');

  const [cardPricing, setCardPricing] = useState([]);
  const [subscriptionPricing, setSubscriptionPricing] = useState([]);

  const [subscriptionPricingLoading, setSubscriptionPricingLoading] = useState(false);
  const [subscriptionPricingError, setSubscriptionPricingError] = useState('');

  // Subscription pricing history modal state
  const [isSubHistoryOpen, setIsSubHistoryOpen] = useState(false);
  const [subHistoryTitle, setSubHistoryTitle] = useState('Subscription Pricing History');
  const [subHistoryRule, setSubHistoryRule] = useState(null);
  const [subHistoryCurrent, setSubHistoryCurrent] = useState(null);
  const [subHistoryItems, setSubHistoryItems] = useState([]);
  const [subHistoryLoading, setSubHistoryLoading] = useState(false);
  const [subHistoryError, setSubHistoryError] = useState('');

  const [isAddSubscriptionPricingOpen, setIsAddSubscriptionPricingOpen] = useState(false);
  const [isEditSubscriptionPricingOpen, setIsEditSubscriptionPricingOpen] = useState(false);
  const [editSubscriptionRule, setEditSubscriptionRule] = useState(null);
  const [editSubscriptionSaving, setEditSubscriptionSaving] = useState(false);
  const [editSubscriptionError, setEditSubscriptionError] = useState('');

  const [cardPricingLoading, setCardPricingLoading] = useState(false);
  const [cardPricingError, setCardPricingError] = useState('');

  const { authHeaders, user } = useAuth();

  // Entry pricing edit modal state (mock/local data)
  const [isEditEntryOpen, setIsEditEntryOpen] = useState(false);
  const [editEntryRule, setEditEntryRule] = useState(null);
  const [editEntrySaving, setEditEntrySaving] = useState(false);
  const [editEntryError, setEditEntryError] = useState('');

  // Entry pricing history modal state (SinglePricingRule history)
  const [isEntryHistoryOpen, setIsEntryHistoryOpen] = useState(false);
  const [entryHistoryTitle, setEntryHistoryTitle] = useState('Pricing History');
  const [entryHistoryCurrent, setEntryHistoryCurrent] = useState(null);
  const [entryHistoryItems, setEntryHistoryItems] = useState([]);
  const [entryHistoryLoading, setEntryHistoryLoading] = useState(false);
  const [entryHistoryError, setEntryHistoryError] = useState('');

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

  const [vehicleTypeOptions, setVehicleTypeOptions] = useState([]);
  const vehicleTypeIdByName = useMemo(() => {
    const map = new Map();
    for (const vt of vehicleTypeOptions) {
      if (vt?.name && vt?.id) map.set(vt.name, vt.id);
    }
    return map;
  }, [vehicleTypeOptions]);

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

  const loadVehicleTypes = async () => {
    try {
      const res = await fetchJson('/api/vehicle-types?page=1&limit=200');
      const raw = res?.data?.vehicleTypes;
      const list = Array.isArray(raw) ? raw : [];
      setVehicleTypeOptions(
        list
          .map((v) => ({
            id: v?.VehicleTypeID || v?.vehicleTypeId,
            name: v?.Name || v?.name
          }))
          .filter((v) => v.id && v.name)
      );
    } catch {
      setVehicleTypeOptions([]);
    }
  };

  const loadEntryPricing = async () => {
    setEntryPricingLoading(true);
    setEntryPricingError('');

    try {
      const res = await fetchJson('/api/single-pricing-rules?page=1&limit=200');
      const raw = res?.data?.items;
      const items = Array.isArray(raw) ? raw : [];
      const rows = items.map(normalizeSinglePricingRule);
      rows.sort((a, b) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime());
      setPricingRules(rows);
    } catch (e) {
      setEntryPricingError(e?.message || 'Failed to load entry pricing rules');
      setPricingRules([]);
    } finally {
      setEntryPricingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'entry-pricing') return;
    // Needed for Add Pricing Rule -> Card Category dropdown binding (ID + name).
    // We reuse the Card Pricing loader because it already fetches categories + IDs.
    loadCardPricing();
    loadVehicleTypes();
    loadEntryPricing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authHeaders]);

  const loadCardPricing = async () => {
    setCardPricingLoading(true);
    setCardPricingError('');

    try {
      // 1) Load card categories (Active only)
      const categoriesRes = await fetchJson('/api/card-categories?page=1&limit=200&isActive=true');
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

  const loadSubscriptionPricing = async () => {
    setSubscriptionPricingLoading(true);
    setSubscriptionPricingError('');

    try {
      const rulesRes = await fetchJson('/api/subscription-pricing-rules?page=1&limit=200');
      const raw = rulesRes?.data?.items;
      const allRules = Array.isArray(raw) ? raw : [];

      // Filter to only include rules where the card category is active
      const rules = allRules.filter((rule) => {
        const cardCategory = rule?.CardCategory || rule?.CardCategoryID;
        // If CardCategory is populated object, check IsActive; otherwise assume active
        if (typeof cardCategory === 'object' && cardCategory !== null) {
          return cardCategory.IsActive !== false;
        }
        return true; // If not populated, include (can't filter without data)
      });

      // Enrich with current price per rule.
      const rows = await Promise.all(
        rules.map(async (rule) => {
          const ruleBusinessId = rule?.ID;
          let current = null;
          if (ruleBusinessId) {
            try {
              const curRes = await fetchJson(`/api/subscription-pricing-rule-details/current/${encodeURIComponent(ruleBusinessId)}`);
              current = curRes?.data || null;
            } catch (e) {
              const msg = e?.message || '';
              if (!/no current price/i.test(msg) && !/404/.test(msg)) throw e;
            }
          }
          return normalizeSubscriptionPricingRule(rule, current);
        })
      );

      rows.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
      setSubscriptionPricing(rows);
    } catch (e) {
      setSubscriptionPricingError(e?.message || 'Failed to load subscription pricing');
      setSubscriptionPricing([]);
    } finally {
      setSubscriptionPricingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'subscription-pricing') return;
    loadSubscriptionPricing();
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
    setEditEntryRule(null);
    setEditEntryError('');
    setEditEntrySaving(false);
    setIsEditEntryOpen(true);
  };

  const handleEditRule = (rule) => {
    setEditEntryRule(rule || null);
    setEditEntryError('');
    setEditEntrySaving(false);
    setIsEditEntryOpen(true);
  };

  const closeEditEntry = () => {
    setIsEditEntryOpen(false);
    setEditEntryRule(null);
    setEditEntryError('');
    setEditEntrySaving(false);
  };

  const closeEntryHistory = () => {
    setIsEntryHistoryOpen(false);
    setEntryHistoryTitle('Pricing History');
    setEntryHistoryCurrent(null);
    setEntryHistoryItems([]);
    setEntryHistoryError('');
    setEntryHistoryLoading(false);
  };

  const handleViewEntryPricingHistory = async (rule) => {
    const cardCategoryName = rule?.cardCategory || '';
    const vehicleTypeName = rule?.vehicleType || '';
    const parts = [cardCategoryName, vehicleTypeName].filter(Boolean);

    setEntryHistoryTitle(parts.length ? `Pricing History - ${parts.join(' / ')}` : 'Pricing History');
    setEntryHistoryCurrent(null);
    setEntryHistoryItems([]);
    setEntryHistoryError('');
    setIsEntryHistoryOpen(true);
    setEntryHistoryLoading(true);

    try {
      // Prefer explicit ids on the rule if they exist.
      const cardCategoryId = rule?.cardCategoryId || cardCategoryIdByName.get(cardCategoryName) || '';
      const vehicleTypeId = rule?.vehicleTypeId || vehicleTypeIdByName.get(vehicleTypeName) || '';

      if (!cardCategoryId || !vehicleTypeId) {
        throw new Error('Missing Card Category / Vehicle Type ID for history lookup');
      }

      const [currentRes, historyRes] = await Promise.all([
        fetchJson(
          `/api/single-pricing-rules/current/${encodeURIComponent(cardCategoryId)}/${encodeURIComponent(vehicleTypeId)}`
        ),
        fetchJson(
          `/api/single-pricing-rules/history/${encodeURIComponent(cardCategoryId)}/${encodeURIComponent(vehicleTypeId)}?page=1&limit=50`
        )
      ]);

      const current = currentRes?.data || null;
      const items = historyRes?.data?.items || historyRes?.data || [];

      // Normalize to the history modal expected shape.
      // Note: backend field names may differ; we do best-effort mapping.
      setEntryHistoryCurrent(
        current
          ? {
            dayPrice: current?.DayPrice ?? null,
            firstHour: current?.HourPrice ?? null,
            nextHour: current?.NextHourPrice ?? null,
            startDate: current?.StartDateApply ?? null,
            endDate: current?.EndDateApply ?? null
          }
          : null
      );

      setEntryHistoryItems(
        Array.isArray(items)
          ? items
            .slice()
            .sort((a, b) => new Date(a?.StartDateApply || a?.createdAt || 0).getTime() - new Date(b?.StartDateApply || b?.createdAt || 0).getTime())
            .map((it, idx, arr) => {
              // What the UI component expects per item:
              // - startDate
              // - dayPrice / firstHour / nextHour
              // - prev: { dayPrice, firstHour, nextHour }
              // - periodStart / periodEnd

              const prevFromServer = it?.SinglePricingRuleDetailPrevRule || it?.SinglePricingRulePrevRule || null
              const prevFromArray = idx > 0 ? arr[idx - 1] : null

              const prevDayPrice =
                prevFromServer?.DayPrice ??
                prevFromArray?.DayPrice ??
                null
              const prevFirstHour =
                prevFromServer?.HourPrice ??
                prevFromArray?.HourPrice ??
                null
              const prevNextHour =
                prevFromServer?.NextHourPrice ??
                prevFromArray?.NextHourPrice ??
                null

              return {
                id: it?.ID || it?.id || it?._id,
                startDate: it?.StartDateApply ?? null,
                changedBy:
                  it?.ChangedByEmployee?.Person?.FullName ||
                  it?.ChangedByEmployee?.Person?.fullName ||
                  it?.ChangedByEmployee?.ID ||
                  it?.ChangedBy ||
                  null,
                reason: it?.Reason || null,

                dayPrice: it?.DayPrice ?? null,
                firstHour: it?.HourPrice ?? null,
                nextHour: it?.NextHourPrice ?? null,

                prev: {
                  dayPrice: prevDayPrice,
                  firstHour: prevFirstHour,
                  nextHour: prevNextHour
                },

                periodStart: it?.StartDateApply ?? null,
                // We don't currently have EndDateApply in the schema; keep null.
                periodEnd: it?.EndDateApply ?? null
              }
            })
          : []
      );
    } catch (e) {
      // Fallback: if we can't map to backend IDs yet, show a minimal local view.
      // This keeps the UI usable while Entry Pricing is still mock/local.
      setEntryHistoryError(e?.message || 'Failed to load pricing history');

      if (rule) {
        setEntryHistoryCurrent({
          dayPrice: rule?.dayPrice ?? null,
          firstHour: rule?.firstHour ?? null,
          nextHour: rule?.nextHour ?? null,
          startDate: rule?.startDate ?? null,
          endDate: rule?.endDate ?? null
        });
        setEntryHistoryItems([]);
      }
    } finally {
      setEntryHistoryLoading(false);
    }
  };

  const handleSubmitEditEntry = async (payload) => {
    setEditEntrySaving(true);
    setEditEntryError('');

    try {
      const currentRule = pricingRules.find((r) => r.id === payload.id);
      if (!currentRule) throw new Error('Pricing rule not found');

      const ChangedBy = user?.employeeId || user?.employeeBusinessId || user?.id;
      if (!ChangedBy) throw new Error('Missing employee ID for this session (please login again)');

      // SinglePricingRule is immutable: changing price means inserting a new record.
      await fetchJson('/api/single-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CardCategoryID: currentRule.cardCategoryId,
          VehicleTypeID: currentRule.vehicleTypeId,
          DayPrice: payload.dayPrice,
          HourPrice: payload.firstHour,
          NextHourPrice: payload.nextHour,
          ChangedBy: String(ChangedBy).trim(),
          Reason: payload.reason || null
        })
      });

      closeEditEntry();
      await loadEntryPricing();
    } catch (e) {
      setEditEntryError(e?.message || 'Failed to update entry pricing rule');
    } finally {
      setEditEntrySaving(false);
    }
  };

  const handleSubmitAddEntry = async (payload) => {
    setEditEntrySaving(true);
    setEditEntryError('');

    try {
      const CardCategoryID = payload.cardCategoryId;
      const VehicleTypeID = payload.vehicleTypeId;
      if (!CardCategoryID) throw new Error('Card Category is missing an ID mapping');
      if (!VehicleTypeID) throw new Error('Vehicle Type is missing an ID mapping');

      const ChangedBy = user?.employeeId || user?.employeeBusinessId || user?.id;
      if (!ChangedBy) throw new Error('Missing employee ID for this session (please login again)');

      await fetchJson('/api/single-pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CardCategoryID,
          VehicleTypeID,
          DayPrice: payload.dayPrice,
          HourPrice: payload.firstHour,
          NextHourPrice: payload.nextHour,
          ChangedBy: String(ChangedBy).trim(),
          // Reason optional on create for now.
          Reason: payload.reason || null
        })
      });

      closeEditEntry();
      await loadEntryPricing();
    } catch (e) {
      setEditEntryError(e?.message || 'Failed to create entry pricing rule');
    } finally {
      setEditEntrySaving(false);
    }
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
    setIsAddSubscriptionPricingOpen(true);
  };

  const handleEditSubscriptionRule = async (rule) => {
    setEditSubscriptionRule(rule || null);
    setEditSubscriptionError('');
    setEditSubscriptionSaving(false);
    setIsEditSubscriptionPricingOpen(true);
  };

  const closeEditSubscriptionPricing = () => {
    setIsEditSubscriptionPricingOpen(false);
    setEditSubscriptionRule(null);
    setEditSubscriptionError('');
    setEditSubscriptionSaving(false);
  };

  const closeSubHistory = () => {
    setIsSubHistoryOpen(false);
    setSubHistoryTitle('Subscription Pricing History');
    setSubHistoryRule(null);
    setSubHistoryCurrent(null);
    setSubHistoryItems([]);
    setSubHistoryError('');
    setSubHistoryLoading(false);
  };

  const handleViewSubscriptionPriceHistory = async (rule) => {
    setSubHistoryRule(rule || null);

    const parts = [rule?.cardCategory, rule?.vehicleType, rule?.subscriptionType].filter(Boolean);
    setSubHistoryTitle(
      parts.length
        ? `Subscription Pricing History - ${parts.join(' / ')}`
        : 'Subscription Pricing History'
    );

    setSubHistoryCurrent(null);
    setSubHistoryItems([]);
    setSubHistoryError('');
    setIsSubHistoryOpen(true);
    setSubHistoryLoading(true);

    try {
      const ruleBusinessId = rule?.id;
      if (!ruleBusinessId) throw new Error('Missing subscription pricing rule ID');

      const [currentRes, historyRes] = await Promise.all([
        fetchJson(`/api/subscription-pricing-rule-details/current/${encodeURIComponent(ruleBusinessId)}`),
        fetchJson(`/api/subscription-pricing-rule-details/history/${encodeURIComponent(ruleBusinessId)}?page=1&limit=50`)
      ]);

      setSubHistoryCurrent(currentRes?.data || null);
      setSubHistoryItems(historyRes?.data?.items || []);
    } catch (e) {
      setSubHistoryError(e?.message || 'Failed to load subscription pricing history');
    } finally {
      setSubHistoryLoading(false);
    }
  };

  const handleSubmitEditSubscriptionPricing = async ({ newPrice, reason }) => {
    setEditSubscriptionSaving(true);
    setEditSubscriptionError('');

    try {
      const ChangedBy = user?.employeeId || user?.employeeBusinessId || user?.id;
      if (!ChangedBy) throw new Error('Missing employee ID for this session (please login again)');

      await fetchJson('/api/subscription-pricing-rule-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          SubscriptionPricingRuleID: editSubscriptionRule?.id,
          Price: newPrice,
          ChangedBy: String(ChangedBy).trim(),
          Reason: reason || null
        })
      });

      closeEditSubscriptionPricing();
      await loadSubscriptionPricing();
    } catch (e) {
      setEditSubscriptionError(e?.message || 'Failed to update subscription price');
    } finally {
      setEditSubscriptionSaving(false);
    }
  };

  const handleDeleteSubscriptionRule = async (rule) => {
    if (!confirm(`Are you sure you want to delete subscription pricing rule ${rule.id}?`)) return;

    try {
      // Rule delete endpoint uses MONGO id
      await fetchJson(`/api/subscription-pricing-rules/${encodeURIComponent(rule.mongoId)}`, {
        method: 'DELETE'
      });
      await loadSubscriptionPricing();
    } catch (e) {
      alert(e?.message || 'Failed to delete subscription pricing rule');
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

          {entryPricingError ? (
            <div className="cphm-state cphm-error" style={{ padding: '12px 24px' }}>
              {entryPricingError}
            </div>
          ) : null}

          {/* Pricing Rules Table */}
          {entryPricingLoading ? (
            <div style={{ padding: '21.2px 24px' }}>Loading...</div>
          ) : (
            <PricingRulesTable
              pricingRules={pricingRules}
              onEditRule={handleEditRule}
              onViewHistory={handleViewEntryPricingHistory}
            />
          )}
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

      <EditEntryPricingModal
        isOpen={isEditEntryOpen}
        mode={editEntryRule ? 'edit' : 'create'}
        rule={editEntryRule}
        cardCategoryOptions={(cardPricing || [])
          .map((r) => ({ id: r.id, name: r.category }))
          .filter((r) => r.id && r.name)}
        vehicleTypeOptions={(vehicleTypeOptions || [])
          .map((r) => ({ id: r.id, name: r.name }))
          .filter((r) => r.id && r.name)}
        isSaving={editEntrySaving}
        error={editEntryError}
        onClose={closeEditEntry}
        onSubmit={editEntryRule ? handleSubmitEditEntry : handleSubmitAddEntry}
      />

      <EntryPricingHistoryModal
        isOpen={isEntryHistoryOpen}
        title={entryHistoryTitle}
        current={entryHistoryCurrent}
        historyItems={entryHistoryItems}
        isLoading={entryHistoryLoading}
        error={entryHistoryError}
        onClose={closeEntryHistory}
      />

      <EditSubscriptionPricingModal
        isOpen={isEditSubscriptionPricingOpen}
        rule={editSubscriptionRule}
        isSaving={editSubscriptionSaving}
        error={editSubscriptionError}
        onClose={closeEditSubscriptionPricing}
        onSubmit={handleSubmitEditSubscriptionPricing}
      />

      <SubscriptionPriceHistoryModal
        isOpen={isSubHistoryOpen}
        title={subHistoryTitle}
        rule={subHistoryRule}
        currentPrice={subHistoryCurrent}
        historyItems={subHistoryItems}
        isLoading={subHistoryLoading}
        error={subHistoryError}
        onClose={closeSubHistory}
      />

      {isAddSubscriptionPricingOpen ? (
        <AddSubscriptionPricingModal
          onClose={() => setIsAddSubscriptionPricingOpen(false)}
          onSubmit={async ({ CardCategoryID, VehicleTypeID, SubscriptionTypeID, Price }) => {
            // 1) Create the rule (container)
            const created = await fetchJson('/api/subscription-pricing-rules', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ CardCategoryID, VehicleTypeID, SubscriptionTypeID })
            });

            const ruleBusinessId = created?.data?.ID;
            if (!ruleBusinessId) {
              throw new Error('Created rule is missing ID');
            }

            // 2) Create initial price detail.
            const ChangedBy = user?.employeeId || user?.employeeBusinessId || user?.id
            if (!ChangedBy) throw new Error('Missing employee ID for this session (please login again)')

            await fetchJson('/api/subscription-pricing-rule-details', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                SubscriptionPricingRuleID: ruleBusinessId,
                Price,
                ChangedBy: String(ChangedBy).trim()
              })
            });

            await loadSubscriptionPricing();
          }}
        />
      ) : null}

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
            {subscriptionPricingError && (
              <div className="cphm-state cphm-error" style={{ padding: '12px 24px' }}>
                {subscriptionPricingError}
              </div>
            )}
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
                {subscriptionPricingLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px 24px' }}>
                      Loading subscription pricing…
                    </td>
                  </tr>
                ) : subscriptionPricing.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '16px 24px' }}>
                      No subscription pricing rules found
                    </td>
                  </tr>
                ) : (
                  subscriptionPricing.map((rule) => (
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
                            onClick={() => handleViewSubscriptionPriceHistory(rule)}
                            title="View Price History"
                          >
                            <img src={viewIcon} alt="View" width="16" height="16" />
                          </button>
                          <button
                            className="action-btn"
                            onClick={() => handleEditSubscriptionRule(rule)}
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
