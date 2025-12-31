import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import PricingRulesTable from '../components/PricingRulesTable';
import '../styles/pages/PricingPage.css';

import addIcon from '../assets/icons/common/actions/add.svg';
import editIcon from '../assets/icons/common/actions/edit.svg';
import deleteIcon from '../assets/icons/common/actions/trash.svg';

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

// Mock data for card pricing
const mockCardPricing = [
  {
    id: 'CAT001',
    category: 'Standard',
    price: 10.00,
    lastUpdated: '01/01/2024'
  },
  {
    id: 'CAT002',
    category: 'Premium',
    price: 25.00,
    lastUpdated: '01/01/2024'
  },
  {
    id: 'CAT003',
    category: 'VIP',
    price: 50.00,
    lastUpdated: '01/01/2024'
  },
  {
    id: 'CAT004',
    category: 'Staff',
    price: 15.00,
    lastUpdated: '01/01/2024'
  }
];

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
  const [cardPricing, setCardPricing] = useState(mockCardPricing);
  const [subscriptionPricing, setSubscriptionPricing] = useState(mockSubscriptionPricing);

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

  const handleEditCardPrice = (card) => {
    alert(`Edit card pricing: ${card.id}`);
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
                {cardPricing.map((card) => (
                  <tr key={card.id}>
                    <td className="card-id-cell">{card.id}</td>
                    <td>{card.category}</td>
                    <td>${card.price.toFixed(2)}</td>
                    <td>{card.lastUpdated}</td>
                    <td>
                      <div className="action-buttons action-buttons-right">
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
                ))}
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
