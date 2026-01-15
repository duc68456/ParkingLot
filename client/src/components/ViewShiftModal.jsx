import React, { useEffect, useMemo, useState } from 'react';
import '../styles/components/ViewShiftModal.css';

import employeeIcon from '../assets/icons/dashboard/users.svg';
import scheduleIcon from '../assets/icons/reports/tabs/time-period.svg';
import summaryIcon from '../assets/icons/reports/tabs/overview.svg';
import totalVehiclesIcon from '../assets/icons/dashboard/users.svg';
import vehicleBreakdownIcon from '../assets/icons/reports.svg';
import gateIcon from '../assets/icons/dashboard/activity-entry.svg';
import durationIcon from '../assets/icons/reports/tabs/time-period.svg';

const formatDate = (dateLike) => {
  if (!dateLike) return '-';
  try {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return String(dateLike);
  }
};

const formatTime = (dateLike) => {
  if (!dateLike) return '-';
  try {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(dateLike);
  }
};

const formatMoney = (value) => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(value);
  }
  if (typeof value === 'string') return value.startsWith('$') ? value : `$${value}`;
  return '$0.00';
};

const getDayName = (dateLike) => {
  if (!dateLike) return '-';
  try {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  } catch {
    return '-';
  }
};

const getDurationLabel = (startLike, endLike) => {
  if (!startLike || !endLike) return '-';
  try {
    const start = startLike instanceof Date ? startLike : new Date(startLike);
    const end = endLike instanceof Date ? endLike : new Date(endLike);
    const ms = Math.max(0, end.getTime() - start.getTime());
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
  } catch {
    return '-';
  }
};

const pickShiftDate = (shift) => shift?.ShiftDate || shift?.CheckInTime || null;

