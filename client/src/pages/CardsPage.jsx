import { useEffect, useMemo, useState } from 'react';
import AssignCardModal from '../components/AssignCardModal';
import AddCategoryModal from '../components/AddCategoryModal';
import EditCategoryModal from '../components/EditCategoryModal';
import ViewCardModal from '../components/ViewCardModal';
import ViewCategoryCardsModal from '../components/ViewCategoryCardsModal';
import DeleteCategoryModal from '../components/DeleteCategoryModal';
import EditCardModal from '../components/EditCardModal';
import { useAuth } from '../contexts/AuthContext';
import { useAuthz } from '../contexts/AuthzContext';
import { canEditModule } from '../utils/permissions';
import {
  CardsActionEditIcon,
  CardsActionSearchIcon,
  CardsActionViewIcon,
  CardsGlyphListIcon
} from '../assets/icons/cards';
import '../styles/pages/CardsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const gradientForStatus = (status) => {
  switch (String(status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)';
    case 'PENDING_RFID':
      return 'linear-gradient(135deg, rgb(240, 177, 0) 0%, rgb(208, 135, 0) 100%)';
    case 'INACTIVE':
    case 'RETURNED':
      return 'linear-gradient(135deg, rgb(144, 161, 185) 0%, rgb(98, 116, 142) 100%)';
    case 'EXPIRED':
      return 'linear-gradient(135deg, rgb(245, 158, 11) 0%, rgb(217, 119, 6) 100%)';
    default:
      return 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(152, 16, 250) 100%)';
  }
};

const normalizeCategory = (c) => {
  // Server model: { id (mongo), ID: "CCG0001", Name, IsActive, currentPrice }
  const isActive = c?.IsActive !== undefined ? c.IsActive : true;
  return {
    id: c?.id ?? c?._id ?? c?.ID,
    CategoryID: c?.ID ?? c?.CategoryID ?? c?.categoryId,
    name: c?.Name ?? c?.name,
    status: isActive ? 'Active' : 'Inactive',
    IsActive: isActive,
    currentPrice: c?.currentPrice ?? null,
    priceLastUpdated: c?.priceLastUpdated ?? null
  };
};

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const normalizeCard = (c) => {
  const categoryName = c?.CardCategoryID?.Name || c?.CardCategoryID?.ID || c?.CardCategoryID;
  const ownerName = c?.OwnerID?.FullName || c?.OwnerID?.ID || c?.OwnerID;
  const vehiclePlate = c?.VehicleInfo?.PlateNumber || '-';
  const vehicleType = c?.VehicleInfo?.VehicleTypeName || '-';
  const status = (c?.Status || '').toUpperCase() || 'ACTIVE';

  return {
    id: c?.CardID || c?.id || c?._id,
    uid: c?.UID,
    type: categoryName || '-',
    category: categoryName || '-',
    owner: ownerName || 'Unassigned',
    ownerType: c?.OwnerID ? 'Customer' : '-', // can be refined later
    status: status.charAt(0) + status.slice(1).toLowerCase().replace(/_(.)/g, (_, ch) => ` ${ch.toUpperCase()}`),
    rawStatus: status,
    expiry: formatDate(c?.ExpireDay),
    vehiclePlate,
    vehicleType,
    gradient: gradientForStatus(status),
    _raw: c
  };
};

