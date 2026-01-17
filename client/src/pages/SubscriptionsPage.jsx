import { useEffect, useMemo, useState } from 'react';
import '../styles/pages/SubscriptionsPage.css';
import RegisterSubscriptionModal from '../components/RegisterSubscriptionModal';
import ViewSubscriptionModal from '../components/ViewSubscriptionModal';
import PauseSubscriptionModal from '../components/PauseSubscriptionModal';
import ContinueSubscriptionModal from '../components/ContinueSubscriptionModal';
import EditSubscriptionModal from '../components/EditSubscriptionModal';
import AddSubscriptionTypeModal from '../components/AddSubscriptionTypeModal';
import EditSubscriptionTypeModal from '../components/EditSubscriptionTypeModal';
import ViewSubscriptionTypesModal from '../components/ViewSubscriptionTypesModal';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Inline SVG Icons for consistent rendering
const AddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 4.16667V15.8333M4.16667 10H15.8333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="#314158" strokeWidth="1.5" fill="none" />
  </svg>
);

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5.33333 3.33333H6.66667V12.6667H5.33333V3.33333Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M9.33333 3.33333H10.6667V12.6667H9.33333V3.33333Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const ContinueIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3L12 8L4 13V3Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.33334 4V2.66667C5.33334 2.48986 5.40358 2.32029 5.52861 2.19526C5.65363 2.07024 5.8232 2 6.00001 2H10C10.1768 2 10.3464 2.07024 10.4714 2.19526C10.5964 2.32029 10.6667 2.48986 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.5101 12.5964 13.6797 12.4714 13.8047C12.3464 13.9298 12.1768 14 12 14H4.00001C3.8232 14 3.65363 13.9298 3.52861 13.8047C3.40358 13.6797 3.33334 13.5101 3.33334 13.3333V4H12.6667Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.66666 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.33334 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatDate = (value) => {
  if (!value) return '--';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const normalizeSubscription = (s) => {
  if (!s) return null;

  const customerObj = s?.Customer || s?.CustomerID;
  const customerPerson = customerObj?.PersonID;
  const customerName =
    customerPerson?.FullName ||
    customerPerson?.fullName ||
    customerPerson?.name ||
    customerObj?.FullName ||
    customerObj?.fullName ||
    customerObj?.name ||
    '—';

  const vehicle = s?.Vehicle || s?.VehicleID;
  const vehiclePlate = vehicle?.PlateNumber || vehicle?.plateNumber || '—';

  const subType = s?.SubscriptionType || s?.SubscriptionTypeID;
  const typeName = subType?.TypeName || subType?.typeName || subType?.name || '—';

  const cardCategory = s.Card?.CardCategoryID?.Name

  const isSuspended = Boolean(s?.IsSuspended);

  return {
    // Mongo id (router uses findById)
    id: s?.id ?? s?._id,
    // Business ID (SSN0001)
    subscriptionId: s?.ID,
    customerName,
    customerId: customerObj?.ID || customerObj?.id || customerObj || null,
    vehicleId: vehicle?.VehicleID || s?.VehicleID || null,
    vehiclePlate,
    cardId: s?.CardID?.CardID || s?.CardID || null,
    cardCategory: cardCategory,
    type: typeName,
    startDate: formatDate(s?.StartDate),
    endDate: formatDate(s?.EndDate),
    price: Number.isFinite(Number(s?.PricePaid)) ? Number(s.PricePaid) : null,
    status: isSuspended ? 'Paused' : 'Active'
  };
};

const normalizeSubscriptionType = (t) => {
  if (!t) return null;
  return {
    // Backend has a business ID (field `ID` like SUB0001) and also Mongo id (`id` after toJSON)
    // - `mongoId`: used for API operations (PUT/DELETE by :id)
    // - `id`: displayed in the table
    mongoId: t.id ?? t._id,
    id: t.ID ?? t.id ?? t._id,
    // Keep display-friendly legacy fields expected by UI
    name: t.TypeName ?? t.name ?? '',
    duration: t.DurationDays ?? t.duration ?? 0,
    description: t.Description ?? t.description ?? ''
  };
};

function SubscriptionsPage() {
  const { authHeaders, user } = useAuth();
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState('');
  const [subscriptionTypes, setSubscriptionTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedSubscriptionForPause, setSelectedSubscriptionForPause] = useState(null);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState(null);
  const [showContinueModal, setShowContinueModal] = useState(false);
  const [selectedSubscriptionForContinue, setSelectedSubscriptionForContinue] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscriptionForEdit, setSelectedSubscriptionForEdit] = useState(null);
  const [showViewTypesModal, setShowViewTypesModal] = useState(false);
  const [selectedTypeForView, setSelectedTypeForView] = useState(null);

  const fetchSubscriptions = async ({ query } = {}) => {
    setSubsLoading(true);
    setSubsError('');

    try {
      // Server currently supports filtering by IDs; it doesn't have a generic 'search' yet.
      // We'll still fetch a reasonable limit and do client-side filter by text.
      const qs = new URLSearchParams({ limit: '200' });
      const res = await fetch(`${API_BASE_URL}/api/subscriptions?${qs.toString()}`, {
        headers: { ...authHeaders }
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to fetch subscriptions (${res.status})`;
        throw new Error(msg);
      }

      const list = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];

      const normalized = list.map(normalizeSubscription).filter(Boolean);
      const q = String(query ?? '').trim().toLowerCase();
      if (!q) {
        setSubscriptions(normalized);
      } else {
        setSubscriptions(
          normalized.filter((s) =>
            String(s?.subscriptionId || '').toLowerCase().includes(q) ||
            String(s?.customerName || '').toLowerCase().includes(q) ||
            String(s?.vehiclePlate || '').toLowerCase().includes(q)
          )
        );
      }
    } catch (err) {
      console.error('Fetch subscriptions error:', err);
      setSubscriptions([]);
      setSubsError(err?.message || 'Failed to load subscriptions');
    } finally {
      setSubsLoading(false);
    }
  };

  const fetchSubscriptionTypes = async () => {
    setTypesLoading(true);
    setTypesError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription-types?limit=200`, {
        headers: { ...authHeaders }
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to fetch subscription types (${res.status})`;
        throw new Error(msg);
      }

      const list = Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data)
          ? json.data
          : [];

      setSubscriptionTypes(list.map(normalizeSubscriptionType).filter(Boolean));
    } catch (err) {
      console.error('Fetch subscription types error:', err);
      setSubscriptionTypes([]);
      setTypesError(err?.message || 'Failed to load subscription types');
    } finally {
      setTypesLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch types when tab is active (and whenever auth changes)
    if (activeTab !== 'subscription-types') return;
    fetchSubscriptionTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authHeaders]);

  useEffect(() => {
    if (activeTab !== 'subscriptions') return;
    fetchSubscriptions({ query: searchQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authHeaders]);

  const tabs = [
    { id: 'subscriptions', label: 'Subscriptions' },
    { id: 'subscription-types', label: 'Subscription Types' }
  ];

  const handleRegisterSubscription = () => {
    setShowRegisterModal(true);
  };

  const handleCloseRegisterModal = () => {
    setShowRegisterModal(false);
  };

  const handleSubmitRegistration = async (newSubscription) => {
    // RegisterSubscriptionModal is still mock-based; once it's bound, it should submit
    // the exact fields the backend expects.
    // For now we try to map a minimal payload if possible, otherwise keep local append.
    try {
      const payload = {
        // ProcessedBy is derived from the logged-in employee on the server.
        VehicleID: newSubscription?.vehicleId,
        VehicleTypeID: newSubscription?.vehicleTypeId,
        CardID: newSubscription?.cardId,
        SubscriptionTypeID: newSubscription?.subscriptionTypeId,
        PricePaid: newSubscription?.price,
        StartDate: newSubscription?.startDateRaw || undefined,
        CustomerID: newSubscription?.customerId || undefined
      };

      // If it's not yet real, fall back to local behavior.
      const hasRequired =
        payload.VehicleID &&
        payload.VehicleTypeID &&
        payload.CardID &&
        payload.SubscriptionTypeID &&
        payload.PricePaid !== undefined &&
        payload.PricePaid !== null;

      if (!hasRequired) {
        setSubscriptions((prev) => [...prev, newSubscription]);
        setShowRegisterModal(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to register subscription (${res.status})`;
        throw new Error(msg);
      }

      setShowRegisterModal(false);
      await fetchSubscriptions({ query: searchQuery });
    } catch (err) {
      alert(err?.message || 'Failed to register subscription');
    }
  };

  const handleViewSubscription = (subscriptionId) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscription(subscription);
      setShowViewModal(true);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedSubscription(null);
  };

  const handlePauseSubscription = (subscriptionId) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscriptionForPause(subscription);
      setShowPauseModal(true);
    }
  };

  const handleClosePauseModal = () => {
    setShowPauseModal(false);
    setSelectedSubscriptionForPause(null);
  };

  const handleSubmitPause = async (subscriptionId, reason) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ IsSuspended: true, Reason: reason })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to suspend subscription (${res.status})`;
        throw new Error(msg);
      }

      setShowPauseModal(false);
      setSelectedSubscriptionForPause(null);
      await fetchSubscriptions({ query: searchQuery });
    } catch (err) {
      alert(err?.message || 'Failed to suspend subscription');
    }
  };

  const handleContinueSubscription = (subscriptionId) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscriptionForContinue(subscription);
      setShowContinueModal(true);
    }
  };

  const handleCloseContinueModal = () => {
    setShowContinueModal(false);
    setSelectedSubscriptionForContinue(null);
  };

  const handleSubmitContinue = async (subscriptionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ IsSuspended: false })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to resume subscription (${res.status})`;
        throw new Error(msg);
      }

      setShowContinueModal(false);
      setSelectedSubscriptionForContinue(null);
      await fetchSubscriptions({ query: searchQuery });
    } catch (err) {
      alert(err?.message || 'Failed to resume subscription');
    }
  };

  const handleEditSubscription = (subscriptionId) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (subscription) {
      setSelectedSubscriptionForEdit(subscription);
      setShowEditModal(true);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedSubscriptionForEdit(null);
  };

  const handleSubmitEdit = async (subscriptionId, payload) => {
    const res = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json?.error?.message || `Failed to update subscription (${res.status})`;
      throw new Error(msg);
    }

    await fetchSubscriptions({ query: searchQuery });
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (!confirm(`Are you sure you want to delete subscription ${subscriptionId}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: 'DELETE',
        headers: { ...authHeaders }
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Failed to delete subscription (${res.status})`;
        throw new Error(msg);
      }
      await fetchSubscriptions({ query: searchQuery });
    } catch (err) {
      alert(err?.message || 'Failed to delete subscription');
    }
  };

  const filteredSubscriptions = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    if (!q) return subscriptions;
    return subscriptions.filter((sub) =>
      String(sub?.subscriptionId || '').toLowerCase().includes(q) ||
      String(sub?.customerName || '').toLowerCase().includes(q) ||
      String(sub?.vehiclePlate || '').toLowerCase().includes(q)
    );
  }, [subscriptions, searchQuery]);

  return (
    <div className="subscriptions-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Manage Subscription</h2>
        <p className="page-subtitle">Manage parking subscriptions and types</p>
      </div>

      {/* Tab Navigation */}
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

      {/* Subscriptions Tab Content */}
      {activeTab === 'subscriptions' && (
        <div className="subscriptions-content">
          {/* Register Subscription Button */}
          <div className="register-section">
            <button className="btn-register" onClick={handleRegisterSubscription}>
              <AddIcon />
              Register Subscription
            </button>
          </div>

          {/* Search Bar */}
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M14 14L11.1 11.1" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Data Table */}
          <div className="data-table">
            {subsLoading ? (
              <div className="table-footer">
                <p className="results-text">Loading subscriptions…</p>
              </div>
            ) : subsError ? (
              <div className="table-footer">
                <p className="results-text" style={{ color: '#dc2626' }}>{subsError}</p>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => fetchSubscriptions({ query: searchQuery })}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CUSTOMER</th>
                  <th>TYPE</th>
                  <th>PERIOD</th>
                  <th>STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="subscription-id-cell">{subscription.subscriptionId || subscription.id}</td>
                    <td className="customer-cell">
                      <div className="customer-info">
                        <div className="customer-name">{subscription.customerName}</div>
                        <div className="vehicle-plate">{subscription.vehiclePlate}</div>
                      </div>
                    </td>
                    <td className="type-cell">{subscription.type}</td>
                    <td className="period-cell">
                      <div className="period-info">
                        <div className="start-date">{subscription.startDate}</div>
                        <div className="end-date">to {subscription.endDate}</div>
                      </div>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${subscription.status === 'Paused' ? 'status-paused' : 'status-active'}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          className="action-btn action-btn--view"
                          onClick={() => handleViewSubscription(subscription.id)}
                          title="View"
                        >
                          <ViewIcon />
                        </button>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEditSubscription(subscription.id)}
                          title="Edit"
                        >
                          <EditIcon />
                        </button>
                        {subscription.status === 'Paused' ? (
                          <button
                            className="action-btn action-btn--continue"
                            onClick={() => handleContinueSubscription(subscription.id)}
                            title="Resume"
                          >
                            <ContinueIcon />
                          </button>
                        ) : (
                          <button
                            className="action-btn action-btn--pause"
                            onClick={() => handlePauseSubscription(subscription.id)}
                            title="Pause"
                          >
                            <PauseIcon />
                          </button>
                        )}
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDeleteSubscription(subscription.subscriptionId || subscription.id)}
                          title="Delete"
                        >
                          <DeleteIcon />
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
                Showing <span className="results-count">{filteredSubscriptions.length}</span> results
              </p>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Types Tab Content */}
      {activeTab === 'subscription-types' && (
        <div className="subscriptions-content">
          <div className="register-section">
            <button className="btn-register" onClick={() => setShowAddTypeModal(true)}>
              <AddIcon />
              + Add Type
            </button>
          </div>

          <div className="data-table">
            {typesLoading ? (
              <div className="table-footer">
                <p className="results-text">Loading subscription types…</p>
              </div>
            ) : typesError ? (
              <div className="table-footer">
                <p className="results-text" style={{ color: '#dc2626' }}>{typesError}</p>
                <div className="pagination-buttons">
                  <button className="pagination-btn" type="button" onClick={fetchSubscriptionTypes}>
                    Retry
                  </button>
                </div>
              </div>
            ) : null}
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NAME</th>
                  <th>DURATION (DAYS)</th>
                  <th>DESCRIPTION</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionTypes.map((type) => (
                  <tr key={type.mongoId ?? type.id}>
                    <td className="type-id-cell">{type.id}</td>
                    <td>{type.name}</td>
                    <td>{type.duration}</td>
                    <td>{type.description}</td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          type="button"
                          className="action-btn action-btn--view"
                          title="View Pricing Rules"
                          onClick={() => {
                            setSelectedTypeForView(type);
                            setShowViewTypesModal(true);
                          }}
                        >
                          <ViewIcon />
                        </button>
                        <button
                          type="button"
                          className="action-btn action-btn--edit"
                          title="Edit"
                          onClick={() => {
                            // Ensure edit uses Mongo id even if UI shows business ID
                            setSelectedSubscriptionType({ ...type, id: type.mongoId ?? type.id });
                            setShowEditTypeModal(true);
                          }}
                        >
                          <EditIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{subscriptionTypes.length}</span> results
              </p>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Subscription Modal */}
      {showRegisterModal && (
        <RegisterSubscriptionModal
          onClose={handleCloseRegisterModal}
          onRegister={handleSubmitRegistration}
        />
      )}

      {/* View Subscription Modal */}
      {showViewModal && selectedSubscription && (
        <ViewSubscriptionModal
          subscription={selectedSubscription}
          onClose={handleCloseViewModal}
        />
      )}

      {/* Pause Subscription Modal */}
      {showPauseModal && selectedSubscriptionForPause && (
        <PauseSubscriptionModal
          subscription={selectedSubscriptionForPause}
          onClose={handleClosePauseModal}
          onPause={handleSubmitPause}
        />
      )}

      {/* Continue Subscription Modal */}
      {showContinueModal && selectedSubscriptionForContinue && (
        <ContinueSubscriptionModal
          subscription={selectedSubscriptionForContinue}
          onClose={handleCloseContinueModal}
          onContinue={handleSubmitContinue}
        />
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && selectedSubscriptionForEdit && (
        <EditSubscriptionModal
          subscription={selectedSubscriptionForEdit}
          onClose={handleCloseEditModal}
          onSubmit={handleSubmitEdit}
          authHeaders={authHeaders}
        />
      )}

      {showAddTypeModal && (
        <AddSubscriptionTypeModal
          onClose={() => setShowAddTypeModal(false)}
          onSubmit={async ({ name, durationDays, description }) => {
            const res = await fetch(`${API_BASE_URL}/api/subscription-types`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify({
                TypeName: name,
                DurationDays: durationDays,
                Description: description || null
              })
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
              const msg = json?.error?.message || `Failed to create subscription type (${res.status})`;
              throw new Error(msg);
            }

            // Refresh list (server is source of truth)
            await fetchSubscriptionTypes();
          }}
        />
      )}

      {showEditTypeModal && selectedSubscriptionType && (
        <EditSubscriptionTypeModal
          type={selectedSubscriptionType}
          onClose={() => {
            setShowEditTypeModal(false);
            setSelectedSubscriptionType(null);
          }}
          onSubmit={async ({ id, name, durationDays, description }) => {
            const res = await fetch(`${API_BASE_URL}/api/subscription-types/${encodeURIComponent(id)}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders
              },
              body: JSON.stringify({
                TypeName: name,
                DurationDays: durationDays,
                Description: description || null
              })
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
              const msg = json?.error?.message || `Failed to update subscription type (${res.status})`;
              throw new Error(msg);
            }

            await fetchSubscriptionTypes();
          }}
        />
      )}

      {/* View Subscription Types Modal */}
      {showViewTypesModal && selectedTypeForView && (
        <ViewSubscriptionTypesModal
          isOpen={showViewTypesModal}
          subscriptionType={selectedTypeForView}
          onClose={() => {
            setShowViewTypesModal(false);
            setSelectedTypeForView(null);
          }}
          authHeaders={authHeaders}
          user={user}
        />
      )}
    </div>
  );
}

export default SubscriptionsPage;
