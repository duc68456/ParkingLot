import { useEffect, useMemo, useState } from 'react';
import '../styles/pages/SubscriptionsPage.css';
import RegisterSubscriptionModal from '../components/RegisterSubscriptionModal';
import ViewSubscriptionModal from '../components/ViewSubscriptionModal';
import PauseSubscriptionModal from '../components/PauseSubscriptionModal';
import AddSubscriptionTypeModal from '../components/AddSubscriptionTypeModal';
import EditSubscriptionTypeModal from '../components/EditSubscriptionTypeModal';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const addIcon = "data:image/svg+xml,%3Csvg%20width%3D%2220%22height%3D%2220%22viewBox%3D%220%200%2020%2020%22fill%3D%22none%22xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M10%204.16667V15.8333M4.16667%2010H15.8333%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E";
const editIcon = "data:image/svg+xml,%3Csvg%20width%3D%2216%22height%3D%2216%22viewBox%3D%220%200%2016%2016%22fill%3D%22none%22xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1.33337%2014.6667H4.00004L12.6667%206.00004C12.8435%205.82323%2012.9838%205.61333%2013.0794%205.38231C13.1751%205.15129%2013.2242%204.90369%2013.2242%204.65371C13.2242%204.40372%2013.1751%204.15612%2013.0794%203.9251C12.9838%203.69408%2012.8435%203.48418%2012.6667%203.30737L12.6927%203.33337C12.5159%203.15655%2012.306%203.01631%2012.0749%202.92064C11.8439%202.82497%2011.5963%202.77572%2011.3463%202.77572C11.0964%202.77572%2010.8488%202.82497%2010.6178%202.92064C10.3868%203.01631%2010.1769%203.15655%2010.0001%203.33337L1.33337%2012V14.6667Z%22%20stroke%3D%22155DFC%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E";

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
  const { authHeaders } = useAuth();
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4.16667V15.8333M4.16667 10H15.8333" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Register Subscription
            </button>
          </div>

          {/* Search Bar */}
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L11.1 11.1" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                      <span className="status-badge status-active">
                        {subscription.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          className="action-btn"
                          onClick={() => handleViewSubscription(subscription.id)}
                          title="View"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M1.61342 8.47329C1.52262 8.33051 1.47723 8.25913 1.45182 8.14916C1.43273 8.06457 1.43273 7.93543 1.45182 7.85084C1.47723 7.74087 1.52262 7.66949 1.61341 7.52671C2.36369 6.33734 4.59693 3.33333 8.00027 3.33333C11.4036 3.33333 13.6369 6.33734 14.3871 7.52671C14.4779 7.66949 14.5233 7.74087 14.5487 7.85084C14.5678 7.93543 14.5678 8.06457 14.5487 8.14916C14.5233 8.25913 14.4779 8.33051 14.3871 8.47329C13.6369 9.66266 11.4036 12.6667 8.00027 12.6667C4.59693 12.6667 2.36369 9.66266 1.61342 8.47329Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8.00027 10C9.10484 10 10.0003 9.10457 10.0003 8C10.0003 6.89543 9.10484 6 8.00027 6C6.8957 6 6.00027 6.89543 6.00027 8C6.00027 9.10457 6.8957 10 8.00027 10Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handlePauseSubscription(subscription.id)}
                          title="Pause"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M5.33333 3.33333H6.66667V12.6667H5.33333V3.33333ZM9.33333 3.33333H10.6667V12.6667H9.33333V3.33333Z" fill="#62748e"/>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn-delete"
                          onClick={() => handleDeleteSubscription(subscription.subscriptionId || subscription.id)}
                          title="Delete"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M10.6667 6V11.3333M5.33333 6V11.3333M2.66667 4H13.3333M12 4V12.6667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.6667 14H5.33333C4.97971 14 4.64057 13.8595 4.39052 13.6095C4.14048 13.3594 4 13.0203 4 12.6667V4H12ZM8.66667 4V2.66667C8.66667 2.48986 8.59643 2.32029 8.47141 2.19526C8.34638 2.07024 8.17681 2 8 2H8C7.82319 2 7.65362 2.07024 7.52859 2.19526C7.40357 2.32029 7.33333 2.48986 7.33333 2.66667V4H8.66667Z" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
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
              <img src={addIcon} alt="" />
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
                          className="subtype-action-btn"
                          title="Edit"
                          onClick={() => {
                            // Ensure edit uses Mongo id even if UI shows business ID
                            setSelectedSubscriptionType({ ...type, id: type.mongoId ?? type.id });
                            setShowEditTypeModal(true);
                          }}
                        >
                          <img src={editIcon} alt="" />
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
    </div>
  );
}

export default SubscriptionsPage;