const formatDateTime = (dateLike) => {
  if (!dateLike) return '-';
  try {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
    const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date}, ${time}`;
  } catch {
    return String(dateLike);
  }
};

const normalizeGateLabel = (gate) => {
  const g = String(gate || '').trim().toUpperCase();
  if (!g) return '-';
  if (g === 'ENTRY' || g === 'EXIT') return g;
  if (g === 'IN' || g === 'IN_GATE') return 'ENTRY';
  if (g === 'OUT' || g === 'OUT_GATE') return 'EXIT';
  return g;
};

export default function ViewShiftModal({ isOpen, onClose, shiftId, apiBaseUrl, headers, rowFallback }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shift, setShift] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError('');
      try {
        // If we don't have a shiftId (or there isn't a backend endpoint yet), render from fallback.
        if (!shiftId) {
          setShift(rowFallback || null);
          return;
        }

        const res = await fetch(`${apiBaseUrl}/api/shifts/${encodeURIComponent(shiftId)}`, {
          headers: { ...(headers || {}) },
          signal: controller.signal
        });

        const json = await res.json().catch(() => null);

        if (!res.ok) {
          // If the endpoint doesn't exist yet, fall back to in-table data.
          if (res.status === 404 || res.status === 405) {
            setShift(rowFallback || null);
            return;
          }
          throw new Error(json?.error?.message || `Failed to load shift (${res.status})`);
        }

        const data = json?.data?.item || json?.data || json;
        setShift(data);
      } catch (e) {
        if (e?.name !== 'AbortError') {
          setError(e?.message || 'Failed to load shift');
          setShift(rowFallback || null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [apiBaseUrl, headers, isOpen, rowFallback, shiftId]);

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const vm = useMemo(() => {
    const s = shift || rowFallback || {};

    const statusRaw = String(s?.Status || s?.status || 'IN_PROGRESS').toUpperCase();
    const isCompleted = statusRaw === 'COMPLETED';

    const shiftBusinessId = s?.ID || s?.id || shiftId || '-';

    const employeeId = s?.EmployeeID || s?.employeeId || '-';
    const employeeName = s?.EmployeeName || s?.employeeName || s?.employee || '-';

    const dateLike = pickShiftDate(s);

    const checkIn = s?.CheckInTime || s?.checkInTime || null;
    const checkOut = s?.CheckOutTime || s?.checkOutTime || null;

    const gate = normalizeGateLabel(s?.Gate || s?.gate || s?.GateType);

    const totalVehicles =
      s?.TotalVehicles ?? s?.totalVehicles ?? s?.Entries ?? s?.entries ?? s?.TotalEntries ?? 0;

    // Placeholder breakdown until we wire ShiftReportDetail. Keep the UI structure identical.
    const breakdown = Array.isArray(s?.breakdown)
      ? s.breakdown
      : [
          { type: 'Car', count: Math.max(0, Math.round(totalVehicles * 0.66)) },
          { type: 'Motorcycle', count: Math.max(0, Math.round(totalVehicles * 0.27)) },
          { type: 'Truck', count: Math.max(0, totalVehicles - (Math.max(0, Math.round(totalVehicles * 0.66)) + Math.max(0, Math.round(totalVehicles * 0.27)))) }
        ];

    const createdAt = s?.CreatedAt || s?.createdAt || checkIn;

    const durationHours = typeof s?.DurationHours === 'number' ? s.DurationHours : null;
    const durationLabel = durationHours !== null && !Number.isNaN(durationHours)
      ? `${Math.round(durationHours)}h`
      : (isCompleted ? getDurationLabel(checkIn, checkOut).replace(' 0m', '') : '-');

    const entries = totalVehicles;
    const revenue = s?.TotalRevenue ?? s?.totalRevenue ?? s?.Revenue ?? s?.revenue ?? s?.TotalRevenueValue ?? 0;

    return {
      statusLabel: isCompleted ? 'Completed' : 'Active',
      isCompleted,
      shiftBusinessId,
      employeeId,
      employeeName,
      dateLike,
      dayName: getDayName(dateLike),
      gate,
      checkInTime: formatTime(checkIn),
      checkOutTime: isCompleted ? formatTime(checkOut) : '-',
      duration: isCompleted ? durationLabel : '-',
      totalVehicles,
      breakdown,
      createdAt,
      entries,
      revenue
    };
  }, [rowFallback, shift, shiftId]);

  if (!isOpen) return null;

  return (
    <div className="vsm-overlay" onClick={overlayClick} role="dialog" aria-modal="true" aria-label="Shift Details">
      <div className="vsm-modal">
        <div className="vsm-header">
          <h2>Shift Details</h2>
          <button className="vsm-close" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="vsm-body">
          {error && <div className="vsm-error">{error}</div>}

          {loading && <div className="vsm-loading">Loading…</div>}

          <div className={vm.isCompleted ? 'vsm-status vsm-status--completed' : 'vsm-status vsm-status--active'}>
            {vm.statusLabel}
          </div>

          <div className="vsm-card">
            <div className="vsm-cardTitle">
              <img src={employeeIcon} alt="" />
              <span>Employee Information</span>
            </div>
            <div className="vsm-grid2">
              <div className="vsm-field">
                <div className="vsm-label">Employee ID</div>
                <div className="vsm-value vsm-value--mono">{vm.employeeId}</div>
              </div>
              <div className="vsm-field">
                <div className="vsm-label">Employee Name</div>
                <div className="vsm-value">{vm.employeeName}</div>
              </div>
            </div>
          </div>

          <div className="vsm-card vsm-card--schedule">
            <div className="vsm-cardTitle">
              <img src={scheduleIcon} alt="" />
              <span>Schedule</span>
            </div>
            <div className="vsm-grid3">
              <div className="vsm-field">
                <div className="vsm-label">Shift Date</div>
                <div className="vsm-value">{formatDate(vm.dateLike)}</div>
              </div>
              <div className="vsm-field">
                <div className="vsm-label">Day</div>
                <div className="vsm-value">{vm.dayName}</div>
              </div>
              <div className="vsm-field">
                <div className="vsm-label">Gate</div>
                <div className="vsm-inlineValue">
                  <img className="vsm-inlineIcon" src={gateIcon} alt="" />
                  <span className="vsm-value">{vm.gate}</span>
                </div>
              </div>

              <div className="vsm-field">
                <div className="vsm-label">Check-In Time</div>
                <div className="vsm-value">{vm.checkInTime}</div>
              </div>
              <div className="vsm-field">
                <div className="vsm-label">Check-Out Time</div>
                <div className="vsm-value">{vm.checkOutTime}</div>
              </div>
              <div className="vsm-field">
                <div className="vsm-label">Duration</div>
                <div className="vsm-inlineValue">
                  <img className="vsm-inlineIcon" src={durationIcon} alt="" />
                  <span className="vsm-value">{vm.duration}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="vsm-summary">
            <div className="vsm-cardTitle">
              <img src={summaryIcon} alt="" />
              <span>Shift Summary</span>
            </div>
            <div className="vsm-summaryCard">
              <div className="vsm-label">Total Vehicles</div>
              <div className="vsm-summaryValue">
                <img src={totalVehiclesIcon} alt="" />
                <span>{vm.totalVehicles}</span>
              </div>
            </div>
          </div>

          <div className="vsm-card vsm-card--breakdown">
            <div className="vsm-cardTitle">
              <img src={vehicleBreakdownIcon} alt="" />
              <span>Vehicle Type Breakdown</span>
            </div>
            <div className="vsm-breakdownTable" role="table" aria-label="Vehicle Type Breakdown">
              <div className="vsm-breakdownHeader" role="row">
                <div className="vsm-breakdownTh" role="columnheader">Vehicle Type</div>
                <div className="vsm-breakdownTh vsm-breakdownTh--right" role="columnheader">Count</div>
              </div>
              <div className="vsm-breakdownBody" role="rowgroup">
                {vm.breakdown.map((r) => (
                  <div key={r.type} className="vsm-breakdownRow" role="row">
                    <div className="vsm-breakdownTd" role="cell">{r.type}</div>
                    <div className="vsm-breakdownTd vsm-breakdownTd--right" role="cell">{r.count}</div>
                  </div>
                ))}
                <div className="vsm-breakdownRow vsm-breakdownRow--total" role="row">
                  <div className="vsm-breakdownTd" role="cell">Total</div>
                  <div className="vsm-breakdownTd vsm-breakdownTd--right" role="cell">{vm.totalVehicles}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="vsm-card vsm-card--additional">
            <div className="vsm-cardTitle vsm-cardTitle--plain">Additional Information</div>
            <div className="vsm-kv">
              <div className="vsm-kvRow">
                <div className="vsm-kvKey">Shift ID:</div>
                <div className="vsm-kvVal vsm-value--mono">{vm.shiftBusinessId}</div>
              </div>
              <div className="vsm-kvRow">
                <div className="vsm-kvKey">Created At:</div>
                <div className="vsm-kvVal">{formatDateTime(vm.createdAt)}</div>
              </div>
            </div>
          </div>

          {loading && <div className="vsm-loading">Loading…</div>}
        </div>

        <div className="vsm-footer">
          <button type="button" className="vsm-closeBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
