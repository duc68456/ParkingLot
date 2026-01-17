import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ShiftReportModal from '../components/ShiftReportModal';
import '../styles/pages/StaffGatePage.css'; // Reuse styles

// Import real icons from assets
import avatarIconSvg from '../assets/icons/dashboard/users.svg';
import entryIconSvg from '../assets/icons/dashboard/activity-entry.svg';
import exitIconSvg from '../assets/icons/dashboard/activity-exit.svg';
import reportIconSvg from '../assets/icons/reports.svg';
import carIconSvg from '../assets/icons/dashboard/car.svg';
import motorcycleIconSvg from '../assets/icons/reports/detailed/motorbike.svg';
import vanIconSvg from '../assets/icons/reports/detailed/van.svg';
import carLargeIconSvg from '../assets/icons/dashboard/capacity-cars.svg';
import motorcycleLargeIconSvg from '../assets/icons/dashboard/capacity-motorcycles.svg';
import checkIconSvg from '../assets/icons/dashboard/alert-info.svg';
import queryIconSvg from '../assets/icons/common/actions/search.svg';

// Convert imports to usable paths
const avatarIcon = avatarIconSvg;
const entryIcon = entryIconSvg;
const exitIcon = exitIconSvg;
const logoutIcon = exitIconSvg;
const reportIcon = reportIconSvg;
const carIcon = carIconSvg;
const motorcycleIcon = motorcycleIconSvg;
const vanIcon = vanIconSvg;
const carLargeIcon = carLargeIconSvg;
const motorcycleLargeIcon = motorcycleLargeIconSvg;
const queryIcon = queryIconSvg;

