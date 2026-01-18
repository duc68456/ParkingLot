import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EntrySessionsTable from '../components/EntrySessionsTable';
import ViewEntrySessionModal from '../components/ViewEntrySessionModal';
import '../styles/pages/EntrySessionsPage.css';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 14L11.1 11.1" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const formatDateTime = (value) => {
  if (!value) return '';
  try {
    const dt = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const humanStatus = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'IN_PARKING') return 'Active';
  if (s === 'EXITED') return 'Completed';
  if (s === 'LOST_TICKET') return 'Lost Ticket';
  if (s === 'CANCELLED') return 'Cancelled';
  return status || '';
};

const getPersonNameFromEmployee = (employee) => {
  const fullName = employee?.PersonID?.FullName;
  if (fullName) return fullName;
  const id = employee?.ID;
  return id || '';
};

const mapEntrySession = (session) => {
  const plate = String(session?.LicensePlate || session?.VehicleID?.PlateNumber || '').toUpperCase();
  const cardId = session?.CardID?.CardID || session?.CardID || '';
  const cardCategoryName = session?.CardID?.CardCategoryID?.Name || '';
  const vehicleTypeName = session?.VehicleTypeID?.Name || session?.VehicleTypeID?.VehicleTypeID || '';

  return {
    // Keep the shape expected by EntrySessionsTable/ViewEntrySessionModal
    id: session?.ID || session?.id || '',
    cardId,
    plate,
    entryTime: formatDateTime(session?.EntryTime),
    exitTime: session?.ExitTime ? formatDateTime(session?.ExitTime) : null,
    status: humanStatus(session?.Status),
    finalFee: typeof session?.FinalFee === 'number' ? session.FinalFee : Number(session?.FinalFee || 0),
    staff: getPersonNameFromEmployee(session?.ProcessedEntryBy) || '-',
    inSubscription: session?.DiscountReason === 'SUBSCRIPTION',
    processedByEntry: getPersonNameFromEmployee(session?.ProcessedEntryBy),
    processedByExit: getPersonNameFromEmployee(session?.ProcessedExitBy),
    // Modal extras
    cardType: cardCategoryName || '—',
    vehicleType: vehicleTypeName || '—',
    // Raw (handy for future actions)
    raw: session
  };
};

export default function EntrySessionsPage() {
  const { token, authHeaders: ctxAuthHeaders } = useAuth();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  const authHeaders = useMemo(
    () => (ctxAuthHeaders || (token ? { Authorization: `Bearer ${token}` } : {})),
    [ctxAuthHeaders, token]
  )

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch Sessions (Server-Side Pagination)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError(null);

      try {
        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: itemsPerPage,
        });

        if (searchQuery) queryParams.append('search', searchQuery);
        if (statusFilter !== 'all') queryParams.append('status', statusFilter);
        // Add specific type filter if backend supports it - currently backend GET / doesn't explicitly filter 'Type' 
        // derived from VehicleType? It accepts 'vehicleId' or 'cardId', not 'vehicleTypeId'. 
        // We'll skip passing 'typeFilter' to backend for now unless we add support, 
        // or we could retain client-side filtering ONLY for Type if strictly needed, 
        // but mixing server/client pagination is buggy. 
        // Best approach: Ignore Type filter on server for now or add it to backend.
        // Given constraint, we'll assume Status/Search are the primary server filters.

        if (fromDate) queryParams.append('fromDate', fromDate);
        if (toDate) queryParams.append('toDate', toDate);

        const res = await fetch(`${API_BASE_URL}/api/entry-sessions?${queryParams.toString()}`, {
          headers: {
            ...authHeaders
          }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to load sessions (${res.status})`);
        }

        const items = json?.data?.items || [];
        const pagination = json?.data?.pagination || {};
        const mapped = items.map(mapEntrySession);

        if (!cancelled) {
          setSessions(mapped);
          setTotalItems(pagination.total || 0);
          setTotalPages(pagination.pages || 1);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load sessions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Debounce search slightly to avoid flickering
    const timeoutId = setTimeout(() => {
      run();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [API_BASE_URL, authHeaders, token, currentPage, itemsPerPage, searchQuery, statusFilter, fromDate, toDate]);

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, fromDate, toDate]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setFromDate('');
    setToDate('');
  };

  // Derived unique types (Not accurate with server pagination, but can keep for UI consistency if needed, 
  // or remove. For now, we'll keep static or empty to avoid errors)
  const uniqueTypes = useMemo(() => {
    // We can't derive all types from just the current page. 
    // Hardcode common types or fetch from API if critical.
    return ['Car', 'Motorcycle', 'Truck', 'Van', 'Bus'];
  }, []);

  return (
    <div className="entry-sessions-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Manage Entry Session</h2>
        <p className="page-subtitle">View and manage all parking entry sessions</p>
      </div>

      <div className="entry-sessions-controls">
        {/* Search Section */}
        <div className="search-container">
          <div className="search-wrapper">
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search by Plate, Card ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-row">
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="IN_PARKING">In Parking</option>
              <option value="EXITED">Completed</option> {/* Changed to EXITED to match backend status */}
            </select>
          </div>

          {/* Note: Type filter is visual only unless backend supports it. removing for clarity or keeping disabled/generic */}
          {/* <div className="filter-group">
               <label className="filter-label">Type:</label>
               <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                 <option value="all">All Types</option>
                 {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
            </div> */}

          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Entry Sessions Table */}
      {loadError && (
        <div className="entry-sessions-load-error" role="alert">
          {loadError}
        </div>
      )}

      {loading && (
        <div className="entry-sessions-loading">Loading…</div>
      )}

      <EntrySessionsTable
        sessions={sessions}
        loading={loading}
        error={loadError}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        onViewSession={handleViewSession}
      />

      {/* View Session Modal */}
      {isModalOpen && (
        <ViewEntrySessionModal
          session={selectedSession}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
