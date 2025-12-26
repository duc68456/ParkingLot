import { useState } from 'react';
import '../styles/pages/CardsPage.css';

// Mock data for cards
const mockCards = [
  {
    id: 'CARD001',
    uid: 'UID-123456',
    type: 'Premium',
    owner: 'John Doe',
    ownerType: 'Customer',
    status: 'Active',
    expiry: '31/12/2025',
    gradient: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)'
  },
  {
    id: 'CARD002',
    uid: 'UID-123457',
    type: 'Standard',
    owner: 'Jane Smith',
    ownerType: 'Customer',
    status: 'Active',
    expiry: '30/06/2025',
    gradient: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)'
  },
  {
    id: 'CARD004',
    uid: 'UID-123459',
    type: 'Standard',
    owner: 'Tom Staff',
    ownerType: 'Employee',
    status: 'Active',
    expiry: '-',
    gradient: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(152, 16, 250) 100%)'
  }
];

function CardsPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [filteredCards, setFilteredCards] = useState(mockCards);

  const stats = [
    {
      label: 'Total Cards',
      value: '6',
      icon: 'http://localhost:3845/assets/a8ca772dbbf61997217d0a90cf4574fa8cefb7cf.svg',
      gradient: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)'
    },
    {
      label: 'Unassigned',
      value: '1',
      icon: 'http://localhost:3845/assets/73ad19f3b093246f1e830faeba484b5e142eaf9e.svg',
      gradient: 'linear-gradient(135deg, rgb(240, 177, 0) 0%, rgb(208, 135, 0) 100%)'
    },
    {
      label: 'Active Cards',
      value: '3',
      icon: 'http://localhost:3845/assets/cd8a1275cff7628ece0ac7c869b4c0cb895043f6.svg',
      gradient: 'linear-gradient(135deg, rgb(0, 201, 80) 0%, rgb(0, 166, 62) 100%)'
    },
    {
      label: 'Categories',
      value: '4',
      icon: 'http://localhost:3845/assets/5d5d3a4944eb57523233f0560defded7a238da47.svg',
      gradient: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(152, 16, 250) 100%)'
    }
  ];

  const tabs = [
    { id: 'inventory', label: 'Card Inventory' },
    { id: 'assign', label: 'Assign Card' },
    { id: 'categories', label: 'Categories' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'returns', label: 'Returns' }
  ];

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    // TODO: Filter cards based on search query
  };

  const handleViewCard = (cardId) => {
    console.log('View card:', cardId);
    // TODO: Implement view card details
  };

  const handleEditCard = (cardId) => {
    console.log('Edit card:', cardId);
    // TODO: Implement edit card
  };

  return (
    <div className="cards-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Manage Card</h2>
        <p className="page-subtitle">Manage card inventory, assignments, and purchases</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div
              className="stat-icon"
              style={{ backgroundImage: stat.gradient }}
            >
              <img src={stat.icon} alt="" />
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
            </div>
          </div>
        ))}
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

      {/* Card Inventory Tab Content */}
      {activeTab === 'inventory' && (
        <div className="inventory-content">
          {/* Filters */}
          <div className="filters-section">
            {/* Search */}
            <div className="search-input-wrapper">
              <img
                src="http://localhost:3845/assets/576f3afeb315c88345b0812bf4010526d76b3d5b.svg"
                alt=""
                className="search-icon"
              />
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={handleSearch}
                className="search-input"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="filter-dropdowns">
              <div className="filter-group">
                <label className="filter-label">Type:</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Expiry:</label>
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="expiring">Expiring Before...</option>
                  <option value="no-expiry">No Expiry</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CARD</th>
                  <th>OWNER</th>
                  <th>STATUS</th>
                  <th>EXPIRY</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((card) => (
                  <tr key={card.id}>
                    <td className="card-id-cell">{card.id}</td>
                    <td>
                      <div className="card-info">
                        <div
                          className="card-icon"
                          style={{ backgroundImage: card.gradient }}
                        >
                          <img
                            src="http://localhost:3845/assets/48c5ec2984942afc7a9f1923cb9d463027cdf83f.svg"
                            alt=""
                          />
                        </div>
                        <div className="card-details">
                          <p className="card-uid">{card.uid}</p>
                          <p className="card-type">{card.type}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="owner-info">
                        <p className="owner-name">{card.owner}</p>
                        <p className="owner-type">{card.ownerType}</p>
                      </div>
                    </td>
                    <td>
                      <span className="status-badge status-active">
                        {card.status}
                      </span>
                    </td>
                    <td className="expiry-cell">{card.expiry}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          onClick={() => handleViewCard(card.id)}
                          title="View"
                        >
                          <img
                            src="http://localhost:3845/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg"
                            alt="View"
                          />
                        </button>
                        <button
                          className="action-btn"
                          onClick={() => handleEditCard(card.id)}
                          title="Edit"
                        >
                          <img
                            src="http://localhost:3845/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg"
                            alt="Edit"
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{filteredCards.length}</span> results
              </p>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Tab Contents (Placeholders) */}
      {activeTab !== 'inventory' && (
        <div className="tab-placeholder">
          <p>Content for {tabs.find(t => t.id === activeTab)?.label} tab coming soon...</p>
        </div>
      )}
    </div>
  );
}

export default CardsPage;
