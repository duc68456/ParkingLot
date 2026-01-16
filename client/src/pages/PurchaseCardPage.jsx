import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/PageHeader';
import StepIndicator from '../components/StepIndicator';
import SearchInput from '../components/SearchInput';
import CustomerCard from '../components/CustomerCard';
import AssignCardModal from '../components/AssignCardModal';
import RegisterSubscriptionModal from '../components/RegisterSubscriptionModal';
import '../styles/pages/PurchaseCardPage.css';
import { useAuth } from '../contexts/AuthContext';

import {
  PurchaseCardPlusIcon,
  PurchaseCardSearchIconUrl,
  PurchaseCardTrashIcon,
  PurchaseCardCloseIcon,
  PurchaseCardCheckCircleIcon,
  PurchaseCardPrintIcon,
  PurchaseCardDownloadIcon,
} from '../assets/icons/purchase-card';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const buildInitials = (fullName = '') => {
  const trimmed = String(fullName).trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase();
};

const normalizeCustomer = (c) => {
  const person = c?.person ?? (typeof c?.PersonID === 'object' ? c?.PersonID : null);
  const fullName = person?.FullName || c?.FullName || '';
  const phone = person?.Phone || c?.Phone || '';

  return {
    // CustomerCard in this page expects `id`
    id: c?.ID || c?._id || person?.ID || '',
    _id: c?._id,
    customerId: c?.ID,
    // Fix: We need the Person Business ID (PER####) for card assignment
    personBusinessId: person?.ID || (typeof c?.PersonID === 'string' ? c.PersonID : ''),
    personId: person?._id,
    name: fullName,
    initials: buildInitials(fullName),
    email: c?.Email || person?.Email || '',
    phone,
    gender: person?.Gender || c?.Gender || ''
  };
};

