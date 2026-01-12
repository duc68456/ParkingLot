import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EntrySessionsTable from '../components/EntrySessionsTable';
import ViewEntrySessionModal from '../components/ViewEntrySessionModal';
import '../styles/pages/EntrySessionsPage.css';

import searchIcon from '../assets/icons/common/actions/search.svg';

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
    processedByEntry: getPersonNameFromEmployee(session?.ProcessedEntryBy) || '-',
    processedByExit: getPersonNameFromEmployee(session?.ProcessedExitBy) || null,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) return;

      setLoading(true);
      setLoadError('');

      try {
        const res = await fetch(`${API_BASE_URL}/api/entry-sessions?limit=200`, {
          headers: {
            ...authHeaders
          }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to load sessions (${res.status})`);
        }

        const items = json?.data?.items || [];
        const mapped = items.map(mapEntrySession);

        if (!cancelled) setSessions(mapped);
      } catch (e) {
        if (!cancelled) setLoadError(e?.message || 'Failed to load sessions');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [API_BASE_URL, authHeaders, token]);

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const filteredSessions = sessions.filter(session =>
    session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.cardId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.staff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="entry-sessions-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Manage Entry Session</h2>
        <p className="page-subtitle">View and manage all parking entry sessions</p>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-wrapper">
          <img src={searchIcon} alt="" className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        sessions={filteredSessions}
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