function CardsPage() {
  const { authHeaders } = useAuth();
  const { hasPermission } = useAuthz();
  const canEdit = canEditModule(hasPermission, 'CARDS');
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignedFilter, setAssignedFilter] = useState('all');
  const [assignCategoryFilter, setAssignCategoryFilter] = useState('all');
  const [categoriesStatusFilter, setCategoriesStatusFilter] = useState('all');
  const [categoriesPriceFilter, setCategoriesPriceFilter] = useState('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [filteredCards, setFilteredCards] = useState([]);


  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const [showViewCardModal, setShowViewCardModal] = useState(false);
  const [cardToView, setCardToView] = useState(null);
  const [showEditCardModal, setShowEditCardModal] = useState(false);
  const [cardToEdit, setCardToEdit] = useState(null);
  const [showViewCategoryCardsModal, setShowViewCategoryCardsModal] = useState(false);
  const [categoryToViewCards, setCategoryToViewCards] = useState(null);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Purchase invoices (Cards -> Invoices tab)
  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [purchaseInvoicesLoading, setPurchaseInvoicesLoading] = useState(false);
  const [purchaseInvoicesError, setPurchaseInvoicesError] = useState('');

  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [invoiceDetailLoading, setInvoiceDetailLoading] = useState(false);
  const [invoiceDetailError, setInvoiceDetailError] = useState('');
  const [invoiceDetail, setInvoiceDetail] = useState(null);

  // Pagination states
  const [inventoryPage, setInventoryPage] = useState(1);
  const [assignPage, setAssignPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [invoicesPage, setInvoicesPage] = useState(1);
  const [returnsPage, setReturnsPage] = useState(1);
  const itemsPerPage = 10;

  // Returns tab state
  const [returnedCards, setReturnedCards] = useState([]);
  const [returnedCardsLoading, setReturnedCardsLoading] = useState(false);
  const [returnedCardsError, setReturnedCardsError] = useState('');
  const [returnsSearchQuery, setReturnsSearchQuery] = useState('');
  const [reusingCardId, setReusingCardId] = useState(null);

  // Load cards when visiting inventory/assign tab
  useEffect(() => {
    if (activeTab !== 'inventory' && activeTab !== 'assign') return;
    const controller = new AbortController();

    (async () => {
      try {
        setCardsLoading(true);
        setCardsError('');

        const res = await fetch(`${API_BASE_URL}/api/cards?limit=200`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Failed to fetch cards (${res.status})`;
          throw new Error(msg);
        }

        const list = Array.isArray(json?.data?.items) ? json.data.items : [];
        setCards(list.map(normalizeCard));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch cards error:', err);
          setCards([]);
          setCardsError(err?.message || 'Failed to load cards');
        }
      } finally {
        if (!controller.signal.aborted) setCardsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, authHeaders]);

  // Load categories from backend when visiting Categories tab
  useEffect(() => {
    if (activeTab !== 'categories') return;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/card-categories?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Failed to fetch categories (${res.status})`;
          throw new Error(msg);
        }

        const list = Array.isArray(json?.data?.cardCategories) ? json.data.cardCategories : [];
        setCategories(list.map(normalizeCategory));
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch card categories error:', err);
          setCategories([]);
        }
      }
    })();

    return () => controller.abort();
  }, [activeTab, authHeaders]);

  // Load returned cards when visiting Returns tab
  useEffect(() => {
    if (activeTab !== 'returns') return;
    const controller = new AbortController();

    const fetchReturnedCards = async () => {
      setReturnedCardsLoading(true);
      setReturnedCardsError('');
      try {
        const res = await fetch(`${API_BASE_URL}/api/cards?status=RETURNED&limit=1000`, {
          headers: authHeaders,
          signal: controller.signal
        });
        if (!res.ok) throw new Error('Failed to fetch returned cards');
        const data = await res.json();
        const items = Array.isArray(data?.data?.items) ? data.data.items : [];
        setReturnedCards(items.map(normalizeCard));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setReturnedCardsError(err.message || 'Error loading returned cards');
        }
      } finally {
        setReturnedCardsLoading(false);
      }
    };

    fetchReturnedCards();
    return () => controller.abort();
  }, [activeTab, authHeaders]);

  // Load purchase invoices from backend when visiting Invoices tab
  useEffect(() => {
    if (activeTab !== 'invoices') return;
    const controller = new AbortController();

    (async () => {
      try {
        setPurchaseInvoicesLoading(true);
        setPurchaseInvoicesError('');

        const res = await fetch(`${API_BASE_URL}/api/card-purchase-invoices?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Failed to fetch invoices (${res.status})`;
          throw new Error(msg);
        }

        const items = Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data?.invoices)
            ? json.data.invoices
            : Array.isArray(json?.data)
              ? json.data
              : [];

        setPurchaseInvoices(items);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch purchase invoices error:', err);
          setPurchaseInvoices([]);
          setPurchaseInvoicesError(err?.message || 'Failed to load invoices');
        }
      } finally {
        if (!controller.signal.aborted) setPurchaseInvoicesLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, authHeaders]);

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
  };

  const handleInvoiceSearch = (e) => {
    setInvoiceSearchQuery(e.target.value);
  };

  const deriveCardsCountFromInvoice = (inv) => {
    const maybeCount = Number(
      inv?.CardsCount ??
      inv?.TotalCards ??
      inv?.Cards ??
      inv?.cardsCount ??
      inv?.CardCount
    );
    if (Number.isFinite(maybeCount)) return maybeCount;

    // If the list endpoint returned hydrated details, prefer them.
    if (Array.isArray(inv?.details) && inv.details.length > 0) {
      return inv.details.reduce((sum, d) => sum + (Number(d?.Quantity) || 0), 0);
    }

    return null;
  };

  const formatMoney = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '-';
    return `$ ${num.toFixed(2)}`;
  };

  const calcInvoiceCardsCount = (inv) => {
    const fromListField = deriveCardsCountFromInvoice(inv);
    if (Number.isFinite(fromListField)) return fromListField;

    if (Array.isArray(inv?.details) && inv.details.length > 0) {
      return inv.details.reduce((sum, d) => sum + (Number(d?.Quantity) || 0), 0);
    }

    return null;
  };

  const getInvoiceDisplayStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (!s) return { text: '-', isCompleted: false };
    if (s === 'COMPLETED') return { text: 'Completed', isCompleted: true };
    return { text: s.charAt(0) + s.slice(1).toLowerCase(), isCompleted: false };
  };

  const handleViewInvoice = (invoiceId) => {
    if (!invoiceId) return;

    (async () => {
      try {
        setInvoiceDetailError('');
        setInvoiceDetailLoading(true);
        setInvoiceDetailOpen(true);
        setInvoiceDetail(null);

        const res = await fetch(`${API_BASE_URL}/api/card-purchase-invoices/${encodeURIComponent(invoiceId)}`, {
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Failed to load invoice (${res.status})`;
          throw new Error(msg);
        }

        setInvoiceDetail(json?.data || null);
      } catch (err) {
        console.error('Fetch invoice detail error:', err);
        setInvoiceDetailError(err?.message || 'Failed to load invoice');
      } finally {
        setInvoiceDetailLoading(false);
      }
    })();
  };

  const handleCloseInvoiceDetail = () => {
    setInvoiceDetailOpen(false);
    setInvoiceDetail(null);
    setInvoiceDetailError('');
    setInvoiceDetailLoading(false);
  };

  const filteredCardsMemo = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let next = [...cards];

    // Search
    if (query) {
      next = next.filter((c) => {
        const id = String(c?.id || '').toLowerCase();
        const uid = String(c?.uid || '').toLowerCase();
        const type = String(c?.type || '').toLowerCase();
        const owner = String(c?.owner || '').toLowerCase();
        return id.includes(query) || uid.includes(query) || type.includes(query) || owner.includes(query);
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      next = next.filter((c) => String(c?.type || '').toLowerCase() === String(typeFilter).toLowerCase());
    }

    // Status filter
    if (statusFilter !== 'all') {
      next = next.filter((c) => String(c?.rawStatus || '').toLowerCase() === String(statusFilter).toLowerCase());
    }

    // Assigned filter
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'assigned') {
        next = next.filter((c) => c.owner !== 'Unassigned');
      } else if (assignedFilter === 'unassigned') {
        next = next.filter((c) => c.owner === 'Unassigned');
      }
    }

    return next;
  }, [cards, assignedFilter, searchQuery, statusFilter, typeFilter]);

  // Derived list for Assign Card tab (unassigned inventory)
  const unassignedCards = useMemo(() => {
    // Business rule: cards are initially created as UNASSIGNED and later assigned to a person.
    const list = Array.isArray(cards) ? cards : [];
    let filtered = list.filter((c) => {
      if (String(c?.rawStatus || '').toUpperCase() !== 'UNASSIGNED') return false;

      // Business rule: Visitor cards are not assignable.
      const typeOrCategory = String(c?.type || c?.category || '').trim().toLowerCase();
      if (typeOrCategory === 'visitor') return false;

      return true;
    });

    // Apply category filter
    if (assignCategoryFilter !== 'all') {
      filtered = filtered.filter((c) =>
        String(c?.category || c?.type || '').toLowerCase() === String(assignCategoryFilter).toLowerCase()
      );
    }

    return filtered;
  }, [cards, assignCategoryFilter]);

  useEffect(() => {
    setFilteredCards(filteredCardsMemo);
  }, [filteredCardsMemo]);

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'status-pill status-pill--active';
      case 'inactive':
        return 'status-pill status-pill--inactive';
      case 'pending rfid':
        return 'status-pill status-pill--pending';
      case 'unassigned':
        return 'status-pill status-pill--inactive';
      case 'returned':
        return 'status-pill status-pill--inactive';
      case 'expired':
        return 'status-pill status-pill--expired';
      default:
        return 'status-pill';
    }
  };

  const handleViewCard = (cardId) => {
    const card = filteredCards.find(c => c.id === cardId) || cards.find((c) => c.id === cardId);
    if (card) {
      // Ensure card has all required fields
      const cardWithDefaults = {
        ...card,
        owner: card.owner || 'Unassigned',
        ownerType: card.ownerType || '-',
        type: card.type || card.category || '-'
      };
      setCardToView(cardWithDefaults);
      setShowViewCardModal(true);
    }
  };

  const handleCloseViewCardModal = () => {
    setShowViewCardModal(false);
    setCardToView(null);
  };

  const handleEditCard = (cardId) => {
    if (!canEdit) return;
    const card = filteredCards.find(c => c.id === cardId) || cards.find((c) => c.id === cardId);
    if (card) {
      setCardToEdit(card);
      setShowEditCardModal(true);
    }
  };

  const handleSaveCardStatus = async (cardId, newStatus) => {
    try {
      // Find the Mongo _id from the raw object if possible, or use the cardId (which might be the business ID in this page logic, normalized as 'id')
      // normalizeCard uses: id: c?.CardID || c?.id || c?._id
      // The PUT endpoint usually expects Mongo ID but let's check if it handles business ID.
      // CardsRouter.put('/:id', Card.findById(req.params.id)) -> requires Mongo ID.
      // Ensure we have the Mongo ID.
      const cardObj = cards.find(c => c.id === cardId);
      const mongoId = cardObj?._raw?._id || cardObj?._raw?.id;

      if (!mongoId) throw new Error('Cannot identify card for update');

      const res = await fetch(`${API_BASE_URL}/api/cards/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          Status: newStatus
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to update card status');
      }

      const updatedRaw = json?.data;
      if (updatedRaw) {
        const normalized = normalizeCard(updatedRaw);
        setCards(prev => prev.map(c => c.id === normalized.id ? normalized : c));
      }

      return true;
    } catch (err) {
      console.error('Update card status error:', err);
      throw err;
    }
  };

  // Handle reuse card (RETURNED -> UNASSIGNED)
  const handleReuseCard = async (cardId) => {
    if (!canEdit) return;
    setReusingCardId(cardId);
    try {
      // Find the card in returnedCards to get Mongo ID
      const cardObj = returnedCards.find(c => c.id === cardId);
      const mongoId = cardObj?._raw?._id || cardObj?._raw?.id;

      if (!mongoId) throw new Error('Cannot identify card for reuse');

      // Update card status to UNASSIGNED and clear owner/UID
      const res = await fetch(`${API_BASE_URL}/api/cards/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          Status: 'UNASSIGNED',
          OwnerID: null,
          UID: null
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to reuse card');
      }

      // Remove from returnedCards list (card is now UNASSIGNED, not RETURNED)
      setReturnedCards(prev => prev.filter(c => c.id !== cardId));

      // Also update the main cards state if the card exists there
      const updatedRaw = json?.data;
      if (updatedRaw) {
        const normalized = normalizeCard(updatedRaw);
        setCards(prev => prev.map(c => c.id === normalized.id ? normalized : c));
      }
    } catch (err) {
      console.error('Reuse card error:', err);
      alert(err.message || 'Failed to reuse card');
    } finally {
      setReusingCardId(null);
    }
  };

  const handleCloseEditCardModal = () => {
    setShowEditCardModal(false);
    setCardToEdit(null);
  };

  const handleAssignClick = (card) => {
    if (!canEdit) return;
    setSelectedCard(card);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSelectedCard(null);
  };

  const handleAssignCard = (assignData) => {
    (async () => {
      try {
        const uidValue = String(assignData?.uid || '').trim();

        // IMPORTANT:
        // For newly purchased inventory cards, UID is blank until assignment-time scan.
        // If we call the endpoint using the scanned UID in the URL, the server can't find
        // the card yet (because it doesn't have that UID). So always target the selected
        // card by its identifier (CardID or Mongo _id), and send the scanned UID in body.
        const assignIdentifier = String(assignData.cardId);

        const res = await fetch(`${API_BASE_URL}/api/cards/${encodeURIComponent(assignIdentifier)}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            type: 'customer',
            personId: assignData.personId,
            uid: uidValue || undefined
          })
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Assign failed (${res.status})`;
          throw new Error(msg);
        }

        const updated = json?.data;
        if (updated) {
          const normalized = normalizeCard(updated);
          setCards((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
        }

        handleCloseAssignModal();
        window.alert(`Card ${assignIdentifier} assigned successfully!`);
      } catch (err) {
        console.error('Assign card error:', err);
        window.alert(err?.message || 'Failed to assign card');
      }
    })();
  };

  const handleAddCategory = () => {
    if (!canEdit) return;
    setShowAddCategoryModal(true);
  };

  const handleCloseAddCategoryModal = () => {
    setShowAddCategoryModal(false);
  };

  const handleCreateCategory = async (categoryData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/card-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        // Backend schema: Name + IsActive, plus optional Price to create an initial card price.
        body: JSON.stringify({
          Name: categoryData?.name,
          IsActive: true,
          Price: categoryData?.price
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Create failed (${res.status})`;
        throw new Error(msg);
      }

      const created = json?.data;
      if (created) {
        setCategories((prev) => [normalizeCategory(created), ...prev]);
      }
      setShowAddCategoryModal(false);
    } catch (err) {
      console.error('Create category error:', err);
      window.alert(err?.message || 'Failed to create category');
      throw err;
    }
  };

  const handleDeleteCategory = (category) => {
    if (!canEdit) return;
    setCategoryToDelete(category);
    setShowDeleteCategoryModal(true);
  };

  const handleConfirmDeleteCategory = async (category, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/card-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          IsActive: newStatus === 'Active'
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || `Update failed (${res.status})`;
        throw new Error(msg);
      }

      const saved = json?.data;
      const normalized = saved ? normalizeCategory(saved) : { ...category, status: newStatus, IsActive: newStatus === 'Active' };
      setCategories((prev) => prev.map((c) => (c.id === category.id ? { ...c, ...normalized } : c)));
    } catch (err) {
      console.error('Update category status error:', err);
      window.alert(err?.message || 'Failed to update category status');
      throw err;
    }
  };

  const handleEditCategory = (categoryId) => {
    if (!canEdit) return;
    const found = categories.find((c) => c.id === categoryId);
    if (!found) return;
    setCategoryToEdit(found);
    setShowEditCategoryModal(true);
  };

  const handleCloseEditCategoryModal = () => {
    setShowEditCategoryModal(false);
    setCategoryToEdit(null);
  };

  const handleUpdateCategory = (updated) => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/card-categories/${updated?.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            Name: updated?.name
          })
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = json?.error?.message || `Update failed (${res.status})`;
          throw new Error(msg);
        }

        const saved = json?.data;
        const normalized = saved ? normalizeCategory(saved) : { ...updated, status: 'Active', IsActive: true };
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...normalized } : c)));

        handleCloseEditCategoryModal();
      } catch (err) {
        console.error('Update category error:', err);
        window.alert(err?.message || 'Failed to update category');
      }
    })();
  };

  const categoriesStatsValue = useMemo(() => String(categories.length), [categories.length]);

  // Calculate real-time stats from actual data
  const totalCardsCount = useMemo(() => String(cards.length), [cards.length]);
  const unassignedCardsCount = useMemo(() => {
    const count = cards.filter(c => String(c?.rawStatus || '').toUpperCase() === 'UNASSIGNED').length;
    return String(count);
  }, [cards]);
  const activeCardsCount = useMemo(() => {
    const count = cards.filter(c => String(c?.rawStatus || '').toUpperCase() === 'ACTIVE').length;
    return String(count);
  }, [cards]);

  const stats = useMemo(() => [
    {
      label: 'Total Cards',
      value: totalCardsCount,
      gradient: 'linear-gradient(135deg, rgb(43, 127, 255) 0%, rgb(21, 93, 252) 100%)'
    },
    {
      label: 'Unassigned',
      value: unassignedCardsCount,
      gradient: 'linear-gradient(135deg, rgb(240, 177, 0) 0%, rgb(208, 135, 0) 100%)'
    },
    {
      label: 'Active Cards',
      value: activeCardsCount,
      gradient: 'linear-gradient(135deg, rgb(0, 201, 80) 0%, rgb(0, 166, 62) 100%)'
    },
    {
      label: 'Categories',
      value: categoriesStatsValue,
      gradient: 'linear-gradient(135deg, rgb(173, 70, 255) 0%, rgb(152, 16, 250) 100%)'
    }
  ], [totalCardsCount, unassignedCardsCount, activeCardsCount, categoriesStatsValue]);

  // Pagination helpers
  const paginateData = (data, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength) => Math.ceil(dataLength / itemsPerPage);

  // Paginated data
  const paginatedInventoryCards = useMemo(() =>
    paginateData(filteredCards, inventoryPage),
    [filteredCards, inventoryPage]
  );

  const paginatedAssignCards = useMemo(() =>
    paginateData(unassignedCards, assignPage),
    [unassignedCards, assignPage]
  );

  const filteredCategories = useMemo(() => {
    let filtered = [...categories];

    // Status filter
    if (categoriesStatusFilter !== 'all') {
      filtered = filtered.filter((c) =>
        String(c?.status || '').toLowerCase() === String(categoriesStatusFilter).toLowerCase()
      );
    }

    // Price filter (free/fee)
    if (categoriesPriceFilter !== 'all') {
      if (categoriesPriceFilter === 'free') {
        filtered = filtered.filter((c) => !c?.currentPrice || Number(c.currentPrice) === 0);
      } else if (categoriesPriceFilter === 'fee') {
        filtered = filtered.filter((c) => c?.currentPrice && Number(c.currentPrice) > 0);
      }
    }

    return filtered;
  }, [categories, categoriesStatusFilter, categoriesPriceFilter]);

  const paginatedCategories = useMemo(() =>
    paginateData(filteredCategories, categoriesPage),
    [filteredCategories, categoriesPage]
  );

  const filteredInvoices = useMemo(() => {
    let filtered = [...purchaseInvoices];

    // Search filter
    const query = invoiceSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((inv) => {
        const id = String(inv?.ID || inv?.id || inv?._id || '').toLowerCase();
        const customerName = String(
          inv?.CustomerID?.PersonID?.FullName ||
          inv?.CustomerID?.PersonID?.ID ||
          inv?.CustomerID?.ID ||
          inv?.CustomerID ||
          ''
        ).toLowerCase();
        return id.includes(query) || customerName.includes(query);
      });
    }

    // Status filter
    if (invoiceStatusFilter !== 'all') {
      filtered = filtered.filter((inv) =>
        String(inv?.Status || '').toUpperCase() === String(invoiceStatusFilter).toUpperCase()
      );
    }

    return filtered;
  }, [purchaseInvoices, invoiceSearchQuery, invoiceStatusFilter]);

  const paginatedInvoices = useMemo(() =>
    paginateData(filteredInvoices, invoicesPage),
    [filteredInvoices, invoicesPage]
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setInventoryPage(1);
  }, [searchQuery, typeFilter, statusFilter, assignedFilter]);

  useEffect(() => {
    setAssignPage(1);
  }, [assignCategoryFilter]);

  useEffect(() => {
    setCategoriesPage(1);
  }, [categoriesStatusFilter, categoriesPriceFilter]);

  useEffect(() => {
    setInvoicesPage(1);
  }, [invoiceSearchQuery, invoiceStatusFilter]);

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
              <div className="cards-statIcon" aria-hidden="true">
                <CardsActionSearchIcon />
              </div>
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
              <span className="search-icon" aria-hidden="true">
                <CardsActionSearchIcon />
              </span>
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
                  {[...new Set(cards.map((c) => String(c?.type || '').toLowerCase()).filter(Boolean))]
                    .sort()
                    .map((t) => (
                      <option key={t} value={t}>{t.replace(/^./, (ch) => ch.toUpperCase())}</option>
                    ))}
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
                  <option value="pending_rfid">Pending RFID</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="returned">Returned</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Assigned:</label>
                <select
                  value={assignedFilter}
                  onChange={(e) => setAssignedFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              <button
                className="clear-filters-btn"
                onClick={() => {
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setAssignedFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="data-table-container cards-inventory-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-card">CARD</th>
                  <th className="col-owner">OWNER</th>
                  <th className="col-vehicle">VEHICLE</th>
                  <th className="col-status">STATUS</th>
                  <th className="col-actions text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedInventoryCards.map((card) => (
                  <tr key={card.id}>
                    <td className="table-cell col-id">{card.id}</td>
                    <td className="table-cell col-card">
                      <div className="inventory-cardCell">
                        <div
                          className="inventory-cardIcon"
                          style={{ backgroundImage: card.gradient }}
                        >
                          <div className="cards-cardGlyph" aria-hidden="true">
                            <CardsGlyphListIcon />
                          </div>
                        </div>
                        <div className="inventory-cardText">
                          <p className="inventory-cardUid" title={card.uid || ''}>{card.id}</p>
                          <p className="inventory-cardType">{card.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell col-owner">
                      <div className="inventory-twoLine">
                        <p className="inventory-primaryText">{card.owner}</p>
                        <p className="inventory-secondaryText">{card.ownerType}</p>
                      </div>
                    </td>
                    <td className="table-cell col-vehicle">
                      <div className="inventory-twoLine">
                        <p className="inventory-primaryText inventory-monoText">{card.vehiclePlate || 'ABC-1234'}</p>
                        <p className="inventory-secondaryText">{card.vehicleType || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="table-cell col-status">
                      <span className={getStatusBadgeClass(card.status)}>{card.status}</span>
                    </td>
                    <td className="table-cell col-actions">
                      <div className="inventory-actions">
                        <button
                          className="inventory-actionBtn"
                          onClick={() => handleViewCard(card.id)}
                          title="View"
                        >
                          <CardsActionViewIcon aria-hidden="true" />
                        </button>
                        {canEdit && (
                          <button
                            className="inventory-actionBtn"
                            onClick={() => handleEditCard(card.id)}
                            title="Edit"
                          >
                            <CardsActionEditIcon aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedInventoryCards.length}</span> of {filteredCards.length} results (Page {inventoryPage} of {getTotalPages(filteredCards.length)})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setInventoryPage(p => Math.max(1, p - 1))}
                  disabled={inventoryPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setInventoryPage(p => Math.min(getTotalPages(filteredCards.length), p + 1))}
                  disabled={inventoryPage >= getTotalPages(filteredCards.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Card Tab Content */}
      {activeTab === 'assign' && (
        <div className="assign-content">
          {/* Filters */}
          <div className="filters-section">
            <div className="filter-dropdowns">
              <div className="filter-group">
                <label className="filter-label">Category:</label>
                <select
                  value={assignCategoryFilter}
                  onChange={(e) => setAssignCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {[...new Set(cards.map((c) => String(c?.category || c?.type || '').toLowerCase()).filter(Boolean))]
                    .sort()
                    .map((cat) => (
                      <option key={cat} value={cat}>{cat.replace(/^./, (ch) => ch.toUpperCase())}</option>
                    ))}
                </select>
              </div>

              <button
                className="clear-filters-btn"
                onClick={() => setAssignCategoryFilter('all')}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="info-banner" role="status" aria-live="polite">
            <p>
              <span className="info-count">{unassignedCards.length}</span> unassigned cards available
            </p>
          </div>

          {/* Unassigned Cards Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CARD</th>
                  <th>OWNER</th>
                  <th>VEHICLE</th>
                  <th>STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAssignCards.map((card) => (
                  <tr key={card.id}>
                    <td className="card-id-cell">{card.id}</td>
                    <td>
                      <div className="inventory-cardCell">
                        <div
                          className="inventory-cardIcon"
                          style={{ backgroundImage: card.gradient }}
                        >
                          <div className="cards-cardGlyph" aria-hidden="true">
                            <CardsGlyphListIcon />
                          </div>
                        </div>
                        <div className="inventory-cardText">
                          <p className="inventory-cardUid" title={card.uid || ''}>{card.id}</p>
                          <p className="inventory-cardType">{card.category}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="owner-info">
                        <p className="owner-name">Unassigned</p>
                        <p className="owner-type">Unassigned</p>
                      </div>
                    </td>
                    <td className="vehicle-cell">
                      <span className="vehicle-placeholder">-</span>
                    </td>
                    <td>
                      <span className={`status-pill status-pill--inactive`}>{card.status}</span>
                    </td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        {canEdit && (
                          <button
                            className="btn-assign-action btn-assign-action--primary"
                            onClick={() => handleAssignClick(card)}
                          >
                            Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedAssignCards.length}</span> of {unassignedCards.length} results (Page {assignPage} of {getTotalPages(unassignedCards.length)})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setAssignPage(p => Math.max(1, p - 1))}
                  disabled={assignPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setAssignPage(p => Math.min(getTotalPages(unassignedCards.length), p + 1))}
                  disabled={assignPage >= getTotalPages(unassignedCards.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="categories-content">
          {/* Filters and Add Button */}
          <div className="filters-section">
            <div className="filter-dropdowns">
              <div className="filter-group">
                <label className="filter-label">Status:</label>
                <select
                  value={categoriesStatusFilter}
                  onChange={(e) => setCategoriesStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Price:</label>
                <select
                  value={categoriesPriceFilter}
                  onChange={(e) => setCategoriesPriceFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free</option>
                  <option value="fee">Fee</option>
                </select>
              </div>

              <button
                className="clear-filters-btn"
                onClick={() => {
                  setCategoriesStatusFilter('all');
                  setCategoriesPriceFilter('all');
                }}
              >
                Clear Filters
              </button>
            </div>

            {canEdit && (
              <button className="btn-add-category" onClick={handleAddCategory}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 4V16M4 10H16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Category
              </button>
            )}
          </div>

          {/* Categories Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>NAME</th>
                  <th>PRICE</th>
                  <th>STATUS</th>
                  <th className="text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="category-id-cell">{category.CategoryID || category.id}</td>
                    <td className="category-name-cell">{category.name}</td>
                    <td className="category-price-cell">
                      {category.currentPrice !== null ? `$${Number(category.currentPrice).toFixed(2)}` : '-'}
                    </td>
                    <td className="category-status-cell">
                      <span className={getStatusBadgeClass(category.status)}>{category.status}</span>
                    </td>
                    <td>
                      <div className="action-buttons action-buttons-right">
                        <button
                          className="action-btn"
                          onClick={() => {
                            setCategoryToViewCards(category);
                            setShowViewCategoryCardsModal(true);
                          }}
                          title="View Cards"
                        >
                          <CardsActionViewIcon aria-hidden="true" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => handleEditCategory(category.id)}
                              title="Edit"
                            >
                              <CardsActionEditIcon aria-hidden="true" />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => handleDeleteCategory(category)}
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedCategories.length}</span> of {filteredCategories.length} results (Page {categoriesPage} of {getTotalPages(filteredCategories.length)})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setCategoriesPage(p => Math.max(1, p - 1))}
                  disabled={categoriesPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setCategoriesPage(p => Math.min(getTotalPages(filteredCategories.length), p + 1))}
                  disabled={categoriesPage >= getTotalPages(filteredCategories.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="invoices-content">
          {/* Filters */}
          <div className="filters-section">
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">
                <CardsActionSearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search invoices..."
                value={invoiceSearchQuery}
                onChange={handleInvoiceSearch}
                className="search-input"
              />
            </div>

            <div className="filter-dropdowns">
              <div className="filter-group">
                <label className="filter-label">Status:</label>
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <button
                className="clear-filters-btn"
                onClick={() => {
                  setInvoiceSearchQuery('');
                  setInvoiceStatusFilter('all');
                }}
              >
                Clear Filters
              </button>
            </div>
          </div>

          {purchaseInvoicesError && (
            <div className="error-message" role="alert">
              {purchaseInvoicesError}
            </div>
          )}

          <div className="data-table-shell">
            <div className="data-table-container">
              <table className="data-table invoices-table">
                <thead>
                  <tr>
                    <th>INVOICE ID</th>
                    <th>CUSTOMER</th>
                    <th>DATE</th>
                    <th>TOTAL</th>
                    <th>STATUS</th>
                    <th>CARDS</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseInvoicesLoading ? (
                    <tr>
                      <td colSpan={7} className="loading-cell">Loading invoices...</td>
                    </tr>
                  ) : (() => {
                    const list = Array.isArray(paginatedInvoices) ? paginatedInvoices : [];

                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="empty-cell">No invoices found</td>
                        </tr>
                      );
                    }

                    return list.map((inv) => {
                      const id = inv?.ID || inv?.id || inv?._id;
                      const customerName =
                        inv?.CustomerID?.PersonID?.FullName ||
                        inv?.CustomerID?.PersonID?.ID ||
                        inv?.CustomerID?.ID ||
                        inv?.CustomerID ||
                        '-';
                      const status = String(inv?.Status || '').toUpperCase() || '-';
                      const total = Number(inv?.TotalAmount ?? inv?.Total ?? inv?.totalAmount);
                      const totalText = Number.isFinite(total) ? `$${total.toFixed(2)}` : '-';
                      const derivedCardsCount = deriveCardsCountFromInvoice(inv);
                      const cardsText = Number.isFinite(derivedCardsCount) ? String(derivedCardsCount) : '-';

                      const statusText = status === '-' ? '-' : (status.charAt(0) + status.slice(1).toLowerCase());
                      const isCompleted = status === 'COMPLETED';

                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>{customerName}</td>
                          <td>{formatDate(inv?.InvoiceDate)}</td>
                          <td>{totalText}</td>
                          <td>
                            {isCompleted ? (
                              <span className="invoice-statusBadge invoice-statusBadge--completed">Completed</span>
                            ) : (
                              <span className={getStatusBadgeClass(statusText)}>{statusText}</span>
                            )}
                          </td>
                          <td>{cardsText}</td>
                          <td className="text-right">
                            <div className="invoice-actions">
                              <button
                                className="invoice-actionBtn"
                                title="View"
                                type="button"
                                onClick={() => handleViewInvoice(id)}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M2.2 8C3.5 5.2 5.7 3.8 8 3.8C10.3 3.8 12.5 5.2 13.8 8C12.5 10.8 10.3 12.2 8 12.2C5.7 12.2 3.5 10.8 2.2 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className="table-footer invoices-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedInvoices.length}</span> of {filteredInvoices.length} results (Page {invoicesPage} of {getTotalPages(filteredInvoices.length)})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setInvoicesPage(p => Math.max(1, p - 1))}
                  disabled={invoicesPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setInvoicesPage(p => Math.min(getTotalPages(filteredInvoices.length), p + 1))}
                  disabled={invoicesPage >= getTotalPages(filteredInvoices.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Detail Modal (lightweight) */}
          {invoiceDetailOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="invoice-detailModal">
                <div className="invoice-detailModal__header">
                  <h3 className="invoice-detailModal__title">Invoice Details</h3>
                  <button
                    className="invoice-detailModal__close"
                    onClick={handleCloseInvoiceDetail}
                    aria-label="Close"
                    type="button"
                  >
                    ×
                  </button>
                </div>

                {invoiceDetailLoading ? (
                  <div className="invoice-detailModal__body">Loading...</div>
                ) : invoiceDetailError ? (
                  <div className="invoice-detailModal__body">
                    <div className="error-message" role="alert">{invoiceDetailError}</div>
                  </div>
                ) : (
                  (() => {
                    const invId = invoiceDetail?.ID || invoiceDetail?.id || invoiceDetail?._id;
                    const customerName =
                      invoiceDetail?.CustomerID?.PersonID?.FullName ||
                      invoiceDetail?.CustomerID?.PersonID?.ID ||
                      invoiceDetail?.CustomerID?.ID ||
                      invoiceDetail?.CustomerID ||
                      '-';
                    const customerId =
                      invoiceDetail?.CustomerID?.ID ||
                      invoiceDetail?.CustomerID?.PersonID?.ID ||
                      (typeof invoiceDetail?.CustomerID === 'string' ? invoiceDetail.CustomerID : null) ||
                      '-';

                    const { text: statusText, isCompleted } = getInvoiceDisplayStatus(invoiceDetail?.Status);
                    const cardsCount = calcInvoiceCardsCount(invoiceDetail);
                    const totalAmount =
                      invoiceDetail?.TotalAmount ??
                      invoiceDetail?.Total ??
                      invoiceDetail?.totalAmount;

                    const details = Array.isArray(invoiceDetail?.details) ? invoiceDetail.details : [];
                    const rows = details.map((d, idx) => {
                      const qty = Number(d?.Quantity) || 0;
                      const unit = Number(d?.UnitPrice);
                      const unitPrice = Number.isFinite(unit) ? unit : null;
                      const subtotal = unitPrice !== null ? unitPrice * qty : null;
                      const catName = d?.CardCategoryID?.Name || d?.CardCategoryID?.ID || d?.CardCategoryID || '-';
                      return {
                        key: idx,
                        category: catName,
                        quantity: qty || null,
                        unitPrice,
                        subtotal
                      };
                    });

                    const computedTotal = rows.reduce((sum, r) => sum + (Number.isFinite(r?.subtotal) ? r.subtotal : 0), 0);

                    return (
                      <div className="invoice-detailModal__body">
                        <div className="invoice-detailModal__summary">
                          <div className="invoice-detailSummary__left">
                            <div className="invoice-detailSummary__id">{invId || '-'}</div>
                            <div className="invoice-detailSummary__customer">{customerName}</div>
                            <div className="invoice-detailSummary__date">
                              Purchase Date: {formatDate(invoiceDetail?.InvoiceDate)}
                            </div>
                          </div>
                          <div className={isCompleted ? 'invoice-detailStatus invoice-detailStatus--completed' : 'invoice-detailStatus'}>
                            {statusText}
                          </div>
                        </div>

                        <div className="invoice-detailStats">
                          <div className="invoice-detailStatCard">
                            <div className="invoice-detailStatCard__label">TOTAL AMOUNT</div>
                            <div className="invoice-detailStatCard__value">{formatMoney(totalAmount)}</div>
                          </div>
                          <div className="invoice-detailStatCard">
                            <div className="invoice-detailStatCard__label">CARDS COUNT</div>
                            <div className="invoice-detailStatCard__value">{Number.isFinite(cardsCount) ? cardsCount : '-'}</div>
                          </div>
                          <div className="invoice-detailStatCard">
                            <div className="invoice-detailStatCard__label">CUSTOMER ID</div>
                            <div className="invoice-detailStatCard__value invoice-detailStatCard__value--mono">{customerId}</div>
                          </div>
                        </div>

                        <div className="invoice-detailSectionTitle">Purchase Details</div>

                        <div className="invoice-detailTableShell">
                          <table className="invoice-detailTable">
                            <thead>
                              <tr>
                                <th>Category</th>
                                <th className="text-right">Quantity</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.length > 0 ? (
                                rows.map((r) => (
                                  <tr key={r.key}>
                                    <td>{r.category}</td>
                                    <td className="text-right">{Number.isFinite(r.quantity) ? r.quantity : '-'}</td>
                                    <td className="text-right">{Number.isFinite(r.unitPrice) ? formatMoney(r.unitPrice) : '-'}</td>
                                    <td className="text-right">{Number.isFinite(r.subtotal) ? formatMoney(r.subtotal) : '-'}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="invoice-detailEmpty">No purchase details found.</td>
                                </tr>
                              )}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={3} className="invoice-detailFooterLabel">Total</td>
                                <td className="text-right invoice-detailFooterValue">
                                  {formatMoney(Number.isFinite(computedTotal) ? computedTotal : totalAmount)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'returns' && (
        <div className="returns-content">
          {/* Search and Filters */}
          <div className="filters-section">
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">
                <CardsActionSearchIcon />
              </span>
              <input
                type="text"
                placeholder="Search returned cards..."
                value={returnsSearchQuery}
                onChange={(e) => setReturnsSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button
              className="clear-filters-btn"
              onClick={() => setReturnsSearchQuery('')}
            >
              Clear
            </button>
          </div>

          {/* Loading / Error States */}
          {returnedCardsLoading && (
            <div className="loading-message">Loading returned cards...</div>
          )}
          {returnedCardsError && (
            <div className="error-message" role="alert">{returnedCardsError}</div>
          )}

          {/* Data Table */}
          {!returnedCardsLoading && !returnedCardsError && (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-id">CARD ID</th>
                    <th className="col-card">CARD INFO</th>
                    <th className="col-category">CATEGORY</th>
                    <th className="col-status">STATUS</th>
                    <th className="col-actions text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = returnedCards.filter(card => {
                      if (!returnsSearchQuery) return true;
                      const q = returnsSearchQuery.toLowerCase();
                      return (
                        String(card.id || '').toLowerCase().includes(q) ||
                        String(card.uid || '').toLowerCase().includes(q) ||
                        String(card.type || '').toLowerCase().includes(q)
                      );
                    });
                    const paginated = filtered.slice((returnsPage - 1) * itemsPerPage, returnsPage * itemsPerPage);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="empty-message">No returned cards found.</td>
                        </tr>
                      );
                    }

                    return paginated.map((card) => (
                      <tr key={card.id}>
                        <td className="table-cell col-id">{card.id}</td>
                        <td className="table-cell col-card">
                          <div className="inventory-cardCell">
                            <div
                              className="inventory-cardIcon"
                              style={{ backgroundImage: card.gradient }}
                            >
                              <div className="cards-cardGlyph" aria-hidden="true">
                                <CardsGlyphListIcon />
                              </div>
                            </div>
                            <div className="inventory-cardText">
                              <p className="inventory-cardUid" title={card.uid || ''}>{card.uid || '-'}</p>
                              <p className="inventory-cardType">{card.type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell col-category">{card.type}</td>
                        <td className="table-cell col-status">
                          <span className={getStatusBadgeClass(card.status)}>{card.status}</span>
                        </td>
                        <td className="table-cell col-actions">
                          <div className="inventory-actions">
                            <button
                              className="inventory-actionBtn"
                              onClick={() => handleViewCard(card.id)}
                              title="View"
                            >
                              <CardsActionViewIcon aria-hidden="true" />
                            </button>
                            {canEdit && (
                              <button
                                className="reuse-btn"
                                onClick={() => handleReuseCard(card.id)}
                                disabled={reusingCardId === card.id}
                                title="Reuse - Mark as Unassigned"
                              >
                                {reusingCardId === card.id ? 'Processing...' : 'Reuse'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="table-footer">
                {(() => {
                  const filtered = returnedCards.filter(card => {
                    if (!returnsSearchQuery) return true;
                    const q = returnsSearchQuery.toLowerCase();
                    return (
                      String(card.id || '').toLowerCase().includes(q) ||
                      String(card.uid || '').toLowerCase().includes(q) ||
                      String(card.type || '').toLowerCase().includes(q)
                    );
                  });
                  const totalPages = Math.ceil(filtered.length / itemsPerPage);
                  const paginated = filtered.slice((returnsPage - 1) * itemsPerPage, returnsPage * itemsPerPage);

                  return (
                    <>
                      <p className="results-text">
                        Showing <span className="results-count">{paginated.length}</span> of {filtered.length} returned cards (Page {returnsPage} of {totalPages || 1})
                      </p>
                      <div className="pagination-buttons">
                        <button
                          className="pagination-btn"
                          onClick={() => setReturnsPage(p => Math.max(1, p - 1))}
                          disabled={returnsPage === 1}
                        >
                          Previous
                        </button>
                        <button
                          className="pagination-btn"
                          onClick={() => setReturnsPage(p => Math.min(totalPages, p + 1))}
                          disabled={returnsPage >= totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other Tab Contents (Placeholders) */}
      {activeTab !== 'inventory' && activeTab !== 'assign' && activeTab !== 'categories' && activeTab !== 'invoices' && activeTab !== 'returns' && (
        <div className="tab-placeholder">
          <p>Content for {tabs.find(t => t.id === activeTab)?.label} tab coming soon...</p>
        </div>
      )}

      {/* Assign Card Modal */}
      {canEdit && showAssignModal && selectedCard && (
        <AssignCardModal
          card={selectedCard}
          onClose={handleCloseAssignModal}
          onAssign={handleAssignCard}
        />
      )}

      {/* Add Category Modal */}
      {canEdit && (
        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={handleCloseAddCategoryModal}
          onSave={handleCreateCategory}
        />
      )}

      {/* Edit Category Modal */}
      {canEdit && showEditCategoryModal && categoryToEdit && (
        <EditCategoryModal
          isOpen={showEditCategoryModal}
          key={categoryToEdit.id}
          category={categoryToEdit}
          onClose={handleCloseEditCategoryModal}
          onSave={handleUpdateCategory}
        />
      )}

      {/* View Card Modal */}
      {showViewCardModal && cardToView && (
        <ViewCardModal
          card={cardToView}
          onClose={handleCloseViewCardModal}
        />
      )}

      {/* Edit Card Modal */}
      {canEdit && showEditCardModal && cardToEdit && (
        <EditCardModal
          isOpen={showEditCardModal}
          card={cardToEdit}
          onClose={handleCloseEditCardModal}
          onSave={handleSaveCardStatus}
        />
      )}

      {/* View Category Cards Modal */}
      {showViewCategoryCardsModal && categoryToViewCards && (
        <ViewCategoryCardsModal
          isOpen={showViewCategoryCardsModal}
          category={categoryToViewCards}
          authHeaders={authHeaders}
          onClose={() => {
            setShowViewCategoryCardsModal(false);
            setCategoryToViewCards(null);
          }}
        />
      )}

      {/* Delete Category Modal */}
      {canEdit && showDeleteCategoryModal && categoryToDelete && (
        <DeleteCategoryModal
          category={categoryToDelete}
          onClose={() => {
            setShowDeleteCategoryModal(false);
            setCategoryToDelete(null);
          }}
          onConfirm={handleConfirmDeleteCategory}
        />
      )}
    </div>
  );
}

export default CardsPage;