export default function PurchaseCardPage() {
  const { authHeaders } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: ''
  });
  const [errors, setErrors] = useState({});
  const [cards, setCards] = useState([]);
  const [cardForm, setCardForm] = useState({
    category: '',
    quantity: 1,
    expiryDate: '',
  });
  const [cardErrors, setCardErrors] = useState({});

  const [cardCategories, setCardCategories] = useState([]);
  const [categoryPrices, setCategoryPrices] = useState({});
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');

  // Keep invoice meta stable for the session so Step 3 matches the design.
  const [invoiceNumber] = useState(() => `INV-${Date.now()}`);
  const [invoiceDate] = useState(() => new Date().toLocaleDateString('en-GB'));

  // Backend invoice created during "Confirm Payment".
  const [purchaseInvoiceId, setPurchaseInvoiceId] = useState(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [confirmPaymentError, setConfirmPaymentError] = useState('');
  const [finalizingInvoice, setFinalizingInvoice] = useState(false);
  const [finalizeInvoiceError, setFinalizeInvoiceError] = useState('');

  // Cards created after confirm-payment (for display + navigation to assign)
  const [createdCards, setCreatedCards] = useState([]);
  const [invoiceConfirmed, setInvoiceConfirmed] = useState(false);

  // Step 4: Assign Cards state
  const [assigningCardIndex, setAssigningCardIndex] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignedCardIds, setAssignedCardIds] = useState(new Set());

  // Step 5: Subscription state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionCardId, setSubscriptionCardId] = useState(null);
  const [registeredSubscriptions, setRegisteredSubscriptions] = useState(new Set());

  const steps = [
    {
      number: 1,
      title: 'Customer',
      subtitle: 'Select or Create',
      active: currentStep === 1,
      completed: currentStep > 1
    },
    {
      number: 2,
      title: 'Purchase Cards',
      subtitle: 'Add Cards',
      active: currentStep === 2,
      completed: currentStep > 2
    },
    {
      number: 3,
      title: 'Review',
      subtitle: 'Confirm Payment',
      active: currentStep === 3,
      completed: currentStep > 3
    },
    {
      number: 4,
      title: 'Assign Cards',
      subtitle: 'Set UID & Owner',
      active: currentStep === 4,
      completed: currentStep > 4
    },
    {
      number: 5,
      title: 'Subscription',
      subtitle: 'Register Plans',
      active: currentStep === 5,
      completed: false
    }
  ];

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCurrentStep(2);
  };

  const handleCreateCustomer = () => {
    setShowCreateForm(true);
  };

  const handleBackToSelect = () => {
    setShowCreateForm(false);
    setFormData({
      fullName: '',
      phone: '',
      gender: ''
    });
    setErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitCustomer = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      setCustomersLoading(true);
      setCustomersError('');

      // Step 1: Create Person
      const personRes = await fetch(`${API_BASE_URL}/api/persons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          FullName: formData.fullName.trim(),
          Phone: formData.phone.trim(),
          Gender: formData.gender.toUpperCase()
        })
      });

      const personJson = await personRes.json().catch(() => null);

      if (!personRes.ok) {
        throw new Error(personJson?.error?.message || `Failed to create person (${personRes.status})`);
      }

      const personId = personJson?.data?.ID;
      if (!personId) {
        throw new Error('Person created but no ID returned');
      }

      // Step 2: Create Customer linked to Person
      const customerRes = await fetch(`${API_BASE_URL}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          PersonID: personId,
          Status: 'ACTIVE'
        })
      });

      const customerJson = await customerRes.json().catch(() => null);

      if (!customerRes.ok) {
        throw new Error(customerJson?.error?.message || `Failed to create customer (${customerRes.status})`);
      }

      const customerId = customerJson?.data?.ID;
      if (!customerId) {
        throw new Error('Customer created but no ID returned');
      }

      // Successfully created both Person and Customer
      const newCustomer = {
        id: customerId,
        customerId: customerId,
        personId: personId,
        personBusinessId: personId, // For AssignCardModal defaultPersonId
        name: formData.fullName.trim(),
        initials: buildInitials(formData.fullName),
        phone: formData.phone.trim(),
        gender: formData.gender
      };

      setSelectedCustomer(newCustomer);
      // Navigate to step 2
      setCurrentStep(2);
    } catch (err) {
      console.error('Create customer error:', err);
      setCustomersError(err?.message || 'Failed to create customer');
    } finally {
      setCustomersLoading(false);
    }
  };

  const handleCardFormChange = (e) => {
    const { name, value } = e.target;
    setCardForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (cardErrors[name]) {
      setCardErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateCardForm = () => {
    const newErrors = {};

    if (!cardForm.category) {
      newErrors.category = 'Card category is required';
    }

    const qty = Number(cardForm.quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }

    setCardErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCard = (e) => {
    e.preventDefault();
    if (!validateCardForm()) {
      return;
    }

    const qty = Number(cardForm.quantity) || 1;
    const newCards = Array.from({ length: qty }).map((_, idx) => ({
      id: `CARD${String(cards.length + idx + 1).padStart(3, '0')}`,
      category: cardForm.category,
      expiryDate: cardForm.expiryDate,
    }));

    setCards((prev) => [...prev, ...newCards]);

    // Reset form
    setCardForm({
      category: '',
      quantity: 1,
      expiryDate: '',
    });
    setCardErrors({});
  };

  const handleBackFromStep2 = () => {
    setCurrentStep(1);
  };

  const handleContinueToReview = () => {
    if (cards.length > 0) {
      setCurrentStep(3);
    }
  };

  const handleRemoveCard = (cardIdOrCategory) => {
    // Backwards compatible: can remove by card id or by category string
    if (!cardIdOrCategory) return;

    setCards((prev) =>
      prev.filter((card) => card.id !== cardIdOrCategory && card.category !== cardIdOrCategory)
    );
  };

  const getCategoryPrice = (category) => {
    if (!category) return 0;
    const price = categoryPrices?.[category];
    return Number.isFinite(Number(price)) ? Number(price) : 0;
  };

  const getGroupedCards = () => {
    const grouped = {};
    cards.forEach(card => {
      if (!grouped[card.category]) {
        grouped[card.category] = [];
      }
      grouped[card.category].push(card);
    });
    return grouped;
  };

  const calculateSubtotal = () => {
    return cards.reduce((total, card) => {
      return total + getCategoryPrice(card.category);
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const getInvoiceNumber = () => invoiceNumber;
  const getInvoiceDate = () => invoiceDate;

  const handleConfirmPayment = async () => {
    if (!selectedCustomer || cards.length === 0) return;

    try {
      setConfirmPaymentError('');
      setConfirmingPayment(true);

      // UX: this button's main job is to show the invoice modal.
      // We still try to create an invoice in the background so "Done" can finalize inventory.
      setShowInvoiceModal(true);

      // Group cards by category so we create one invoice detail per category.
      // Backend will generate UNASSIGNED cards on "Done" based on Quantity.
      const grouped = getGroupedCards();
      const categoriesByName = new Map(
        (cardCategories || []).map((c) => [c?.Name, c])
      );

      const details = Object.entries(grouped).map(([categoryName, categoryCards]) => {
        const cat = categoriesByName.get(categoryName);
        if (!cat?.ID) {
          throw new Error(`Unknown card category: ${categoryName}`);
        }
        return {
          CardCategoryID: cat.ID,
          Quantity: categoryCards.length,
          UnitPrice: getCategoryPrice(categoryName),
          Notes: null
        };
      });

      const res = await fetch(`${API_BASE_URL}/api/card-purchase-invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          CustomerID: selectedCustomer?.customerId || selectedCustomer?.id,
          // TODO: Replace with the logged-in employee ID when available in AuthContext.
          SaledBy: 'EMP0001',
          InvoiceDate: new Date().toISOString(),
          details
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || `Failed to create invoice (${res.status})`);
      }

      const json = await res.json();
      setPurchaseInvoiceId(json?.data?.ID || json?.data?.id || json?.data?._id || null);
    } catch (e) {
      // Don't block the modal.
      setConfirmPaymentError(e?.message || 'Failed to create invoice');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleCloseInvoiceModal = async () => {
    // When user clicks "Done", we finalize by calling confirm-payment so the server
    // adds UNASSIGNED cards to inventory.
    if (purchaseInvoiceId && !invoiceConfirmed) {
      try {
        setFinalizeInvoiceError('');
        setFinalizingInvoice(true);

        const res = await fetch(`${API_BASE_URL}/api/card-purchase-invoices/${purchaseInvoiceId}/confirm-payment`, {
          method: 'POST',
          headers: {
            ...authHeaders
          }
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to finalize invoice (${res.status})`);
        }

        // Store created cards for display
        const cards = Array.isArray(json?.data?.createdCards) ? json.data.createdCards : [];
        setCreatedCards(cards);
        setInvoiceConfirmed(true);

        // Don't close modal yet - show success with card list
        return;
      } catch (e) {
        setFinalizeInvoiceError(e?.message || 'Failed to add cards to database');
        return;
      } finally {
        setFinalizingInvoice(false);
      }
    }

    // If already confirmed or no invoice, just close
    setShowInvoiceModal(false);
  };

  const handleDownloadInvoice = () => {
    // TODO: Implement actual PDF generation
    console.log('Download invoice PDF');
  };

  const handlePrintInvoice = () => {
    // TODO: Print only modal content (needs dedicated print CSS)
    window.print();
  };

  useEffect(() => {
    const controller = new AbortController();

    ; (async () => {
      try {
        setCategoriesLoading(true);
        setCategoriesError('');

        // 1) Load categories
        const categoriesRes = await fetch(`${API_BASE_URL}/api/card-categories`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        if (!categoriesRes.ok) {
          throw new Error(`Failed to fetch card categories (${categoriesRes.status})`);
        }

        const categoriesJson = await categoriesRes.json();
        const categories = Array.isArray(categoriesJson?.data?.cardCategories)
          ? categoriesJson.data.cardCategories
          : Array.isArray(categoriesJson?.data?.items)
            ? categoriesJson.data.items
            : Array.isArray(categoriesJson?.data?.categories)
              ? categoriesJson.data.categories
              : Array.isArray(categoriesJson?.data)
                ? categoriesJson.data
                : [];

        if (!Array.isArray(categories) || categories.length === 0) {
          // Helpful breadcrumb during integration
          console.warn('Unexpected /api/card-categories payload shape:', categoriesJson);
        }

        setCardCategories(categories);

        // 2) Load current price per category
        const priceEntries = await Promise.all(
          categories.map(async (cat) => {
            const id = cat?.ID;
            const name = cat?.Name;
            if (!id || !name) return null;

            try {
              const res = await fetch(`${API_BASE_URL}/api/card-prices/current/${encodeURIComponent(id)}`, {
                signal: controller.signal,
                headers: { ...authHeaders }
              });

              if (!res.ok) {
                // If missing, treat as 0 for now
                return { name, price: 0 };
              }

              const json = await res.json();
              const price = json?.data?.Price ?? 0;
              return { name, price };
            } catch {
              return { name, price: 0 };
            }
          })
        );

        const nextPrices = {};
        for (const entry of priceEntries) {
          if (entry?.name) nextPrices[entry.name] = Number(entry.price) || 0;
        }
        setCategoryPrices(nextPrices);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch card categories/prices error:', err);
          setCardCategories([]);
          setCategoryPrices({});
          setCategoriesError(err?.message || 'Failed to load categories');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [authHeaders]);

  useEffect(() => {
    const controller = new AbortController();

    ; (async () => {
      try {
        setCustomersLoading(true);
        setCustomersError('');

        // Server supports ?search= (matches person FullName/Phone)
        const qs = new URLSearchParams({
          limit: '100',
          ...(searchQuery ? { search: searchQuery } : {})
        });

        const res = await fetch(`${API_BASE_URL}/api/customers?${qs.toString()}`,
          {
            signal: controller.signal,
            headers: { ...authHeaders }
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch customers (${res.status})`);
        }

        const json = await res.json();
        const list = Array.isArray(json?.data?.customers)
          ? json.data.customers
          : Array.isArray(json?.data?.items)
            ? json.data.items
            : [];

        setCustomers(list.map(normalizeCustomer));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch customers error:', err);
          setCustomers([]);
          setCustomersError(err?.message || 'Failed to load customers');
        }
      } finally {
        if (!controller.signal.aborted) {
          setCustomersLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [authHeaders, searchQuery]);

  const filteredCustomers = useMemo(() => {
    // If server-side search is used, customers is already filtered.
    // We still do a tiny client filter to catch email/name mismatches.
    const query = searchQuery.toLowerCase();
    if (!query) return customers;

    return customers.filter((customer) => {
      const name = String(customer?.name || '').toLowerCase();
      const email = String(customer?.email || '').toLowerCase();
      const phone = String(customer?.phone || '');
      return name.includes(query) || email.includes(query) || phone.includes(searchQuery);
    });
  }, [customers, searchQuery]);

  return (
    <div className="purchase-card-page">
      <PageHeader
        title="Purchase Card"
        subtitle="Register new customers and issue parking cards"
      />

      {/* Step Indicator */}
      <div className="step-indicator-wrapper">
        <StepIndicator steps={steps} />
      </div>

      {/* Step 1: Select or Create Customer */}
      {currentStep === 1 && !showCreateForm && (
        <div className="select-customer-section">
          <div className="section-header">
            <h2 className="section-title">Select Customer</h2>
            <p className="section-subtitle">Choose an existing customer or create a new one</p>
          </div>

          {/* Search Input */}
          <SearchInput
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={setSearchQuery}
            icon={PurchaseCardSearchIconUrl}
            className="customer-search"
          />

          {/* Existing Customers */}
          <div className="existing-customers">
            <h3 className="customers-heading">Existing Customers ({filteredCustomers.length})</h3>
            <div className="customers-grid">
              {customersLoading && (
                <div style={{ gridColumn: '1 / -1' }}>Loading customers…</div>
              )}

              {!customersLoading && customersError && (
                <div style={{ gridColumn: '1 / -1', color: '#B42318' }}>{customersError}</div>
              )}

              {!customersLoading && !customersError && filteredCustomers.length === 0 && (
                <div style={{ gridColumn: '1 / -1' }}>No customers found.</div>
              )}

              {!customersLoading && !customersError && filteredCustomers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onSelect={handleCustomerSelect}
                />
              ))}
            </div>
          </div>

          {/* Create New Customer Button */}
          <div className="create-customer-section">
            <button className="create-customer-btn" onClick={handleCreateCustomer}>
              <PurchaseCardPlusIcon className="purchaseCardPlusIcon" aria-hidden="true" focusable="false" />
              Create New Customer
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Create New Customer Form */}
      {currentStep === 1 && showCreateForm && (
        <div className="create-customer-form-section">
          <div className="section-header">
            <h2 className="section-title">Create New Customer</h2>
            <p className="section-subtitle">Fill in the customer information to proceed</p>
          </div>

          <form onSubmit={handleSubmitCustomer} className="customer-form">
            {/* Form Fields */}
            <div className="form-fields">
              {/* Row 1: Full Name and Phone */}
              <div className="form-row">
                <div className="form-field">
                  <label className="form-label">
                    Full Name<span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    className={`form-input ${errors.fullName ? 'error' : ''}`}
                  />
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Phone<span className="required">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    placeholder="+1234567890"
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                  />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>
              </div>

              {/* Row 2: Gender */}
              <div className="form-field form-field-full">
                <label className="form-label">
                  Gender<span className="required">*</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleFormChange}
                  className={`form-select ${errors.gender ? 'error' : ''}`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                {errors.gender && <span className="error-message">{errors.gender}</span>}
              </div>
            </div>

            {/* Error Message */}
            {customersError && (
              <div className="form-error-banner" style={{ color: '#B42318', padding: '10px', background: '#FEF3F2', borderRadius: '8px', marginBottom: '16px' }}>
                {customersError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleBackToSelect}
                className="back-btn"
                disabled={customersLoading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <button type="submit" className="submit-btn" disabled={customersLoading}>
                {customersLoading ? 'Creating...' : 'Continue to Purchase Cards'}
                {!customersLoading && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Purchase Cards */}
      {currentStep === 2 && selectedCustomer && (
        <div className="purchase-cards-section">
          <div className="section-header">
            <h2 className="section-title">Purchase Cards</h2>
            <p className="section-subtitle">
              Add parking cards with vehicle information for {selectedCustomer.name}
            </p>
          </div>

          {/* Selected Customer */}
          <div className="purchase-customerBanner">
            <CustomerCard customer={selectedCustomer} variant="compact" />
          </div>

          {/* Add New Card Form */}
          <form onSubmit={handleAddCard} className="add-card-form">
            <div className="form-header">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4V16M4 10H16" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3 className="form-title">Add New Card</h3>
            </div>

            <div className="card-form-fields">
              {/* Row 1: Card Category + Quantity */}
              <div className="card-form-row">
                <div className="form-field">
                  <label className="form-label">
                    Card Category<span className="required">*</span>
                  </label>
                  <select
                    name="category"
                    value={cardForm.category}
                    onChange={handleCardFormChange}
                    className={`form-select ${cardErrors.category ? 'error' : ''}`}
                  >
                    <option value="">Select Category</option>
                    {categoriesLoading && (
                      <option value="" disabled>Loading categories…</option>
                    )}
                    {!categoriesLoading && categoriesError && (
                      <option value="" disabled>{categoriesError}</option>
                    )}
                    {!categoriesLoading && !categoriesError && cardCategories.map((cat) => {
                      const name = cat?.Name;
                      if (!name) return null;
                      const price = getCategoryPrice(name);
                      return (
                        <option key={cat?.ID || name} value={name}>
                          {name} (${price})
                        </option>
                      );
                    })}
                  </select>
                  {cardErrors.category && <span className="error-message">{cardErrors.category}</span>}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    Quantity<span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    value={cardForm.quantity || 1}
                    onChange={handleCardFormChange}
                    className={`form-input ${cardErrors.quantity ? 'error' : ''}`}
                  />
                  {cardErrors.quantity && <span className="error-message">{cardErrors.quantity}</span>}
                </div>
              </div>

              {/* Row 2: Expiry (full width) */}
              <div className="form-field">
                <label className="form-label">Expiry Date (Optional)</label>
                <input
                  type="date"
                  name="expiryDate"
                  value={cardForm.expiryDate}
                  onChange={handleCardFormChange}
                  className="form-input"
                />
              </div>
            </div>

            <button type="submit" className="add-card-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 3.2V12.8M3.2 8H12.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Add Card to List
            </button>
          </form>

          {/* Cards to Purchase List */}
          {cards.length > 0 && (
            <div className="cards-to-purchase">
              <div className="cards-header">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3" width="12" height="10" rx="2" stroke="#009966" strokeWidth="1.5" fill="none" />
                  <path d="M2 6H14" stroke="#009966" strokeWidth="1.5" />
                </svg>
                <h3 className="cards-title">Cards to Purchase</h3>
                <span className="cards-count">{cards.length}</span>
              </div>

              <div className="cards-list">
                {Object.entries(getGroupedCards()).map(([category, categoryCards]) => {
                  const price = getCategoryPrice(category);
                  const quantity = categoryCards.length;

                  return (
                    <div key={category} className="card-group-item">
                      <div className="card-group-content">
                        <div className="card-icon">
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="4" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
                            <path d="M3 8H17" stroke="white" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <div className="card-group-details">
                          <div className="card-group-header">
                            <span className="card-type">{category}</span>
                            <span className="card-price-badge">${price}</span>
                          </div>
                          <div className="card-quantityPill">
                            <span className="card-quantityIcon" aria-hidden="true">+</span>
                            <span>Quantity: {quantity}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(category)}
                        className="card-delete-btn"
                        aria-label="Remove card"
                      >
                        <PurchaseCardTrashIcon className="purchaseCardTrashIcon" aria-hidden="true" focusable="false" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning Message */}
          {cards.length === 0 && (
            <div className="warning-message">
              <p>Please add at least one card to continue</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="form-actions">
            <button
              type="button"
              onClick={handleBackFromStep2}
              className="back-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              type="button"
              onClick={handleContinueToReview}
              className={`submit-btn ${cards.length === 0 ? 'disabled' : ''}`}
              disabled={cards.length === 0}
            >
              Continue to Review
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review Invoice */}
      {currentStep === 3 && (
        <div className="review-section">
          <div className="review-header">
            <h2 className="review-title">Review Invoice</h2>
            <p className="review-subtitle">Review the details before confirming payment</p>
          </div>

          <div className="reviewCustomerCard">
            <div className="reviewCustomerAvatar">{selectedCustomer?.initials}</div>
            <div className="reviewCustomerInfo">
              <div className="reviewCustomerName">{selectedCustomer?.name}</div>
              <div className="reviewCustomerEmail">{selectedCustomer?.email}</div>
            </div>
          </div>

          <div className="reviewInvoiceMeta">
            <div className="reviewInvoiceMetaItem">
              <div className="reviewInvoiceMetaLabel">Invoice Number</div>
              <div className="reviewInvoiceMetaValue reviewInvoiceNumber">{getInvoiceNumber()}</div>
            </div>
            <div className="reviewInvoiceMetaItem">
              <div className="reviewInvoiceMetaLabel">Date</div>
              <div className="reviewInvoiceMetaValue">{getInvoiceDate()}</div>
            </div>
          </div>

          <div className="reviewItemsBlock">
            <div className="reviewItemsHeaderRow">
              <div className="reviewItemsHeaderLeft">
                <div className="reviewItemsHeaderIcon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="3" width="12" height="10" rx="2" stroke="#00BC7D" strokeWidth="1.5" fill="none" />
                    <path d="M2 6H14" stroke="#00BC7D" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="reviewItemsHeaderTitle">Items ({Object.keys(getGroupedCards()).length})</div>
              </div>
            </div>

            <div className="reviewItemsList">
              {Object.entries(getGroupedCards()).map(([category, categoryCards]) => {
                const price = getCategoryPrice(category);
                const qty = categoryCards.length;
                const total = price * qty;

                return (
                  <div key={category} className="reviewItemRow">
                    <div className="reviewItemLeft">
                      <div className="reviewItemIcon" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="4" width="14" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
                          <path d="M3 8H17" stroke="white" strokeWidth="1.5" />
                        </svg>
                      </div>
                      <div className="reviewItemMain">
                        <div className="reviewItemNameRow">
                          <div className="reviewItemName">{category}</div>
                          <div className="reviewItemEachBadge">${price} each</div>
                        </div>
                        <div className="reviewItemQtyPill">
                          <span className="reviewItemQtyHash" aria-hidden="true">#</span>
                          <span className="reviewItemQtyText">Quantity: {qty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="reviewItemRight">
                      <div className="reviewItemCalc">${price} × {qty}</div>
                      <div className="reviewItemTotal">${total.toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="reviewTotalsCard">
            <div className="reviewTotalsRows">
              <div className="reviewTotalsRow">
                <div className="reviewTotalsLabel">Subtotal:</div>
                <div className="reviewTotalsValue">${calculateSubtotal().toFixed(2)}</div>
              </div>
              <div className="reviewTotalsRow reviewTotalsRowBorder">
                <div className="reviewTotalsLabel">Tax (10%):</div>
                <div className="reviewTotalsValue">${calculateTax().toFixed(2)}</div>
              </div>
              <div className="reviewTotalsTotalRow">
                <div className="reviewTotalsTotalLabel">Total:</div>
                <div className="reviewTotalsTotalValue">${calculateTotal().toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="review-actions">
            <button type="button" onClick={() => setCurrentStep(2)} className="review-back-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back
            </button>
            <button
              type="button"
              onClick={handleConfirmPayment}
              className="confirm-payment-btn"
              disabled={!selectedCustomer || cards.length === 0}
            >
              <PurchaseCardCheckCircleIcon className="confirmPaymentIcon" aria-hidden="true" focusable="false" />
              Confirm Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Assign Cards */}
      {currentStep === 4 && createdCards.length > 0 && (
        <div className="assign-cards-section">
          <div className="section-header">
            <h2 className="section-title">Assign Cards</h2>
            <p className="section-subtitle">
              Set UID and assign owner for each card. {assignedCardIds.size}/{createdCards.length} assigned.
            </p>
          </div>

          <div className="cards-assign-table" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div className="cards-assign-header" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1.5fr 120px', padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontWeight: 500, fontSize: '13px', color: '#667085' }}>
              <div>Card ID</div>
              <div>Category</div>
              <div>UID</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {createdCards.map((card, idx) => {
              const isAssigned = assignedCardIds.has(card.CardID);
              return (
                <div key={card.CardID} className="cards-assign-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1.5fr 120px', padding: '12px 16px', borderBottom: '1px solid #E4E7EC', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500 }}>{card.CardID}</div>
                  <div style={{ color: '#667085' }}>{card.CardCategoryName}</div>
                  <div style={{ color: '#667085' }}>{card.UID || '—'}</div>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      background: isAssigned ? '#ECFDF3' : '#FEF3F2',
                      color: isAssigned ? '#027A48' : '#B42318'
                    }}>
                      {isAssigned ? 'Assigned' : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    {!isAssigned ? (
                      <button
                        type="button"
                        className="assign-card-btn"
                        style={{ padding: '6px 12px', background: '#155DFC', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => {
                          setAssigningCardIndex(idx);
                          setShowAssignModal(true);
                        }}
                      >
                        Assign
                      </button>
                    ) : (
                      <span style={{ color: '#667085', fontSize: '13px' }}>✓ Done</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="assign-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="skip-btn"
              style={{ padding: '10px 20px', background: '#fff', color: '#344054', border: '1px solid #D0D5DD', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setCurrentStep(5)}
            >
              Skip to Subscription
            </button>
            <button
              type="button"
              className="continue-btn"
              style={{ padding: '10px 20px', background: '#155DFC', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setCurrentStep(5)}
              disabled={assignedCardIds.size === 0}
            >
              Continue to Subscription →
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Subscription */}
      {currentStep === 5 && createdCards.length > 0 && (
        <div className="subscription-section">
          <div className="section-header">
            <h2 className="section-title">Register Subscription</h2>
            <p className="section-subtitle">
              Register subscription plans for assigned cards. {registeredSubscriptions.size}/{assignedCardIds.size} registered.
            </p>
          </div>

          <div className="cards-subscription-table" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E4E7EC', overflow: 'hidden' }}>
            <div className="cards-subscription-header" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1.5fr 140px', padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E4E7EC', fontWeight: 500, fontSize: '13px', color: '#667085' }}>
              <div>Card ID</div>
              <div>Category</div>
              <div>UID</div>
              <div>Subscription</div>
              <div>Actions</div>
            </div>
            {createdCards.filter(c => assignedCardIds.has(c.CardID)).map((card) => {
              const hasSubscription = registeredSubscriptions.has(card.CardID);
              return (
                <div key={card.CardID} className="cards-subscription-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1.5fr 140px', padding: '12px 16px', borderBottom: '1px solid #E4E7EC', alignItems: 'center' }}>
                  <div style={{ fontWeight: 500 }}>{card.CardID}</div>
                  <div style={{ color: '#667085' }}>{card.CardCategoryName}</div>
                  <div style={{ color: '#667085' }}>{card.UID || '—'}</div>
                  <div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      background: hasSubscription ? '#ECFDF3' : '#F9FAFB',
                      color: hasSubscription ? '#027A48' : '#667085'
                    }}>
                      {hasSubscription ? 'Registered' : 'None'}
                    </span>
                  </div>
                  <div>
                    {!hasSubscription ? (
                      <button
                        type="button"
                        className="register-subscription-btn"
                        style={{ padding: '6px 12px', background: '#009966', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => {
                          setSubscriptionCardId(card.CardID);
                          setShowSubscriptionModal(true);
                        }}
                      >
                        Register
                      </button>
                    ) : (
                      <span style={{ color: '#027A48', fontSize: '13px' }}>✓ Active</span>
                    )}
                  </div>
                </div>
              );
            })}
            {assignedCardIds.size === 0 && (
              <div style={{ padding: '24px', textAlign: 'center', color: '#667085' }}>
                No assigned cards available. Please go back and assign cards first.
              </div>
            )}
          </div>

          <div className="subscription-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="back-btn"
              style={{ padding: '10px 20px', background: '#fff', color: '#344054', border: '1px solid #D0D5DD', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => setCurrentStep(4)}
            >
              ← Back to Assign
            </button>
            <button
              type="button"
              className="finish-btn"
              style={{ padding: '10px 20px', background: '#009966', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => {
                // Reset all state and start new purchase
                setCurrentStep(1);
                setSelectedCustomer(null);
                setCards([]);
                setPurchaseInvoiceId(null);
                setCreatedCards([]);
                setInvoiceConfirmed(false);
                setAssignedCardIds(new Set());
                setRegisteredSubscriptions(new Set());
              }}
            >
              Finish & Start New Purchase
            </button>
          </div>
        </div>
      )}

      {/* AssignCardModal */}
      {showAssignModal && assigningCardIndex !== null && createdCards[assigningCardIndex] && (
        <AssignCardModal
          card={{
            id: createdCards[assigningCardIndex].CardID,
            cardId: createdCards[assigningCardIndex].CardID,
            category: createdCards[assigningCardIndex].CardCategoryName,
            status: 'Unassigned'
          }}
          defaultAssignType="customer"
          defaultPersonId={selectedCustomer?.personBusinessId}
          onClose={() => {
            setShowAssignModal(false);
            setAssigningCardIndex(null);
          }}
          onAssign={async (assignData) => {
            try {
              const cardId = createdCards[assigningCardIndex].CardID;
              const res = await fetch(`${API_BASE_URL}/api/cards/${cardId}/assign`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders
                },
                body: JSON.stringify({
                  uid: assignData.uid,
                  personId: assignData.personId
                })
              });

              if (!res.ok) {
                const err = await res.json().catch(() => null);
                throw new Error(err?.error?.message || `Failed to assign card (${res.status})`);
              }

              // Update local state
              setCreatedCards(prev => prev.map((c, idx) =>
                idx === assigningCardIndex ? { ...c, UID: assignData.uid } : c
              ));
              setAssignedCardIds(prev => new Set(prev).add(cardId));
              setShowAssignModal(false);
              setAssigningCardIndex(null);
            } catch (e) {
              console.error('Assign card error:', e);
              alert(e?.message || 'Failed to assign card');
            }
          }}
        />
      )}

      {/* RegisterSubscriptionModal */}
      {showSubscriptionModal && subscriptionCardId && (
        <RegisterSubscriptionModal
          defaultCard={createdCards.find(c => c.CardID === subscriptionCardId)}
          onClose={() => {
            setShowSubscriptionModal(false);
            setSubscriptionCardId(null);
          }}
          onRegister={async (newSubscription) => {
            try {
              const payload = {
                VehicleID: newSubscription?.vehicleId,
                VehicleTypeID: newSubscription?.vehicleTypeId,
                CardID: newSubscription?.cardId,
                SubscriptionTypeID: newSubscription?.subscriptionTypeId,
                PricePaid: newSubscription?.price,
                StartDate: newSubscription?.startDateRaw || undefined,
                CustomerID: newSubscription?.customerId || undefined
              };

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

              // Success - update local state
              setRegisteredSubscriptions(prev => new Set(prev).add(subscriptionCardId));
              setShowSubscriptionModal(false);
              setSubscriptionCardId(null);
            } catch (err) {
              alert(err?.message || 'Failed to register subscription');
            }
          }}
        />
      )}

      {showInvoiceModal && (
        <div className="invoiceModalOverlay" role="dialog" aria-modal="true" aria-label="Invoice">
          <button
            type="button"
            className="invoiceModalOverlayBg"
            aria-label="Close invoice"
            onClick={handleCloseInvoiceModal}
          />

          <div className="invoiceModal">
            <div className="invoiceModalHeader">
              <div className="invoiceModalTitle">Invoice</div>
              <button
                type="button"
                className="invoiceModalClose"
                aria-label="Close"
                onClick={handleCloseInvoiceModal}
              >
                <PurchaseCardCloseIcon className="invoiceModalCloseIcon" aria-hidden="true" focusable="false" />
              </button>
            </div>

            <div className="invoiceModalBody">
              <div className="invoiceSuccessBanner">
                <div className="invoiceSuccessIconWrap" aria-hidden="true">
                  <PurchaseCardCheckCircleIcon className="invoiceSuccessIcon" />
                </div>
                <div className="invoiceSuccessText">
                  <div className="invoiceSuccessTitle">Payment Successful!</div>
                  <div className="invoiceSuccessSubtitle">
                    Customer has been registered and parking cards have been issued.
                  </div>
                </div>
              </div>

              <div className="invoicePaper">
                <div className="invoiceTop">
                  <div className="invoiceTopLeft">
                    <div className="invoiceHeading">INVOICE</div>
                    <div className="invoiceMeta">
                      <div className="invoiceMetaRow">
                        <div className="invoiceMetaKey">Invoice #</div>
                        <div className="invoiceMetaValue">{getInvoiceNumber()}</div>
                      </div>
                      <div className="invoiceMetaRow">
                        <div className="invoiceMetaKey">Date:</div>
                        <div className="invoiceMetaValue">{getInvoiceDate()}</div>
                      </div>
                    </div>
                  </div>

                  <div className="invoiceTopRight">
                    <div className="invoiceVendorLabel">From</div>
                    <div className="invoiceVendorName">Parking System</div>
                    <div className="invoiceVendorNameSecondary">Gate Management Co.</div>
                    <div className="invoiceVendorAddress">123 Main Street, City</div>
                    <div className="invoiceVendorAddress">support@parking.com</div>
                  </div>
                </div>

                <div className="invoiceBillTo">
                  <div className="invoiceSectionLabel">Bill To</div>
                  <div className="invoiceBillCard">
                    <div className="invoiceBillAvatar">{selectedCustomer?.initials}</div>
                    <div>
                      <div className="invoiceBillName">{selectedCustomer?.name}</div>
                      <div className="invoiceBillLine">{selectedCustomer?.email}</div>
                      <div className="invoiceBillLine">{selectedCustomer?.phone}</div>
                    </div>
                  </div>
                </div>

                <div className="invoiceItems">
                  <div className="invoiceItemsHeader">
                    <div className="invoiceItemsTitle">Items</div>
                    <div className="invoiceItemsCount">{cards.length}</div>
                  </div>

                  <div className="invoiceItemsList">
                    {Object.entries(getGroupedCards()).map(([category, categoryCards]) => {
                      const price = getCategoryPrice(category);
                      const qty = categoryCards.length;
                      const rowTotal = price * qty;

                      return (
                        <div key={category} className="invoiceItemRow">
                          <div className="invoiceItemLeft">
                            <div className="invoiceItemNameRow">
                              <div className="invoiceItemName">{category} Card</div>
                              <div className="invoiceItemBadge">${price} each</div>
                            </div>
                            <div className="invoiceItemDesc">Parking access card</div>
                          </div>

                          <div className="invoiceItemQtyWrap">
                            <div className="invoiceQtyPill">{qty}</div>
                          </div>

                          <div className="invoiceItemRight">
                            <div className="invoiceItemCalc">${price} × {qty}</div>
                            <div className="invoiceItemTotal">${rowTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="invoiceTotals">
                  <div className="invoiceTotalsRow">
                    <div className="invoiceTotalsKey">Subtotal</div>
                    <div className="invoiceTotalsValue">${calculateSubtotal().toFixed(2)}</div>
                  </div>
                  <div className="invoiceTotalsRow">
                    <div className="invoiceTotalsKey">Tax (10%)</div>
                    <div className="invoiceTotalsValue">${calculateTax().toFixed(2)}</div>
                  </div>
                  <div className="invoiceTotalsDivider" />
                  <div className="invoiceTotalsRow invoiceTotalsRowTotal">
                    <div className="invoiceTotalsKeyTotal">Total</div>
                    <div className="invoiceTotalsValueTotal">${calculateTotal().toFixed(2)}</div>
                  </div>
                </div>

                <div className="invoiceFooterNotes">
                  <div className="invoiceFooterLine">Thank you for your purchase.</div>
                  <div className="invoiceFooterLine">Please keep this invoice for your records.</div>
                </div>

                {/* Success: Created Cards List */}
                {invoiceConfirmed && createdCards.length > 0 && (
                  <div className="invoiceCreatedCards" style={{ marginTop: '20px', padding: '16px', background: '#ECFDF3', borderRadius: '10px', border: '1px solid #ABEFC6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <PurchaseCardCheckCircleIcon style={{ width: '20px', height: '20px', color: '#12B76A' }} />
                      <span style={{ fontWeight: 500, color: '#027A48' }}>Cards Created Successfully!</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#344054', marginBottom: '8px' }}>
                      {createdCards.length} card(s) added to inventory:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {createdCards.map((c) => (
                        <div key={c.CardID} style={{
                          padding: '6px 12px',
                          background: '#fff',
                          borderRadius: '6px',
                          border: '1px solid #D0D5DD',
                          fontSize: '13px'
                        }}>
                          <span style={{ fontWeight: 500 }}>{c.CardID}</span>
                          <span style={{ color: '#667085', marginLeft: '8px' }}>{c.CardCategoryName}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#667085' }}>
                      These cards are now in UNASSIGNED status. Go to Cards → Assign Card to assign them.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="invoiceModalFooter">
              {!invoiceConfirmed ? (
                <>
                  <button type="button" className="invoiceActionBtn" onClick={handlePrintInvoice}>
                    <PurchaseCardPrintIcon className="invoiceActionIcon" aria-hidden="true" focusable="false" />
                    Print
                  </button>
                  <button type="button" className="invoiceActionBtn invoiceActionBtnBlue" onClick={handleDownloadInvoice}>
                    <PurchaseCardDownloadIcon className="invoiceActionIcon" aria-hidden="true" focusable="false" />
                    Download PDF
                  </button>
                  <button
                    type="button"
                    className="invoiceActionBtn invoiceActionBtnGreen"
                    onClick={handleCloseInvoiceModal}
                    disabled={finalizingInvoice}
                  >
                    {finalizingInvoice ? 'Processing...' : 'Confirm & Create Cards'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="invoiceActionBtn" onClick={handlePrintInvoice}>
                    <PurchaseCardPrintIcon className="invoiceActionIcon" aria-hidden="true" focusable="false" />
                    Print
                  </button>
                  <button
                    type="button"
                    className="invoiceActionBtn invoiceActionBtnGreen"
                    onClick={() => {
                      setShowInvoiceModal(false);
                      // Navigate to Step 4 - Assign Cards
                      setCurrentStep(4);
                    }}
                  >
                    Continue to Assign Cards →
                  </button>
                </>
              )}
            </div>

            {finalizeInvoiceError && (
              <div style={{ padding: '10px', color: '#B42318', background: '#FEF3F2', margin: '12px', borderRadius: '8px' }}>
                {finalizeInvoiceError}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
