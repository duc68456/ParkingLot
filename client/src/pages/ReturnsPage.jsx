import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthz } from '../contexts/AuthzContext';
import { canEditModule } from '../utils/permissions';
import '../styles/pages/ReturnsPage.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const formatDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return `$${num.toFixed(2)}`;
};

export default function ReturnsPage() {
  const { authHeaders, user } = useAuth();
  const { hasPermission } = useAuthz();
  const canEdit = canEditModule(hasPermission, 'CARDS');

  const [activeTab, setActiveTab] = useState('assignedCards');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Assigned cards state
  const [assignedCards, setAssignedCards] = useState([]);
  const [assignedCardsLoading, setAssignedCardsLoading] = useState(false);
  const [assignedCardsError, setAssignedCardsError] = useState('');

  // Return logs state
  const [returnLogs, setReturnLogs] = useState([]);
  const [returnLogsLoading, setReturnLogsLoading] = useState(false);
  const [returnLogsError, setReturnLogsError] = useState('');

  // Categories for filter
  const [categories, setCategories] = useState([]);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [refundPrice, setRefundPrice] = useState('0');
  const [returnLoading, setReturnLoading] = useState(false);

  // Pagination
  const [assignedPage, setAssignedPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const itemsPerPage = 10;

  // Load categories
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/card-categories?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (res.ok) {
          const list = Array.isArray(json?.data?.cardCategories) ? json.data.cardCategories : [];
          setCategories(list);
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch categories error:', err);
        }
      }
    })();

    return () => controller.abort();
  }, [authHeaders]);

  // Load assigned cards
  useEffect(() => {
    if (activeTab !== 'assignedCards') return;
    const controller = new AbortController();

    (async () => {
      try {
        setAssignedCardsLoading(true);
        setAssignedCardsError('');

        const params = new URLSearchParams({ limit: '100' });
        if (categoryFilter !== 'all') {
          params.append('categoryId', categoryFilter);
        }

        const res = await fetch(`${API_BASE_URL}/api/card-return-logs/assigned-cards?${params}`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to fetch (${res.status})`);
        }

        const list = Array.isArray(json?.data?.items) ? json.data.items : [];
        setAssignedCards(list);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch assigned cards error:', err);
          setAssignedCards([]);
          setAssignedCardsError(err?.message || 'Failed to load assigned cards');
        }
      } finally {
        if (!controller.signal.aborted) setAssignedCardsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, categoryFilter, authHeaders]);

  // Load return logs
  useEffect(() => {
    if (activeTab !== 'returnLogs') return;
    const controller = new AbortController();

    (async () => {
      try {
        setReturnLogsLoading(true);
        setReturnLogsError('');

        const res = await fetch(`${API_BASE_URL}/api/card-return-logs?limit=100`, {
          signal: controller.signal,
          headers: { ...authHeaders }
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to fetch (${res.status})`);
        }

        const list = Array.isArray(json?.data?.items) ? json.data.items : [];
        setReturnLogs(list);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch return logs error:', err);
          setReturnLogs([]);
          setReturnLogsError(err?.message || 'Failed to load return logs');
        }
      } finally {
        if (!controller.signal.aborted) setReturnLogsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeTab, authHeaders]);

  const tabs = [
    { id: 'assignedCards', label: 'Assigned Cards', count: assignedCards.length },
    { id: 'returnLogs', label: 'Return Logs', count: returnLogs.length }
  ];

  // Filter assigned cards
  const filteredAssignedCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = [...assignedCards];

    if (query) {
      filtered = filtered.filter((card) => {
        const cardId = String(card?.CardID || '').toLowerCase();
        const ownerName = String(card?.OwnerInfo?.FullName || '').toLowerCase();
        const categoryName = String(card?.CategoryInfo?.Name || '').toLowerCase();
        return cardId.includes(query) || ownerName.includes(query) || categoryName.includes(query);
      });
    }

    return filtered;
  }, [assignedCards, searchQuery]);

  // Filter return logs
  const filteredReturnLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = [...returnLogs];

    if (query) {
      filtered = filtered.filter((log) => {
        const logId = String(log?.ID || '').toLowerCase();
        const cardId = String(log?.CardID || '').toLowerCase();
        const ownerName = String(log?.OwnerInfo?.FullName || '').toLowerCase();
        return logId.includes(query) || cardId.includes(query) || ownerName.includes(query);
      });
    }

    return filtered;
  }, [returnLogs, searchQuery]);

  // Pagination helpers
  const paginateData = (data, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength) => Math.ceil(dataLength / itemsPerPage);

  const paginatedAssignedCards = useMemo(() =>
    paginateData(filteredAssignedCards, assignedPage),
    [filteredAssignedCards, assignedPage]
  );

  const paginatedReturnLogs = useMemo(() =>
    paginateData(filteredReturnLogs, logsPage),
    [filteredReturnLogs, logsPage]
  );

  // Reset page when filters change
  useEffect(() => {
    setAssignedPage(1);
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    setLogsPage(1);
  }, [searchQuery]);

  const handleReturnClick = (card) => {
    if (!canEdit) return;
    setSelectedCard(card);
    setReturnReason('');
    // Auto-populate refund price from card's current category price
    const currentPrice = card?.CurrentPrice ?? 0;
    setRefundPrice(String(currentPrice));
    setShowReturnModal(true);
  };

  const handleCloseReturnModal = () => {
    setShowReturnModal(false);
    setSelectedCard(null);
    setReturnReason('');
    setRefundPrice('0');
  };

  const handleConfirmReturn = async () => {
    if (!selectedCard || !canEdit) return;

    try {
      setReturnLoading(true);

      // Get performer ID from current user
      const performedBy = user?.employeeId || user?.personId || user?.id;
      if (!performedBy) {
        throw new Error('Cannot identify performer');
      }

      const res = await fetch(`${API_BASE_URL}/api/card-return-logs/return-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          cardId: selectedCard.CardID,
          reason: returnReason || null,
          refundPrice: Number(refundPrice) || 0,
          performedBy
        })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Failed to process return');
      }

      // Remove card from assigned list
      setAssignedCards((prev) => prev.filter((c) => c.CardID !== selectedCard.CardID));
      handleCloseReturnModal();
      window.alert('Card returned successfully!');
    } catch (err) {
      console.error('Return card error:', err);
      window.alert(err?.message || 'Failed to return card');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
  };

  return (
    <div className="returns-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Returns</h1>
        <p className="page-subtitle">Manage card returns and view return history</p>
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
              {tab.count > 0 && <span className="tab-count">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Cards Tab */}
      {activeTab === 'assignedCards' && (
        <div className="returns-content">
          {/* Controls */}
          <div className="returns-controls">
            <div className="returns-controls-top">
              <div className="search-input-wrapper">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label className="filter-label">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.ID || cat.id} value={cat.ID || cat.id}>
                      {cat.Name || cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <button className="clear-filters-btn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          </div>

          {/* Error Message */}
          {assignedCardsError && (
            <div className="error-message" role="alert">{assignedCardsError}</div>
          )}

          {/* Assigned Cards Table */}
          <div className="data-table-wrapper">
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CARD ID</th>
                    <th>CATEGORY</th>
                    <th>OWNER</th>
                    <th>PHONE</th>
                    <th>ASSIGNED DATE</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedCardsLoading ? (
                    <tr>
                      <td colSpan={6} className="loading-cell">Loading...</td>
                    </tr>
                  ) : paginatedAssignedCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">No assigned cards found</td>
                    </tr>
                  ) : (
                    paginatedAssignedCards.map((card) => (
                      <tr key={card.CardID || card._id}>
                        <td className="card-id-cell">{card.CardID}</td>
                        <td>{card.CategoryInfo?.Name || '-'}</td>
                        <td>{card.OwnerInfo?.FullName || '-'}</td>
                        <td>{card.OwnerInfo?.Phone || '-'}</td>
                        <td>{formatDate(card.ActiveDay)}</td>
                        <td className="text-right">
                          <div className="action-buttons">
                            {canEdit && (
                              <button
                                className="btn-return"
                                onClick={() => handleReturnClick(card)}
                              >
                                Return
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedAssignedCards.length}</span> of {filteredAssignedCards.length} results
                (Page {assignedPage} of {getTotalPages(filteredAssignedCards.length) || 1})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setAssignedPage((p) => Math.max(1, p - 1))}
                  disabled={assignedPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setAssignedPage((p) => Math.min(getTotalPages(filteredAssignedCards.length), p + 1))}
                  disabled={assignedPage >= getTotalPages(filteredAssignedCards.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Logs Tab */}
      {activeTab === 'returnLogs' && (
        <div className="returns-content">
          {/* Controls */}
          <div className="returns-controls">
            <div className="returns-controls-top">
              <div className="search-input-wrapper">
                <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M17.5 17.5L13.875 13.875M15.8333 9.16667C15.8333 12.8486 12.8486 15.8333 9.16667 15.8333C5.48477 15.8333 2.5 12.8486 2.5 9.16667C2.5 5.48477 5.48477 2.5 9.16667 2.5C12.8486 2.5 15.8333 5.48477 15.8333 9.16667Z" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {returnLogsError && (
            <div className="error-message" role="alert">{returnLogsError}</div>
          )}

          {/* Return Logs Table */}
          <div className="data-table-wrapper">
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>LOG ID</th>
                    <th>CARD ID</th>
                    <th>CATEGORY</th>
                    <th>OWNER</th>
                    <th>REFUND</th>
                    <th>PERFORMED BY</th>
                    <th>DATE</th>
                    <th>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {returnLogsLoading ? (
                    <tr>
                      <td colSpan={8} className="loading-cell">Loading...</td>
                    </tr>
                  ) : paginatedReturnLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-cell">No return logs found</td>
                    </tr>
                  ) : (
                    paginatedReturnLogs.map((log) => (
                      <tr key={log.ID || log._id}>
                        <td className="log-id-cell">{log.ID}</td>
                        <td>{log.CardID}</td>
                        <td>{log.CardInfo?.CategoryName || '-'}</td>
                        <td>{log.OwnerInfo?.FullName || '-'}</td>
                        <td>{formatMoney(log.RefundPrice)}</td>
                        <td>{log.PerformerInfo?.FullName || log.PerformedBy || '-'}</td>
                        <td>{formatDate(log.createdAt)}</td>
                        <td className="reason-cell">{log.Reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="table-footer">
              <p className="results-text">
                Showing <span className="results-count">{paginatedReturnLogs.length}</span> of {filteredReturnLogs.length} results
                (Page {logsPage} of {getTotalPages(filteredReturnLogs.length) || 1})
              </p>
              <div className="pagination-buttons">
                <button
                  className="pagination-btn"
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  disabled={logsPage === 1}
                >
                  Previous
                </button>
                <button
                  className="pagination-btn"
                  onClick={() => setLogsPage((p) => Math.min(getTotalPages(filteredReturnLogs.length), p + 1))}
                  disabled={logsPage >= getTotalPages(filteredReturnLogs.length)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedCard && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="return-modal">
            <div className="modal-header">
              <h3 className="modal-title">Return Card</h3>
              <button
                className="modal-close"
                onClick={handleCloseReturnModal}
                aria-label="Close"
                type="button"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="return-card-info">
                <div className="info-row">
                  <span className="info-label">Card ID:</span>
                  <span className="info-value">{selectedCard.CardID}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{selectedCard.CategoryInfo?.Name || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Owner:</span>
                  <span className="info-value">{selectedCard.OwnerInfo?.FullName || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Card Price:</span>
                  <span className="info-value info-value--price">${Number(selectedCard.CurrentPrice || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Refund Price
                  <span className="form-hint">(Auto-filled from card category price)</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  value={refundPrice}
                  onChange={(e) => setRefundPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reason (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Enter reason for return..."
                  rows={3}
                  maxLength={500}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={handleCloseReturnModal}
                disabled={returnLoading}
              >
                Cancel
              </button>
              <button
                className="btn-confirm"
                onClick={handleConfirmReturn}
                disabled={returnLoading}
              >
                {returnLoading ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
