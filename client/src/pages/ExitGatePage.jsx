import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ShiftReportModal from '../components/ShiftReportModal';
import WebcamCapture from '../components/WebcamCapture';
import { recognizePlateOnly, compressImage } from '../utils/lpApi';
import '../styles/pages/StaffGatePage.css';

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
const exitIcon = exitIconSvg;
const logoutIcon = exitIconSvg;
const reportIcon = reportIconSvg;
const carIcon = carIconSvg;
const motorcycleIcon = motorcycleIconSvg;
const vanIcon = vanIconSvg;
const carLargeIcon = carLargeIconSvg;
const motorcycleLargeIcon = motorcycleLargeIconSvg;
const checkIcon = checkIconSvg;
const noVehicleIcon = carIconSvg;
const newExitIcon = exitIconSvg;
const queryIcon = queryIconSvg;

const ExitGatePage = () => {
  const { user, token, authHeaders: ctxAuthHeaders, logout } = useAuth();
  const [showShiftReport, setShowShiftReport] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  const authHeaders = () => (ctxAuthHeaders || (token ? { Authorization: `Bearer ${token}` } : {}))

  const staffEmployeeId = user?.employeeId || user?.id || 'STAFF'

  const [vehicleTypes, setVehicleTypes] = useState([])

  // Parking capacity - fetched from API
  const [parkingCapacity, setParkingCapacity] = useState({
    current: 0,
    total: 0,
    vehicleTypes: {}
  })

  // Shift report data
  const [shiftReportData, setShiftReportData] = useState(null)

  const [gate1Busy, setGate1Busy] = useState(false)
  const [gate2Busy, setGate2Busy] = useState(false)
  const [gate1Error, setGate1Error] = useState('')
  const [gate2Error, setGate2Error] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!token) return

      try {
        const res = await fetch(`${API_BASE_URL}/api/vehicle-types?isActive=true&limit=100`, {
          headers: {
            ...authHeaders()
          }
        })

        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to load vehicle types (${res.status})`)
        }

        const list = json?.data?.vehicleTypes || []
        if (!cancelled) setVehicleTypes(list)
      } catch (e) {
        console.error(e)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [token])

  // Per-gate mode: 'idle' (no vehicle) | 'newExit' (form) | 'processing' (details)
  const [gate1Mode, setGate1Mode] = useState('idle');
  const [gate2Mode, setGate2Mode] = useState('idle');

  // Controls whether post-Query fields are visible in the Exit form.
  const [gate1HasQueried, setGate1HasQueried] = useState(false);
  const [gate2HasQueried, setGate2HasQueried] = useState(false);

  const [gate1NewExit, setGate1NewExit] = useState({
    cardId: '',
    licensePlate: '',
    queriedPlate: '',
    vehicleType: '',
    queriedPlateMismatch: false,
    queriedPlateMode: 'INSTANT'
  });
  const [gate2NewExit, setGate2NewExit] = useState({
    cardId: '',
    licensePlate: '',
    queriedPlate: '',
    vehicleType: '',
    queriedPlateMismatch: false,
    queriedPlateMode: 'INSTANT'
  });

  // Camera & LP Recognition states for Gate 1
  const [gate1ShowCamera, setGate1ShowCamera] = useState(false);
  const [gate1CapturedImage, setGate1CapturedImage] = useState(null);
  const [gate1CroppedImage, setGate1CroppedImage] = useState(null);
  const [gate1Recognition, setGate1Recognition] = useState(null);
  const [gate1RecognitionError, setGate1RecognitionError] = useState(null);

  // Camera & LP Recognition states for Gate 2
  const [gate2ShowCamera, setGate2ShowCamera] = useState(false);
  const [gate2CapturedImage, setGate2CapturedImage] = useState(null);
  const [gate2CroppedImage, setGate2CroppedImage] = useState(null);
  const [gate2Recognition, setGate2Recognition] = useState(null);
  const [gate2RecognitionError, setGate2RecognitionError] = useState(null);

  const sessionToGateData = (gateNumber, session, duration, fee) => {
    if (!session) {
      return {
        gateNumber,
        vehicleType: '',
        cardId: '',
        licensePlate: '',
        plateQueried: '',
        plateInput: '',
        entryTime: '',
        exitTime: '',
        customer: '',
        price: '',
        duration: '',
        hasVehicle: false
      }
    }

    const plate = (session?.LicensePlate || session?.VehicleID?.PlateNumber || '').toUpperCase()
    const vehicleTypeName =
      session?.VehicleTypeID?.Name ||
      session?.VehicleID?.VehicleTypeID?.Name ||
      session?.VehicleTypeID?.VehicleTypeID ||
      ''
    const cardId = session?.CardID?.CardID || session?.CardID || ''
    const customer = session?.CardID?.OwnerID?.FullName || 'Guest'

    return {
      gateNumber,
      vehicleType: vehicleTypeName,
      cardId,
      licensePlate: plate,
      plateQueried: plate ? plate : 'Instant',
      plateInput: plate,
      entryTime: session?.EntryTime ? new Date(session.EntryTime).toLocaleTimeString() : '',
      exitTime: session?.ExitTime ? new Date(session.ExitTime).toLocaleTimeString() : 'Pending',
      customer,
      price: fee !== undefined ? `$${(fee / 1000).toFixed(2)}` : '',
      duration: duration ? `${duration.hours}h ${duration.minutes}m` : '',
      hasVehicle: true,
      sessionId: session?.ID || session?.id
    }
  }

  // Gate state
  const [gate1Data, setGate1Data] = useState({
    gateNumber: 1,
    vehicleType: '',
    cardId: '',
    licensePlate: '',
    plateQueried: '',
    plateInput: '',
    entryTime: '',
    exitTime: '',
    customer: '',
    price: '',
    duration: '',
    hasVehicle: false
  });

  const [gate2Data, setGate2Data] = useState({
    gateNumber: 2,
    vehicleType: '',
    cardId: '',
    licensePlate: '',
    plateQueried: '',
    plateInput: '',
    entryTime: '',
    exitTime: '',
    customer: '',
    price: '',
    duration: '',
    hasVehicle: false
  });

  // Fetch parking capacity from API
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

  // Fetch shift report data
  const fetchShiftReport = async () => {
    if (!token) return

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff-gate/shift-report`, {
        headers: { ...authHeaders() }
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.data) {
        setShiftReportData(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch shift report:', e)
    }
  }

  const handleProcessExit = (gateNumber) => {
    // Reset gate to idle after processing
    if (gateNumber === 1) {
      setGate1Data((prev) => ({ ...prev, hasVehicle: false }));
      setGate1Mode('idle');
      return;
    }

    if (gateNumber === 2) {
      setGate2Data((prev) => ({ ...prev, hasVehicle: false }));
      setGate2Mode('idle');
    }
  };

  const handleNewExit = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('newExit');
      setGate1HasQueried(false);
      setGate1NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate1CapturedImage(null);
      setGate1CroppedImage(null);
      setGate1Recognition(null);
      setGate1RecognitionError(null);
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('newExit');
      setGate2HasQueried(false);
      setGate2NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate2CapturedImage(null);
      setGate2CroppedImage(null);
      setGate2Recognition(null);
      setGate2RecognitionError(null);
    }
  };

  const handleCancelNewExit = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('idle');
      setGate1HasQueried(false);
      setGate1NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate1CapturedImage(null);
      setGate1CroppedImage(null);
      setGate1Recognition(null);
      setGate1RecognitionError(null);
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('idle');
      setGate2HasQueried(false);
      setGate2NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate2CapturedImage(null);
      setGate2CroppedImage(null);
      setGate2Recognition(null);
      setGate2RecognitionError(null);
    }
  };

  const handleQueryPlate = async (gateNumber) => {
    const gateState = gateNumber === 1 ? gate1NewExit : gate2NewExit
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error
    const setHasQueried = gateNumber === 1 ? setGate1HasQueried : setGate2HasQueried
    const setNewExit = gateNumber === 1 ? setGate1NewExit : setGate2NewExit
    const setData = gateNumber === 1 ? setGate1Data : setGate2Data
    const setMode = gateNumber === 1 ? setGate1Mode : setGate2Mode

    let cardId = (gateState.cardId || '').trim()
    const licensePlate = (gateState.licensePlate || '').trim().toUpperCase()

    setErr('')
    setBusy(true)

    try {
      // For exit: Query the gate/exit endpoint to find active session and close it
      const res = await fetch(`${API_BASE_URL}/api/entry-sessions/gate/exit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          CardID: cardId,
          ProcessedExitBy: staffEmployeeId
        })
      })

      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error?.message || `Exit query failed (${res.status})`)
      }

      const decision = json?.data?.decision
      const session = json?.data?.session

      if (decision === 'NO_SESSION_FOUND') {
        setErr('No active session found for this card. Use "Force Exit" if needed.')
        setHasQueried(true)
        setNewExit((prev) => ({
          ...prev,
          queriedPlate: 'NOT FOUND',
          queriedPlateMismatch: true,
          queriedPlateMode: 'INSTANT'
        }))
      } else if (decision === 'EXIT_PERMITTED') {
        // Session closed successfully, show processing view
        const gateData = sessionToGateData(gateNumber, session, json.data.duration, json.data.fee)
        setData(gateData)
        setMode('processing')
        setHasQueried(false)
      }
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  };

  const handleForceExit = (gateNumber) => {
    // Force exit without session - just reset gate
    if (gateNumber === 1) {
      setGate1Mode('idle');
      setGate1HasQueried(false);
      setGate1NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate1Error('');
    } else {
      setGate2Mode('idle');
      setGate2HasQueried(false);
      setGate2NewExit({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      setGate2Error('');
    }
    // In production, you might want to log this forced exit
  };

  const handleCaptureClick = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1ShowCamera(true);
      setGate1Recognition(null);
      setGate1RecognitionError(null);
      setGate1CroppedImage(null);
    } else {
      setGate2ShowCamera(true);
      setGate2Recognition(null);
      setGate2RecognitionError(null);
      setGate2CroppedImage(null);
    }
  };

  const handleCaptureComplete = async (gateNumber, imageData) => {
    const setShowCamera = gateNumber === 1 ? setGate1ShowCamera : setGate2ShowCamera;
    const setCapturedImage = gateNumber === 1 ? setGate1CapturedImage : setGate2CapturedImage;
    const setCroppedImage = gateNumber === 1 ? setGate1CroppedImage : setGate2CroppedImage;
    const setRecognition = gateNumber === 1 ? setGate1Recognition : setGate2Recognition;
    const setRecognitionError = gateNumber === 1 ? setGate1RecognitionError : setGate2RecognitionError;
    const setNewExit = gateNumber === 1 ? setGate1NewExit : setGate2NewExit;
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy;
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error;

    setShowCamera(false);
    setCapturedImage(imageData);

    try {
      setBusy(true);
      setErr('');

      const compressedImage = await compressImage(imageData, 1024, 0.75);
      const response = await recognizePlateOnly({ imageBase64: compressedImage }, token);

      if (response.success) {
        setRecognition(response.recognition);
        setRecognitionError(null);

        const croppedImg = response.recognition?.croppedImage || null;
        setCroppedImage(croppedImg);

        if (response.recognition?.licensePlate) {
          setNewExit((prev) => ({
            ...prev,
            licensePlate: response.recognition.licensePlate
          }));
        }

        console.log(`Gate ${gateNumber} recognition success:`, response.recognition);
      } else {
        setRecognitionError(response.error || 'Recognition failed');
        setErr(response.error || 'Could not recognize plate');
      }
    } catch (err) {
      console.error(`Gate ${gateNumber} recognition error:`, err);
      setRecognitionError(err.message);
      setErr(err.message || 'Plate recognition error');
    } finally {
      setBusy(false);
    }
  };

  const vehicleTypeDisplayLabel = (type) => {
    if (!type) return ''
    const fromDb = vehicleTypes?.find?.((v) => v?.VehicleTypeID === type)
    if (fromDb?.Name) return fromDb.Name
    return String(type).charAt(0).toUpperCase() + String(type).slice(1)
  };

  const isGateIdle = (mode, gateData) => mode === 'idle' || !gateData.hasVehicle;
  const isGateNewExit = (mode) => mode === 'newExit';

  const handleViewShiftReport = async () => {
    await fetchShiftReport()
    setShowShiftReport(true)
  };

  const handleLogout = () => {
    ; (async () => {
      try {
        await fetch(`${API_BASE_URL}/api/staff-accounts/logout`, {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json'
          }
        })
      } catch (e) {
        console.error('Failed to end shift on logout:', e)
      } finally {
        logout();
      }
    })()
  };

  const staffDisplayName = user?.name || 'Staff Member';
  const staffDisplayId = user?.id ? `#${user.id}` : '#000';

  const capacityPercentage = parkingCapacity.total > 0 ? (parkingCapacity.current / parkingCapacity.total) * 100 : 0;

  return (
    <div className="staff-gate-page">
      {/* Header */}
      <header className="staff-header">
        <div className="staff-header-container">
          <div className="staff-info-section">
            <div className="staff-avatar">
              <img src={avatarIcon} alt="Staff" />
            </div>
            <div className="staff-text">
              <p className="staff-role">Staff Member</p>
              <p className="staff-id">{staffDisplayName} {staffDisplayId}</p>
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

      {/* Main Content */}
      <main className="staff-main">
        {/* Top Action Bar */}
        <div className="action-bar">
          <button className="report-btn" onClick={handleViewShiftReport}>
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

              <div className="vehicle-stats">
                {Object.values(parkingCapacity.vehicleTypes || {}).map((vt) => (
                  <div key={vt.id} className="vehicle-stat-item">
                    <img src={vt.name?.toLowerCase().includes('motor') ? motorcycleIcon : vt.name?.toLowerCase().includes('bus') ? vanIcon : carIcon} alt="" />
                    <span>{vt.name} {vt.current}/{vt.total}</span>
                  </div>
                ))}
                {Object.keys(parkingCapacity.vehicleTypes || {}).length === 0 && (
                  <span className="vehicle-stat-empty">Loading...</span>
                )}
              </div>

              <div className="capacity-progress-wrapper">
                <div className="capacity-progress-bar">
                  <div
                    className="capacity-progress-fill"
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
                <span className="capacity-percent">{Math.round(capacityPercentage)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gate Panels */}
        <div className="gate-panels">
          {/* Gate 1 */}
          <div className="gate-panel">
            <div className="gate-header gate-1-header">
              <h2 className="gate-title">Gate 1 - Exit</h2>
            </div>

            <div className="gate-content">
              {isGateNewExit(gate1Mode) ? (
                <div className="new-entry-form">
                  <div className="new-entry-field">
                    <label className="new-entry-label">Card ID</label>
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
                        inputMode="text"
                        placeholder="e.g., CARD-12345"
                        value={gate1NewExit.cardId}
                        onChange={(e) => {
                          setGate1HasQueried(false);
                          setGate1NewExit((prev) => ({
                            ...prev,
                            cardId: e.target.value
                          }));
                        }}
                      />
                      {/* No Visitor Card button for Exit Gate */}
                    </div>
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
                        inputMode="text"
                        placeholder="e.g., ABC-1234"
                        value={gate1NewExit.licensePlate}
                        onChange={(e) => {
                          setGate1HasQueried(false);
                          setGate1NewExit((prev) => ({
                            ...prev,
                            licensePlate: e.target.value
                          }));
                        }}
                      />
                      <button
                        type="button"
                        className="capture-plate-btn"
                        onClick={() => handleCaptureClick(1)}
                        title="Capture license plate with camera"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          <path d="M3 9V7C3 5.89543 3.89543 5 5 5H7L9 3H15L17 5H19C20.1046 5 21 5.89543 21 7V9M3 15V17C3 18.1046 3.89543 19 5 19H7M17 19H19C20.1046 19 21 18.1046 21 17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Capture
                      </button>
                    </div>
                  </div>

                  {/* Cropped LP Image Preview - Gate 1 */}
                  {gate1CroppedImage && (
                    <div className="lp-preview-container">
                      <img
                        src={gate1CroppedImage}
                        alt="Recognized plate"
                        className="lp-preview-image"
                      />
                    </div>
                  )}

                  <button className="new-entry-query" type="button" onClick={() => handleQueryPlate(1)} disabled={gate1Busy}>
                    <img src={queryIcon} alt="" />
                    <span>{gate1Busy ? 'Processing...' : 'Query & Exit'}</span>
                  </button>

                  {gate1Error && <p className="new-entry-error">{gate1Error}</p>}

                  {gate1HasQueried && gate1NewExit.queriedPlateMismatch && (
                    <div className="new-entry-field">
                      <button
                        type="button"
                        className="new-entry-submit"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={() => handleForceExit(1)}
                      >
                        Force Exit (No Session)
                      </button>
                    </div>
                  )}

                  <div className="new-entry-actions">
                    <button
                      className="new-entry-cancel"
                      type="button"
                      onClick={() => handleCancelNewExit(1)}
                    >
                      Cancel
                    </button>
                    <button className="new-entry-submit" type="button" onClick={() => handleQueryPlate(1)} disabled={gate1Busy}>
                      Process Exit
                    </button>
                  </div>
                </div>
              ) : isGateIdle(gate1Mode, gate1Data) ? (
                <div className="gate-empty-state">
                  <div className="gate-empty-icon">
                    <img src={noVehicleIcon} alt="" />
                  </div>
                  <p className="gate-empty-title">No vehicle at Gate 1</p>
                  <p className="gate-empty-subtitle">Click below to process exit</p>
                  <button className="new-entry-btn" onClick={() => handleNewExit(1)}>
                    <img src={newExitIcon} alt="" />
                    <span>New Exit</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* License Plate Section */}
                  <div className="license-plate-wrapper">
                    <p className="license-plate-label">License Plate</p>
                    <div className="license-plate-box">
                      {gate1Data.licensePlate ? (
                        <div className="license-plate-display">
                          <p className="license-plate-text">{gate1Data.licensePlate}</p>
                        </div>
                      ) : (
                        <div className="vehicle-icon-wrapper">
                          <div className="vehicle-icon-box" />
                          <p className="vehicle-text">Vehicle at gate</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Info Grid */}
                  <div className="info-grid">
                    <div className="info-card">
                      <p className="info-card-label">Card ID</p>
                      <p className="info-card-value-text card-id-text">{gate1Data.cardId}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Vehicle Type</p>
                      <div className="info-card-value">
                        <img src={carLargeIcon} alt="" />
                        <span className="vehicle-type-text">{gate1Data.vehicleType}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Entry Time</p>
                      <p className="info-card-value-text entry-time-text">{gate1Data.entryTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Duration</p>
                      <p className="info-card-value-text">{gate1Data.duration}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Exit Time</p>
                      <p className="info-card-value-text">{gate1Data.exitTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Price</p>
                      <p className="info-card-value-text">{gate1Data.price}</p>
                    </div>
                  </div>

                  {/* Process Button */}
                  <button className="process-btn" onClick={() => handleProcessExit(1)}>
                    <img src={checkIcon} alt="" />
                    <span>Confirm Exit</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gate 2 */}
          <div className="gate-panel">
            <div className="gate-header gate-2-header">
              <h2 className="gate-title">Gate 2 - Exit</h2>
            </div>

            <div className="gate-content">
              {isGateNewExit(gate2Mode) ? (
                <div className="new-entry-form">
                  <div className="new-entry-field">
                    <label className="new-entry-label">Card ID</label>
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
                        inputMode="text"
                        placeholder="e.g., CARD-12345"
                        value={gate2NewExit.cardId}
                        onChange={(e) => {
                          setGate2HasQueried(false);
                          setGate2NewExit((prev) => ({
                            ...prev,
                            cardId: e.target.value
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
                        inputMode="text"
                        placeholder="e.g., ABC-1234"
                        value={gate2NewExit.licensePlate}
                        onChange={(e) => {
                          setGate2HasQueried(false);
                          setGate2NewExit((prev) => ({
                            ...prev,
                            licensePlate: e.target.value
                          }));
                        }}
                      />
                      <button
                        type="button"
                        className="capture-plate-btn"
                        onClick={() => handleCaptureClick(2)}
                        title="Capture license plate with camera"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                          <path d="M3 9V7C3 5.89543 3.89543 5 5 5H7L9 3H15L17 5H19C20.1046 5 21 5.89543 21 7V9M3 15V17C3 18.1046 3.89543 19 5 19H7M17 19H19C20.1046 19 21 18.1046 21 17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Capture
                      </button>
                    </div>
                  </div>

                  {gate2CroppedImage && (
                    <div className="lp-preview-container">
                      <img
                        src={gate2CroppedImage}
                        alt="Recognized plate"
                        className="lp-preview-image"
                      />
                    </div>
                  )}

                  <button className="new-entry-query" type="button" onClick={() => handleQueryPlate(2)} disabled={gate2Busy}>
                    <img src={queryIcon} alt="" />
                    <span>{gate2Busy ? 'Processing...' : 'Query & Exit'}</span>
                  </button>

                  {gate2Error && <p className="new-entry-error">{gate2Error}</p>}

                  {gate2HasQueried && gate2NewExit.queriedPlateMismatch && (
                    <div className="new-entry-field">
                      <button
                        type="button"
                        className="new-entry-submit"
                        style={{ backgroundColor: '#dc2626' }}
                        onClick={() => handleForceExit(2)}
                      >
                        Force Exit (No Session)
                      </button>
                    </div>
                  )}

                  <div className="new-entry-actions">
                    <button
                      className="new-entry-cancel"
                      type="button"
                      onClick={() => handleCancelNewExit(2)}
                    >
                      Cancel
                    </button>
                    <button className="new-entry-submit" type="button" onClick={() => handleQueryPlate(2)} disabled={gate2Busy}>
                      Process Exit
                    </button>
                  </div>
                </div>
              ) : isGateIdle(gate2Mode, gate2Data) ? (
                <div className="gate-empty-state">
                  <div className="gate-empty-icon">
                    <img src={noVehicleIcon} alt="" />
                  </div>
                  <p className="gate-empty-title">No vehicle at Gate 2</p>
                  <p className="gate-empty-subtitle">Click below to process exit</p>
                  <button className="new-entry-btn" onClick={() => handleNewExit(2)}>
                    <img src={newExitIcon} alt="" />
                    <span>New Exit</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="license-plate-wrapper">
                    <p className="license-plate-label">License Plate</p>
                    <div className="license-plate-box">
                      {gate2Data.licensePlate ? (
                        <div className="license-plate-display">
                          <p className="license-plate-text">{gate2Data.licensePlate}</p>
                        </div>
                      ) : (
                        <div className="vehicle-icon-wrapper">
                          <div className="vehicle-icon-box" />
                          <p className="vehicle-text">Vehicle at gate</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="info-grid">
                    <div className="info-card">
                      <p className="info-card-label">Card ID</p>
                      <p className="info-card-value-text card-id-text">{gate2Data.cardId}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Vehicle Type</p>
                      <div className="info-card-value">
                        <img src={motorcycleLargeIcon} alt="" />
                        <span className="vehicle-type-text">{gate2Data.vehicleType}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Entry Time</p>
                      <p className="info-card-value-text entry-time-text">{gate2Data.entryTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Duration</p>
                      <p className="info-card-value-text">{gate2Data.duration}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Exit Time</p>
                      <p className="info-card-value-text">{gate2Data.exitTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Price</p>
                      <p className="info-card-value-text">{gate2Data.price}</p>
                    </div>
                  </div>

                  <button className="process-btn" onClick={() => handleProcessExit(2)}>
                    <img src={checkIcon} alt="" />
                    <span>Confirm Exit</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Shift Report Modal */}
      <ShiftReportModal
        isOpen={showShiftReport}
        onClose={() => setShowShiftReport(false)}
        gateType="exit"
        report={shiftReportData}
      />

      {/* Webcam Modals */}
      <WebcamCapture
        isOpen={gate1ShowCamera}
        onClose={() => setGate1ShowCamera(false)}
        onCapture={(imageData) => handleCaptureComplete(1, imageData)}
        title="Capture Exit License Plate - Gate 1"
        mode="exit"
      />

      <WebcamCapture
        isOpen={gate2ShowCamera}
        onClose={() => setGate2ShowCamera(false)}
        onCapture={(imageData) => handleCaptureComplete(2, imageData)}
        title="Capture Exit License Plate - Gate 2"
        mode="exit"
      />
    </div>
  );
};

export default ExitGatePage;
