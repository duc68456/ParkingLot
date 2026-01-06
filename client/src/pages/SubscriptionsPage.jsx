import { useState } from 'react';
import '../styles/pages/SubscriptionsPage.css';
import RegisterSubscriptionModal from '../components/RegisterSubscriptionModal';
import ViewSubscriptionModal from '../components/ViewSubscriptionModal';
import PauseSubscriptionModal from '../components/PauseSubscriptionModal';
import AddSubscriptionTypeModal from '../components/AddSubscriptionTypeModal';
import EditSubscriptionTypeModal from '../components/EditSubscriptionTypeModal';

const addIcon = "data:image/svg+xml,%3Csvg%20width%3D%2220%22height%3D%2220%22viewBox%3D%220%200%2020%2020%22fill%3D%22none%22xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M10%204.16667V15.8333M4.16667%2010H15.8333%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E";
const editIcon = "data:image/svg+xml,%3Csvg%20width%3D%2216%22height%3D%2216%22viewBox%3D%220%200%2016%2016%22fill%3D%22none%22xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M1.33337%2014.6667H4.00004L12.6667%206.00004C12.8435%205.82323%2012.9838%205.61333%2013.0794%205.38231C13.1751%205.15129%2013.2242%204.90369%2013.2242%204.65371C13.2242%204.40372%2013.1751%204.15612%2013.0794%203.9251C12.9838%203.69408%2012.8435%203.48418%2012.6667%203.30737L12.6927%203.33337C12.5159%203.15655%2012.306%203.01631%2012.0749%202.92064C11.8439%202.82497%2011.5963%202.77572%2011.3463%202.77572C11.0964%202.77572%2010.8488%202.82497%2010.6178%202.92064C10.3868%203.01631%2010.1769%203.15655%2010.0001%203.33337L1.33337%2012V14.6667Z%22%20stroke%3D%22155DFC%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E";

// Mock data for subscriptions
const mockSubscriptions = [
  {
    id: 'SUB001',
    customerName: 'John Doe',
    vehiclePlate: 'ABC-1234',
    type: 'Monthly',
    startDate: '01/01/2024',
    endDate: '31/01/2024',
    status: 'Active'
  },
  {
    id: 'SUB002',
    customerName: 'Jane Smith',
    vehiclePlate: 'XYZ-5678',
    type: 'Quarterly',
    startDate: '01/01/2024',
    endDate: '31/03/2024',
    status: 'Active'
  }
];

// Mock data for subscription types
const mockSubscriptionTypes = [
  {
    id: 'ST001',
    name: 'Monthly',
    duration: 30,
    description: '30-day parking access'
  },
  {
    id: 'ST002',
    name: 'Quarterly',
    duration: 90,
    description: '90-day parking access'
  },
  {
    id: 'ST003',
    name: 'Annual',
    duration: 365,
    description: 'Full year parking access'
  }
];

function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions);
  const [subscriptionTypes, setSubscriptionTypes] = useState(mockSubscriptionTypes);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [selectedSubscriptionForPause, setSelectedSubscriptionForPause] = useState(null);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [showEditTypeModal, setShowEditTypeModal] = useState(false);
  const [selectedSubscriptionType, setSelectedSubscriptionType] = useState(null);

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

  const handleSubmitRegistration = (newSubscription) => {
    setSubscriptions([...subscriptions, newSubscription]);
    setShowRegisterModal(false);
    alert(`Subscription ${newSubscription.id} registered successfully!`);
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

  const handleSubmitPause = (subscriptionId, reason) => {
    setSubscriptions(subscriptions.map(sub => 
      sub.id === subscriptionId ? { ...sub, status: 'Paused' } : sub
    ));
    setShowPauseModal(false);
    setSelectedSubscriptionForPause(null);
    alert(`Subscription ${subscriptionId} paused successfully.\nReason: ${reason}`);
  };

  const handleDeleteSubscription = (subscriptionId) => {
    if (confirm(`Are you sure you want to delete subscription ${subscriptionId}?`)) {
      setSubscriptions(subscriptions.filter(sub => sub.id !== subscriptionId));
      alert(`Subscription ${subscriptionId} deleted successfully!`);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <td className="subscription-id-cell">{subscription.id}</td>
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
                          onClick={() => handleDeleteSubscription(subscription.id)}
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
                  <tr key={type.id}>
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
                            setSelectedSubscriptionType(type);
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
          onSubmit={({ name, durationDays, description }) => {
            const nextNumber = subscriptionTypes.length + 1;
            const id = `ST${String(nextNumber).padStart(3, '0')}`;
            setSubscriptionTypes((prev) => [
              ...prev,
              {
                id,
                name,
                duration: durationDays,
                description,
              },
            ]);
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
          onSubmit={({ id, name, durationDays, description }) => {
            setSubscriptionTypes((prev) =>
              prev.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      name,
                      duration: durationDays,
                      description,
                    }
                  : t
              )
            );
          }}
        />
      )}
    </div>
  );
}

export default SubscriptionsPage;