const ExitGatePage = () => {
  const { user, token, authHeaders: ctxAuthHeaders, logout } = useAuth();
  const [showShiftReport, setShowShiftReport] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  const authHeaders = () => (ctxAuthHeaders || (token ? { Authorization: `Bearer ${token}` } : {}))
  const staffEmployeeId = user?.employeeId

  // Parking capacity
  const [parkingCapacity, setParkingCapacity] = useState({
    current: 0,
    total: 0,
    vehicleTypes: {}
  })

  // Gates State
  // Modes: 'idle' | 'processing' (Exit Details shown) | 'error' (Session not found)
  const [gate1Mode, setGate1Mode] = useState('idle');
  const [gate2Mode, setGate2Mode] = useState('idle');

  const [gate1Data, setGate1Data] = useState({});
  const [gate2Data, setGate2Data] = useState({});

  const [gate1Input, setGate1Input] = useState('');
  const [gate2Input, setGate2Input] = useState('');
  const [gate1Loading, setGate1Loading] = useState(false);
  const [gate2Loading, setGate2Loading] = useState(false);
  const [gate1Error, setGate1Error] = useState('');
  const [gate2Error, setGate2Error] = useState('');

  // Fetch parking capacity
  useEffect(() => {
    let cancelled = false
    const fetchCapacity = async () => {
      if (!token) return
      try {
        const res = await fetch(`${API_BASE_URL}/api/staff-gate/parking-capacity`, {
          headers: { ...authHeaders() }
        })
        const json = await res.json().catch(() => null)
        if (res.ok && json?.data && !cancelled) {
          setParkingCapacity(json.data)
        }
      } catch (e) {
        console.error('Failed to fetch parking capacity:', e)
      }
    }
    fetchCapacity()
    const interval = setInterval(fetchCapacity, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [token])

  const handleLogout = () => {
    (async () => {
      try {
        await fetch(`${API_BASE_URL}/api/staff-accounts/logout`, {
          method: 'POST',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' }
        })
      } catch (e) {
        console.error('Logout error:', e)
      } finally {
        logout();
      }
    })()
  };

  const handleScanCard = async (gateNumber) => {
    const input = gateNumber === 1 ? gate1Input : gate2Input
    const setMode = gateNumber === 1 ? setGate1Mode : setGate2Mode
    const setData = gateNumber === 1 ? setGate1Data : setGate2Data
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error
    const setLoading = gateNumber === 1 ? setGate1Loading : setGate2Loading

    if (!input.trim()) return

    setLoading(true)
    setErr('')

    try {
      const res = await fetch(`${API_BASE_URL}/api/entry-sessions/gate/exit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          CardID: input.trim(),
          ProcessedExitBy: staffEmployeeId
        })
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error?.message || 'Exit processing failed')
      }

      const decision = json?.data?.decision
      const session = json?.data?.session

      if (decision === 'NO_SESSION_FOUND') {
        setMode('error')
        setErr('No active session found for this card.')
        // Keep input for reference or force exit logic if needed
      } else if (decision === 'EXIT_PERMITTED') {
        setMode('processing')
        setData({
          cardId: input,
          plateNumber: session.LicensePlate || 'Unknown',
          entryTime: new Date(session.EntryTime).toLocaleString(),
          exitTime: new Date(session.ExitTime).toLocaleString(),
          duration: `${json.data.duration.hours}h ${json.data.duration.minutes}m`,
          fee: json.data.fee,
          vehicleType: session.VehicleTypeID?.Name || 'Vehicle',
          customerName: session?.CardID?.OwnerID?.FullName || 'Guest'
        })
      }

    } catch (e) {
      setErr(e.message)
      setMode('error')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmExit = (gateNumber) => {
    // Reset gate to idle
    if (gateNumber === 1) {
      setGate1Mode('idle')
      setGate1Input('')
      setGate1Data({})
      setGate1Error('')
    } else {
      setGate2Mode('idle')
      setGate2Input('')
      setGate2Data({})
      setGate2Error('')
    }
  }

  const handleForceExit = (gateNumber) => {
    // Just clear the gate logic for now
    // In real scenario, might call an endpoint to log "Forced Open"
    if (gateNumber === 1) {
      setGate1Mode('idle')
      setGate1Input('')
      setGate1Error('')
    } else {
      setGate2Mode('idle')
      setGate2Input('')
      setGate2Error('')
    }
  }

  const renderGate = (gateNumber) => {
    const mode = gateNumber === 1 ? gate1Mode : gate2Mode
    const data = gateNumber === 1 ? gate1Data : gate2Data
    const input = gateNumber === 1 ? gate1Input : gate2Input
    const setInput = gateNumber === 1 ? setGate1Input : setGate2Input
    const loading = gateNumber === 1 ? gate1Loading : gate2Loading
    const error = gateNumber === 1 ? gate1Error : gate2Error

    return (
      <div className="gate-card">
        <div className="gate-header">
          <div className="gate-title-row">
            <h2>Gate {gateNumber}</h2>
            <span className={`gate-status-badge ${mode === 'processing' ? 'status-active' : 'status-idle'}`}>
              {mode === 'processing' ? 'Processing Exit' : 'Available'}
            </span>
          </div>
        </div>

        <div className="gate-body">
          {mode === 'idle' && (
            <div className="gate-new-entry-form">
              <label>Scan Card for Exit</label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Scan Card (RFID)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScanCard(gateNumber)}
                  disabled={loading}
                />
                <button
                  className="btn-primary"
                  onClick={() => handleScanCard(gateNumber)}
                  disabled={loading || !input}
                >
                  <img src={queryIcon} alt="" /> Check Out
                </button>
              </div>
            </div>
          )}

          {mode === 'processing' && (
            <div className="gate-details">
              <div className="detail-row">
                <span>License Plate:</span>
                <strong>{data.plateNumber}</strong>
              </div>
              <div className="detail-row">
                <span>Vehicle Type:</span>
                <strong>{data.vehicleType}</strong>
              </div>
              <div className="detail-row">
                <span>Customer:</span>
                <strong>{data.customerName}</strong>
              </div>
              <div className="detail-row">
                <span>Duration:</span>
                <strong>{data.duration}</strong>
              </div>
              <div className="detail-row fee-row">
                <span>Parking Fee:</span>
                <strong className="fee-value">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.fee)}</strong>
              </div>

              <div className="gate-actions-row">
                <button className="btn-success full-width" onClick={() => handleConfirmExit(gateNumber)}>
                  Confirm Exit & Open Gate
                </button>
              </div>
            </div>
          )}

          {mode === 'error' && (
            <div className="gate-error-state">
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button className="btn-secondary" onClick={() => handleConfirmExit(gateNumber)}>Try Again</button>
                <button className="btn-danger" onClick={() => handleForceExit(gateNumber)}>Force Open Gate</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="staff-gate-page">
      <header className="staff-header">
        <div className="staff-header-container">
          <div className="staff-info-section">
            <div className="staff-avatar">
              <img src={avatarIcon} alt="Staff" />
            </div>
            <div className="staff-text">
              <p className="staff-role">Staff Member</p>
              <p className="staff-id">{user?.name} {user?.id && `#${user.id}`}</p>
            </div>
          </div>
          <div className="gate-type-pill" aria-label="Gate Type">
            <img src={exitIcon} alt="" />
            <span>Exit Gate</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <img src={logoutIcon} alt="" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="staff-main">
        <div className="action-bar">
          <button className="report-btn" onClick={() => setShowShiftReport(true)}>
            <img src={reportIcon} alt="" />
            <span>View Shift Report</span>
          </button>
          <div className="capacity-container">
            <div className="capacity-inner">
              <div className="capacity-numbers">
                <span className="capacity-label">Parking Capacity:</span>
                <div className="capacity-values">
                  <span className="capacity-current">{parkingCapacity.current}</span>
                  <span className="capacity-total">/ {parkingCapacity.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gates-container">
          {renderGate(1)}
          {renderGate(2)}
        </div>
      </main>

      <ShiftReportModal isOpen={showShiftReport} onClose={() => setShowShiftReport(false)} />
    </div>
  );
};

export default ExitGatePage;
