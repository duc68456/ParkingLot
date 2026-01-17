import React, { useMemo } from 'react';
import '../styles/components/ShiftReportModal.css';
import reportIcon from '../assets/icons/reports.svg';
import exportIcon from '../assets/icons/reports/export/export.svg';
import trendIcon from '../assets/icons/dashboard/arrow-up.svg';

const DEFAULT_REPORT = {
  date: null,
  gateTypeLabel: 'Exit Gate',
  stats: {
    total: 0,
    cars: 0,
    motorcycles: 0,
    trucks: 0,
    vans: 0
  },
  // Optional: backend can provide a dynamic breakdown.
  // Supported shapes:
  // - Array: [{ vehicleTypeId, vehicleTypeName, count }]
  // - Object: { [vehicleTypeIdOrName]: count }
  statsByVehicleType: null,
  sessions: []
}

const formatReportDate = (dateLike) => {
  if (!dateLike) return ''
  try {
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike)

    // Match Figma copy: "January 14,\n2026" (wrap) via CSS allowing line-break.
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return String(dateLike)
  }
}

const normalizeMoney = (value) => {
  if (value == null || value === '') return ''
  if (typeof value === 'number') return `$${value.toFixed(2)}`
  const str = String(value)
  return str.startsWith('$') ? str : `$${str}`
}

const escapeCsvCell = (value) => {
  const raw = value == null ? '' : String(value)
  if (/["\n,]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

const ShiftReportModal = ({ isOpen, onClose, gateType = 'entry', report }) => {
  if (!isOpen) return null;

  const reportData = useMemo(() => {
    const base = {
      ...DEFAULT_REPORT,
      gateTypeLabel: gateType === 'entry' ? 'Entry Gate' : 'Exit Gate'
    }
    if (!report) return base
    return {
      ...base,
      ...report,
      stats: {
        ...base.stats,
        ...(report.stats || {})
      },
      statsByVehicleType: report.statsByVehicleType ?? base.statsByVehicleType,
      sessions: Array.isArray(report.sessions) ? report.sessions : base.sessions
    }
  }, [gateType, report])

  const vehicleTypeStats = useMemo(() => {
    // Highest priority: explicit dynamic breakdown from backend.
    const raw = reportData.statsByVehicleType
    if (Array.isArray(raw)) {
      return raw
        .map((x) => ({
          key: String(x?.vehicleTypeId || x?.VehicleTypeID || x?.vehicleType || x?.name || '').trim() || (x?.vehicleTypeName || x?.VehicleTypeName || 'Unknown'),
          label: x?.vehicleTypeName || x?.VehicleTypeName || x?.vehicleType || x?.name || 'Unknown',
          count: Number(x?.count ?? x?.Count ?? 0) || 0
        }))
        .filter((x) => x.label)
    }

    if (raw && typeof raw === 'object') {
      return Object.entries(raw)
        .map(([key, value]) => ({
          key,
          label: key,
          count: Number(value) || 0
        }))
        .filter((x) => x.label)
    }

    // Back-compat: if an older payload includes hard-coded keys, show those
    // but only if at least one exists (prevents displaying misleading 0s).
    const legacy = []
    const legacyMap = [
      { key: 'cars', label: 'Cars', value: reportData?.stats?.cars },
      { key: 'motorcycles', label: 'Motorcycles', value: reportData?.stats?.motorcycles },
      { key: 'trucks', label: 'Trucks', value: reportData?.stats?.trucks },
      { key: 'vans', label: 'Vans', value: reportData?.stats?.vans }
    ]
    const hasLegacyValues = legacyMap.some((x) => Number(x.value) > 0)
    if (hasLegacyValues) {
      legacyMap.forEach((x) => legacy.push({ key: x.key, label: x.label, count: Number(x.value) || 0 }))
      return legacy
    }

    // Last-resort fallback: derive from sessions list.
    const counts = new Map()
    for (const s of (reportData.sessions || [])) {
      const label = String(s?.vehicleType || s?.vehicleTypeName || '').trim() || 'Unknown'
      counts.set(label, (counts.get(label) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ key: label, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [reportData.statsByVehicleType, reportData.stats, reportData.sessions])

  const subtitleText = `${reportData.gateTypeLabel} - ${formatReportDate(reportData.date)}`

  const handleExport = () => {
    const rows = (reportData.sessions || []).map((s) => ({
      entryTime: s.entryTime || '',
      exitTime: s.exitTime || '',
      licensePlate: (s.licensePlate || '').toUpperCase(),
      cardId: s.cardId || '',
      vehicleType: s.vehicleType || '',
      duration: s.duration || '',
      price: normalizeMoney(s.price)
    }))

    const header = ['Entry Time', 'Exit Time', 'License Plate', 'Card ID', 'Vehicle Type', 'Duration', 'Price']
    const lines = [
      header.map(escapeCsvCell).join(','),
      ...rows.map((r) =>
        [r.entryTime, r.exitTime, r.licensePlate, r.cardId, r.vehicleType, r.duration, r.price]
          .map(escapeCsvCell)
          .join(',')
      )
    ]

    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const safeGate = (reportData.gateTypeLabel || 'Gate').replace(/\s+/g, '-')
    const safeDate = (formatReportDate(reportData.date) || '').replace(/[^0-9A-Za-z-]+/g, '-')
    a.href = url
    a.download = `shift-report-${safeGate}-${safeDate || 'today'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="shift-report-overlay" onClick={handleOverlayClick}>
      <div className="shift-report-modal">
        {/* Header */}
        <div className="shift-report-header">
          <div className="shift-report-title-section">
            <div className="shift-report-icon-wrapper">
              <img src={reportIcon} alt="" />
            </div>
            <div className="shift-report-title-text">
              <h3 className="shift-report-title">Shift Report</h3>
              <p className="shift-report-subtitle">{subtitleText}</p>
            </div>
          </div>

          <div className="shift-report-actions">
            <button className="shift-report-export-btn" onClick={handleExport}>
              <img src={exportIcon} alt="" />
              <span>Export</span>
            </button>
            <button className="shift-report-close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="shift-report-content">
          {/* Statistics Cards */}
          <div className="shift-report-stats">
            <div className="shift-stat-card shift-stat-total">
              <div className="shift-stat-header">
                <img src={trendIcon} alt="" />
                <span className="shift-stat-label">Total</span>
              </div>
              <p className="shift-stat-value">{reportData.stats.total}</p>
            </div>

            {vehicleTypeStats.map((vt) => (
              <div className="shift-stat-card" key={vt.key}>
                <p className="shift-stat-label">{vt.label}</p>
                <p className="shift-stat-value">{vt.count}</p>
              </div>
            ))}
          </div>

          {/* Sessions Table */}
          <div className="shift-report-sessions">
            <h4 className="shift-sessions-title">All Sessions</h4>
            <div className="shift-report-table-container">
              <table className="shift-report-table">
                <thead className="shift-table-header">
                  <tr>
                    <th>Entry Time</th>
                    <th>Exit Time</th>
                    <th>License Plate</th>
                    <th>Card ID</th>
                    <th>Vehicle Type</th>
                    <th>Duration</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody className="shift-table-body">
                  {reportData.sessions.map((session, index) => (
                    <tr key={index}>
                      <td>{session.entryTime}</td>
                      <td>{session.exitTime || '-'}</td>
                      <td className="shift-license-plate">{session.licensePlate}</td>
                      <td>{session.cardId}</td>
                      <td className="shift-vehicle-type">{session.vehicleType}</td>
                      <td>{session.duration || '-'}</td>
                      <td className="shift-price">{normalizeMoney(session.price) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftReportModal;
