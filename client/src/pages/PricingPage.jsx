import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import TabNavigation from '../components/TabNavigation';
import PricingRulesTable from '../components/PricingRulesTable';
import '../styles/pages/PricingPage.css';

const addIcon = "http://localhost:3845/assets/25c699331c374458f53e2c0a64f9f8de133e7e81.svg";

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

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState('entry-pricing');
  const [pricingRules, setPricingRules] = useState(mockEntryPricingRules);

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
          <p>Card Pricing content coming soon...</p>
        </div>
      )}

      {/* Subscription Pricing Tab Content */}
      {activeTab === 'subscription-pricing' && (
        <div className="pricing-content">
          <p>Subscription Pricing content coming soon...</p>
        </div>
      )}
    </div>
  );
}
