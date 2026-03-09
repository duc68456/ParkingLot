import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/pages/ShiftsPage.css';

import shiftIcon from '../assets/icons/shifts.svg';
import searchIcon from '../assets/icons/common/actions/search.svg';
import filterIcon from '../assets/icons/reports/tabs/time-period.svg';
import moreIcon from '../assets/icons/common/actions/view.svg';

import ViewShiftModal from '../components/ViewShiftModal';

// Figma-like stat card icons (local copies via existing icon system)
import staffIcon from '../assets/icons/dashboard/users.svg';
import revenueIcon from '../assets/icons/reports/general/cash.svg';
import { getApiBaseUrl } from '../utils/apiBase'

const fmtMoney = (value) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
  }
  if (typeof value === 'string') return value;
  return '$0.00';
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const normalizeShiftRow = (shift, employeeNameById) => {
  const id = shift?.ID || shift?.id || '-';
  const employeeId = shift?.EmployeeID;
  const employee = employeeNameById.get(String(employeeId || '').toUpperCase()) || employeeId || '-';

  const date = shift?.ShiftDate ? new Date(shift.ShiftDate) : null;
  const start = shift?.CheckInTime ? new Date(shift.CheckInTime) : null;
  const end = shift?.CheckOutTime ? new Date(shift.CheckOutTime) : null;

  const dateLabel = date
    ? date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '-';

  const startLabel = start
    ? start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '-';

  const endLabel = end
    ? end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '-';

  const statusRaw = String(shift?.Status || 'IN_PROGRESS').toUpperCase();
  const statusLabel = statusRaw === 'COMPLETED' ? 'Completed' : 'Active';

  return {
    id,
    employee,
    dateLabel,
    startLabel,
    endLabel,
    status: statusRaw,
    statusLabel,
    entries: shift?.TotalVehicles ?? shift?.Entries ?? shift?.TotalEntries ?? 0,
    revenue: shift?.TotalRevenue ?? shift?.Revenue ?? 0,
    raw: shift,
  };
};

