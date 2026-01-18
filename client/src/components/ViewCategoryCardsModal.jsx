import { useEffect, useState } from 'react';
import '../styles/components/ViewCategoryCardsModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function ViewCategoryCardsModal({ isOpen, category, authHeaders, onClose }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    if (!isOpen || !category?.id) return;

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(
          `${API_BASE_URL}/api/card-categories/${encodeURIComponent(category.id)}/cards?page=${page}&limit=10`,
          {
            signal: controller.signal,
            headers: { ...authHeaders }
          }
        );

        const json = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to fetch cards (${res.status})`);
        }

        setCards(json?.data?.cards || []);
        setPagination(json?.data?.pagination || null);
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('Fetch category cards error:', err);
          setError(err?.message || 'Failed to load cards');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isOpen, category?.id, page, authHeaders]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target.className === 'vccm-overlay') {
      onClose();
    }
  };

  const getStatusClass = (status) => {
    const s = String(status || '').toUpperCase();
    if (s === 'ACTIVE') return 'vccm-status vccm-status--active';
    if (s === 'INACTIVE' || s === 'RETURNED') return 'vccm-status vccm-status--inactive';
    if (s === 'UNASSIGNED') return 'vccm-status vccm-status--unassigned';
    return 'vccm-status';
  };

  const formatStatus = (status) => {
    const s = String(status || '').toUpperCase();
    if (!s) return '-';
    return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');
  };

  return (
    <div className="vccm-overlay" onClick={handleOverlayClick}>
      <div className="vccm-modal" role="dialog" aria-modal="true">
        <div className="vccm-header">
          <h3>Cards in "{category?.name || category?.Name || 'Category'}"</h3>
          <button className="vccm-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="vccm-body">
          {loading && <div className="vccm-loading">Loading cards...</div>}
          {error && <div className="vccm-error">{error}</div>}

          {!loading && !error && cards.length === 0 && (
            <div className="vccm-empty">No cards found in this category.</div>
          )}

          {!loading && !error && cards.length > 0 && (
            <>
              <div className="vccm-count">
                Showing {cards.length} of {pagination?.total || cards.length} cards
              </div>

              <div className="vccm-tableWrap">
                <table className="vccm-table">
                  <thead>
                    <tr>
                      <th>Card ID</th>
                      <th>UID</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.CardID || card._id}>
                        <td className="vccm-mono">{card.CardID || '-'}</td>
                        <td className="vccm-mono">{card.UID || '-'}</td>
                        <td>
                          <span className={getStatusClass(card.Status)}>
                            {formatStatus(card.Status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination && pagination.pages > 1 && (
                <div className="vccm-pagination">
                  <button
                    className="vccm-pageBtn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    Previous
                  </button>
                  <span className="vccm-pageInfo">
                    Page {page} of {pagination.pages}
                  </span>
                  <button
                    className="vccm-pageBtn"
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="vccm-footer">
          <button className="vccm-btn vccm-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewCategoryCardsModal;