export default function ShiftsPage() {
  const { authHeaders } = useAuth();
  const API_BASE_URL = getApiBaseUrl()

  // In this codebase `authHeaders` from AuthContext is a memoized object, not a function.
  const headers = useMemo(() => ({ ...(authHeaders || {}) }), [authHeaders]);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');
  const [gateFilter, setGateFilter] = useState('All Gates');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [staffOnDuty, setStaffOnDuty] = useState(0);
  const [totalShifts, setTotalShifts] = useState(0);
  const [totalRevenueToday, setTotalRevenueToday] = useState(0);

  const [viewShiftOpen, setViewShiftOpen] = useState(false);
  const [viewShiftId, setViewShiftId] = useState('');
  const [viewShiftRow, setViewShiftRow] = useState(null);

  const openShiftDetail = (row) => {
    setViewShiftRow(row?.raw || row);
    setViewShiftId(row?.id || row?.raw?.ID || row?.raw?.id || '');
    setViewShiftOpen(true);
  };

  const closeShiftDetail = () => {
    setViewShiftOpen(false);
    setViewShiftId('');
    setViewShiftRow(null);
  };

  const handleEndShift = async (shiftId) => {
    try {
      setError('');
      const res = await fetch(`${API_BASE_URL}/api/shifts/${encodeURIComponent(shiftId)}/end`, {
        method: 'POST',
        headers,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || `Failed to end shift (${res.status})`);

      // Optimistically update the row
      setRows((prev) =>
        prev.map((r) =>
          r.id === shiftId
            ? {
              ...r,
              status: 'COMPLETED',
              statusLabel: 'Completed',
              endLabel: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
            }
            : r
        )
      );
    } catch (e) {
      setError(e?.message || 'Failed to end shift');
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError('');
      try {
        // Step 1: load employees to render names instead of EMP####
        // This is optional - if it fails (e.g., no permission), we'll just show EMP IDs
        let employeeNameById = new Map();
        try {
          const empRes = await fetch(`${API_BASE_URL}/api/employees?limit=500`, {
            headers,
            signal: controller.signal,
          });
          const empJson = await empRes.json().catch(() => null);
          if (empRes.ok) {
            const employees = Array.isArray(empJson?.data?.employees) ? empJson.data.employees : [];
            employeeNameById = new Map(
              employees
                .map((e) => {
                  const key = String(e?.ID || e?.id || '').toUpperCase();
                  const name = e?.PersonID?.FullName || e?.PersonID?.Name || e?.FullName || key;
                  return [key, name];
                })
                .filter(([key]) => key)
            );
          }
          // If not ok, we just continue with empty map - employee names will show as IDs
        } catch (empErr) {
          // Ignore employee loading errors - not critical for shifts display
          console.warn('Could not load employee names:', empErr.message);
        }

        // Step 2: load shifts list
        const query = new URLSearchParams();
        query.set('limit', '200');
        if (fromDate) query.set('fromDate', fromDate);
        if (toDate) query.set('toDate', toDate);
        if (search) query.set('search', search);

        const res = await fetch(`${API_BASE_URL}/api/shifts?${query.toString()}`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error?.message || `Failed to load shifts (${res.status})`);

        const items = Array.isArray(json?.data?.items) ? json.data.items : Array.isArray(json?.data) ? json.data : [];
        const mapped = items.map((s) => normalizeShiftRow(s, employeeNameById));

        setRows(mapped);

        // KPIs
        const now = new Date();
        const onDuty = items.filter((s) => String(s?.Status || '').toUpperCase() !== 'COMPLETED' && s?.CheckOutTime == null).length;
        const revenueToday = items
          .filter((s) => isSameDay(s?.ShiftDate || s?.CheckInTime, now))
          .reduce((sum, s) => sum + (typeof s?.Revenue === 'number' ? s.Revenue : 0), 0);

        setStaffOnDuty(onDuty);
        setTotalShifts(items.length);
        setTotalRevenueToday(revenueToday);
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'Failed to load shifts');
          setRows([]);
          setStaffOnDuty(0);
          setTotalShifts(0);
          setTotalRevenueToday(0);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, search]);

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
    setGateFilter('All Gates');
    setStatusFilter('All Status');
    setCurrentPage(1);
  };

  // Filter rows based on gate and status
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const gate = r.raw?.Gate || r.raw?.GateType || '';
      const matchesGate =
        gateFilter === 'All Gates' ||
        gate.toUpperCase().includes(gateFilter.toUpperCase());
      const matchesStatus =
        statusFilter === 'All Status' ||
        (statusFilter === 'Active' && r.status !== 'COMPLETED') ||
        (statusFilter === 'Completed' && r.status === 'COMPLETED');
      return matchesGate && matchesStatus;
    });
  }, [rows, gateFilter, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [gateFilter, statusFilter, search, fromDate, toDate]);

  return (
    <div className="shifts">
      <div className="shifts-pageHeader">
        <div className="shifts-pageTitle">Manage Shift</div>
        <div className="shifts-pageSubtitle">Track and manage employee shifts</div>
      </div>

      <div className="shifts-stats">
        <div className="shifts-stat">
          <div className="shifts-statIcon blue">
            <img src={staffIcon} alt="" />
          </div>
          <div className="shifts-statText">
            <div className="shifts-statLabel">Staff On Duty</div>
            <div className="shifts-statValue">{staffOnDuty}</div>
          </div>
        </div>

        <div className="shifts-stat">
          <div className="shifts-statIcon purple">
            <img src={shiftIcon} alt="" />
          </div>
          <div className="shifts-statText">
            <div className="shifts-statLabel">Total Shifts</div>
            <div className="shifts-statValue">{totalShifts}</div>
          </div>
        </div>

        <div className="shifts-stat">
          <div className="shifts-statIcon green">
            <img src={revenueIcon} alt="" />
          </div>
          <div className="shifts-statText">
            <div className="shifts-statLabel">Total Revenue Today</div>
            <div className="shifts-statValue">{fmtMoney(totalRevenueToday)}</div>
          </div>
        </div>
      </div>

      <div className="shifts-controls">
        <div className="shifts-filterCard">
          <div className="shifts-filterLeft">
            <div className="shifts-filterLabel">
              <img src={filterIcon} alt="" />
              <span>Filter:</span>
            </div>
            <div className="shifts-filterRow">
              <label className="shifts-dateField">
                <span>From:</span>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label className="shifts-dateField">
                <span>To:</span>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>

              <div className="shifts-selectField">
                <label>Gate:</label>
                <select value={gateFilter} onChange={(e) => setGateFilter(e.target.value)}>
                  <option value="All Gates">All Gates</option>
                  <option value="Entry">Entry</option>
                  <option value="Exit">Exit</option>
                </select>
              </div>

              <div className="shifts-selectField">
                <label>Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All Status">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <button type="button" className="shifts-clearBtn" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="shifts-search shifts-searchWide">
        <img src={searchIcon} alt="" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shifts..."
          aria-label="Search shifts"
        />
      </div>

      <div className="shifts-tableCard">
        {error && <div className="shifts-error">{error}</div>}
        {loading ? (
          <div className="shifts-loading">Loading shifts…</div>
        ) : (
          <table className="shifts-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Gate</th>
                <th>Entries</th>
                <th>Status</th>
                <th className="shifts-actionsHeader">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="shifts-emptyRow">No shifts found</td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.employee}</td>
                    <td>{r.dateLabel}</td>
                    <td>{r.startLabel}</td>
                    <td>{r.endLabel}</td>
                    <td>{r.raw?.Gate || r.raw?.GateType || '-'}</td>
                    <td>{r.entries}</td>
                    <td>
                      <span className={`shifts-status ${r.status === 'COMPLETED' ? 'completed' : 'active'}`}>{r.statusLabel}</span>
                    </td>
                    <td className="shifts-actions">
                      <div className="shifts-actionsInner">
                        <button
                          type="button"
                          className="shifts-actionIcon"
                          aria-label="View shift details"
                          onClick={() => openShiftDetail(r)}
                        >
                          <img src={moreIcon} alt="" />
                        </button>
                        {r.status !== 'COMPLETED' && (
                          <button type="button" className="shifts-endBtn" onClick={() => handleEndShift(r.id)}>
                            End
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="shifts-pagination">
        <div className="shifts-results">
          Showing {paginatedRows.length} of {filteredRows.length} results
          {filteredRows.length !== rows.length && ` (${rows.length} total)`}
        </div>
        <div className="shifts-pager">
          <span className="shifts-pageInfo">Page {currentPage} of {totalPages || 1}</span>
          <button
            type="button"
            className="shifts-pageBtn"
            onClick={handlePreviousPage}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="shifts-pageBtn"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <ViewShiftModal
        isOpen={viewShiftOpen}
        onClose={closeShiftDetail}
        shiftId={viewShiftId}
        apiBaseUrl={API_BASE_URL}
        headers={headers}
        rowFallback={viewShiftRow}
      />
    </div>
  );
}
