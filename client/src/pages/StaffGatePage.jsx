import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ShiftReportModal from '../components/ShiftReportModal';
import '../styles/pages/StaffGatePage.css';

// Image assets
const avatarIcon = "http://localhost:3845/assets/9bddb7d3b5cfd4771d686fa89d8f6c6ee437a2e3.svg";
const entryIcon = "http://localhost:3845/assets/8ee6b442d525b28d4a107672a3efc208c8d5b28c.svg";
const exitIcon = "http://localhost:3845/assets/40b6efd51b3d35c2be0b0b2f307ef67ab9118b5a.svg";
const logoutIcon = "http://localhost:3845/assets/902105cd8549440941d486cd0ccb50c5a0c7c3e2.svg";
const reportIcon = "http://localhost:3845/assets/2cd94cd69e5a78911979055e1ac2572aef27c1ae.svg";
const carIcon = "http://localhost:3845/assets/878d7752e239ba114ca716ee37fc3e74eb6b3742.svg";
const motorcycleIcon = "http://localhost:3845/assets/52051ee00a1dc5ee32879d95bc1062291ce30e6c.svg";
const bikeIcon = "http://localhost:3845/assets/66f1f8c2b7844cffcea04e705ac2b03b96fc6ff9.svg";
const vanIcon = "http://localhost:3845/assets/f4914feb3bfbebb6a428b63471152a4faf6aea6a.svg";
const carLargeIcon = "http://localhost:3845/assets/40da8ed0c07b951d664ec087ff587c1797e9fa58.svg";
const motorcycleLargeIcon = "http://localhost:3845/assets/3f18c6e8ca4d37dcaa592d3004793dd06527b481.svg";
const checkIcon = "http://localhost:3845/assets/ed160eb609969c05d3ce53b626616345c19f90cc.svg";

// Figma empty-state assets (node 333:2)
const noVehicleIcon = "http://localhost:3845/assets/277df36082306b76567e432487f7e01f6fd978eb.svg";
const newEntryIcon = "http://localhost:3845/assets/d5adc677833421c90551d173e93323a33412b09b.svg";

// Figma New Entry Form assets (node 335:235)
const queryIcon = "http://localhost:3845/assets/ad0d772f1387199655cef8846f5971750377093c.svg";

const StaffGatePage = () => {
  const { user, token, authHeaders: ctxAuthHeaders, logout, getStaffGateType } = useAuth();
  const [activeTab, setActiveTab] = useState('entry');
  const [showShiftReport, setShowShiftReport] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

  const authHeaders = () => (ctxAuthHeaders || (token ? { Authorization: `Bearer ${token}` } : {}))

  const staffEmployeeId = user?.employeeId

  useEffect(() => {
    // Initialize gate type from selection made on the staff login form.
    // Defaults to 'entry' if unset.
    if (typeof getStaffGateType === 'function') {
      const initial = getStaffGateType();
      setActiveTab(initial);
    }
    // We only want to run this on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [vehicleTypes, setVehicleTypes] = useState([])

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
        // Non-fatal: UI can still work with manual input, but vehicle type grid will be empty.
        console.error(e)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Per-gate mode: 'idle' (no vehicle) | 'newEntry' (form) | 'processing' (details)
  const [gate1Mode, setGate1Mode] = useState('processing');
  const [gate2Mode, setGate2Mode] = useState('processing');

  // Controls whether post-Query fields are visible in the New Entry form.
  const [gate1HasQueried, setGate1HasQueried] = useState(false);
  const [gate2HasQueried, setGate2HasQueried] = useState(false);

  const [gate1NewEntry, setGate1NewEntry] = useState({
    cardId: '',
    licensePlate: '',
    queriedPlate: '',
    vehicleType: '',
    queriedPlateMismatch: false,
    queriedPlateMode: 'INSTANT'
  });
  const [gate2NewEntry, setGate2NewEntry] = useState({
    cardId: '',
    licensePlate: '',
    queriedPlate: '',
    vehicleType: '',
    queriedPlateMismatch: false,
    queriedPlateMode: 'INSTANT'
  });

  const sessionToGateData = (gateNumber, session) => {
    if (!session) {
      return {
        gateNumber,
        vehicleType: '',
        cardId: '',
        licensePlate: '',
        plateQueried: '',
        plateInput: '',
        entryTime: '',
        customer: '',
        exitTime: 'Pending',
        price: '',
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
    const customer = session?.CardID?.CustomerID?.PersonID?.FullName || ''

    return {
      gateNumber,
      vehicleType: vehicleTypeName,
      cardId,
      licensePlate: plate,
      plateQueried: plate ? plate : 'Instant',
      plateInput: plate,
      entryTime: session?.EntryTime ? new Date(session.EntryTime).toLocaleTimeString() : '',
      customer,
      exitTime: 'Pending',
      price: '',
      hasVehicle: true,
      sessionId: session?.ID || session?.id
    }
  }

  // Gate state (will be hydrated from API; initial values are placeholders)
  const [gate1Data, setGate1Data] = useState({
    gateNumber: 1,
    vehicleType: 'car',
    cardId: 'UID-123456',
    licensePlate: 'ABC-1234',
    plateQueried: 'ABC-1234',
    plateInput: 'ABC-1234',
    entryTime: '15:25:30',
    customer: 'John Doe',
    exitTime: 'Pending',
    price: '$15.00',
    hasVehicle: true
  });

  const [gate2Data, setGate2Data] = useState({
    gateNumber: 2,
    vehicleType: 'motorcycle',
    cardId: 'UID-789012',
    licensePlate: 'XYZ-5678',
    plateQueried: 'Instant',
    plateInput: 'XYZ-5678',
    entryTime: '16:25:30',
    customer: 'Jane Smith',
    exitTime: 'Pending',
    price: '$10.00',
    hasVehicle: true
  });

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) return

      try {
        const res = await fetch(`${API_BASE_URL}/api/entry-sessions/gate/active-latest`, {
          headers: { ...authHeaders() }
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.error?.message || `Failed to load gate state (${res.status})`)
        }

        const session = json?.data?.session

        if (cancelled) return

        if (session) {
          // For now: show the latest active session on Gate 2 and keep Gate 1 idle.
          // When you add a real "gate" identifier on EntrySession, we can map by gate.
          setGate2Data(sessionToGateData(2, session))
          setGate2Mode('processing')

          setGate1Data(sessionToGateData(1, null))
          setGate1Mode('idle')
        } else {
          setGate1Data(sessionToGateData(1, null))
          setGate1Mode('idle')
          setGate2Data(sessionToGateData(2, null))
          setGate2Mode('idle')
        }
      } catch (e) {
        console.error(e)
        // Fail-open to idle so staff can still operate.
        if (!cancelled) {
          setGate1Mode('idle')
          setGate2Mode('idle')
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Mock parking capacity data
  const parkingCapacity = {
    current: 2,
    total: 2050,
    cars: { current: 1, total: 500 },
    motorcycles: { current: 1, total: 1200 },
    bikes: { current: 0, total: 150 },
    vans: { current: 0, total: 200 }
  };

  const handleProcessEntry = (gateNumber) => {
    console.log(`Processing entry for Gate ${gateNumber}`);

    // Mock: once processed, the gate becomes idle (no vehicle), showing the
    // "New Entry" empty state per Figma.
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

  // For now this simply flips the UI into a mock "processing" state.
  // Later we can replace with real capture/card-scan flow.
  const handleNewEntry = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('newEntry');
      setGate1HasQueried(false);
      setGate1NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' })
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('newEntry');
      setGate2HasQueried(false);
      setGate2NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' })
    }
  };

  const handleCancelNewEntry = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('idle');
      setGate1HasQueried(false);
      setGate1NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' })
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('idle');
      setGate2HasQueried(false);
      setGate2NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' })
    }
  };

  const handleQueryPlate = (gateNumber) => {
    const gateState = gateNumber === 1 ? gate1NewEntry : gate2NewEntry
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error
    const setHasQueried = gateNumber === 1 ? setGate1HasQueried : setGate2HasQueried
    const setNewEntry = gateNumber === 1 ? setGate1NewEntry : setGate2NewEntry

    const cardId = (gateState.cardId || '').trim()
    const licensePlate = (gateState.licensePlate || '').trim().toUpperCase()

    setErr('')
    setBusy(true)

    fetch(`${API_BASE_URL}/api/entry-sessions/gate/query?cardId=${encodeURIComponent(cardId)}&licensePlate=${encodeURIComponent(licensePlate)}`, {
      headers: {
        ...authHeaders()
      }
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.error?.message || `Query failed (${res.status})`)
        }

        // If staff entered a CardID but the backend didn't find it, treat as an error.
        if (cardId && !json?.data?.card) {
          throw new Error('Card not found')
        }

        const gate = json?.data?.gate || {}

        // Backend already encodes the rules for queried plate:
        // - Visitor => Instant
        // - Non-visitor + ACTIVE subscription => subscription plate
        // - Non-visitor + no subscription => Instant
        const queriedPlate = String(gate?.queriedPlate || '').trim() || 'Instant'

        const normalizedQueriedPlate = queriedPlate.toUpperCase()
        const normalizedInputPlate = String(licensePlate || '').trim().toUpperCase()
        const mismatch =
          gate?.queriedPlateMode === 'SUBSCRIPTION' &&
          Boolean(normalizedQueriedPlate) &&
          Boolean(normalizedInputPlate) &&
          normalizedQueriedPlate !== normalizedInputPlate

        // Card type should show vehicle type from subscription when available,
        // otherwise (Instant) the UI will allow selecting vehicle type.
        const subscriptionVehicleTypeId =
          json?.data?.subscriptionVehicleType?.VehicleTypeID ||
          json?.data?.subscription?.VehicleTypeID ||
          ''

        setHasQueried(true)
        setNewEntry((prev) => ({
          ...prev,
          queriedPlate: normalizedQueriedPlate,
          queriedPlateMismatch: mismatch,
          queriedPlateMode: gate?.queriedPlateMode || (normalizedQueriedPlate === 'INSTANT' ? 'INSTANT' : prev.queriedPlateMode),
          // Only set vehicleType from subscription when provided.
          vehicleType: subscriptionVehicleTypeId || prev.vehicleType
        }))
      })
      .catch((e) => {
        setErr(e.message)
      })
      .finally(() => {
        setBusy(false)
      })
  };

  const handleAddEntry = (gateNumber) => {
    const gateState = gateNumber === 1 ? gate1NewEntry : gate2NewEntry
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error
    const setData = gateNumber === 1 ? setGate1Data : setGate2Data
    const setMode = gateNumber === 1 ? setGate1Mode : setGate2Mode
    const setHasQueried = gateNumber === 1 ? setGate1HasQueried : setGate2HasQueried

    const CardID = (gateState.cardId || '').trim()
    const LicensePlate = (gateState.licensePlate || '').trim().toUpperCase()
    const VehicleTypeID = (gateState.vehicleType || '').trim()

    setErr('')
    setBusy(true)

    fetch(`${API_BASE_URL}/api/entry-sessions/gate/entry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        CardID,
        VehicleTypeID,
        LicensePlate,
        ProcessedEntryBy: staffEmployeeId
      })
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.error?.message || `Add entry failed (${res.status})`)
        }

        const decision = json?.data?.decision
        if (decision === 'VISITOR_SUBSCRIPTION_MISMATCH') {
          window.alert(json?.data?.nextAction?.message || 'Subscription mismatch. Please issue Visitor card and re-enter the Visitor Card ID.')
          // Keep staff on the form to re-input visitor card.
          return
        }

        const session = json?.data?.session
        const displayPlate = (session?.LicensePlate || LicensePlate || '').toUpperCase()
        const normalizedQueriedPlate = String(gateState?.queriedPlate || '').trim().toUpperCase()

        const isInstant = !normalizedQueriedPlate || normalizedQueriedPlate === 'INSTANT'
        const plateQueriedValue = isInstant
          ? 'Instant'
          : normalizedQueriedPlate

        setData((prev) => ({
          ...prev,
          hasVehicle: true,
          cardId: CardID,
          vehicleType: vehicleTypeDisplayLabel(VehicleTypeID) || VehicleTypeID,
          licensePlate: displayPlate,
          plateInput: LicensePlate,
          plateQueried: plateQueriedValue,
          entryTime: session?.EntryTime ? new Date(session.EntryTime).toLocaleTimeString() : prev.entryTime
        }))
        setMode('processing')
        setHasQueried(false)
      })
      .catch((e) => {
        setErr(e.message)
      })
      .finally(() => {
        setBusy(false)
      })
  };

  const vehicleTypeDisplayLabel = (type) => {
    if (!type) return ''
    const fromDb = vehicleTypes?.find?.((v) => v?.VehicleTypeID === type)
    if (fromDb?.Name) return fromDb.Name
    return String(type).charAt(0).toUpperCase() + String(type).slice(1)
  };

  const isGateIdle = (mode, gateData) => mode === 'idle' || !gateData.hasVehicle;
  const isGateNewEntry = (mode) => mode === 'newEntry';

  const handleViewShiftReport = () => {
    setShowShiftReport(true);
  };

  const handleLogout = () => {
    logout();
  };

  const staffDisplayName = user?.name || 'Staff Member';
  const staffDisplayId = user?.id ? `#${user.id}` : '#000';

  const capacityPercentage = (parkingCapacity.current / parkingCapacity.total) * 100;

  return (
    <div className="staff-gate-page">
      {/* Header - 80.8px height */}
      <header className="staff-header">
        <div className="staff-header-container">
          {/* Staff Info */}
          <div className="staff-info-section">
            <div className="staff-avatar">
              <img src={avatarIcon} alt="Staff" />
            </div>
            <div className="staff-text">
              <p className="staff-role">Staff Member</p>
              <p className="staff-id">{staffDisplayName} {staffDisplayId}</p>
            </div>
          </div>

          {/* Gate Type (immutable after login) */}
          <div className="gate-type-pill" aria-label="Gate Type">
            <img src={activeTab === 'exit' ? exitIcon : entryIcon} alt="" />
            <span>{activeTab === 'exit' ? 'Exit Gate' : 'Entry Gate'}</span>
          </div>

          {/* Logout Button - 106.188px width */}
          <button className="logout-btn" onClick={handleLogout}>
            <img src={logoutIcon} alt="" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content - 855.963px height */}
      <main className="staff-main">
        {/* Top Action Bar - 53.6px height */}
        <div className="action-bar">
          {/* View Shift Report Button - 197.613px width */}
          <button className="report-btn" onClick={handleViewShiftReport}>
            <img src={reportIcon} alt="" />
            <span>View Shift Report</span>
          </button>

          {/* Parking Capacity Display */}
          <div className="capacity-container">
            <div className="capacity-inner">
              {/* Capacity Numbers */}
              <div className="capacity-numbers">
                <span className="capacity-label">Parking Capacity:</span>
                <div className="capacity-values">
                  <span className="capacity-current">{parkingCapacity.current}</span>
                  <span className="capacity-total">/ {parkingCapacity.total}</span>
                </div>
              </div>

              {/* Vehicle Stats */}
              <div className="vehicle-stats">
                <div className="vehicle-stat-item">
                  <img src={carIcon} alt="" />
                  <span>{parkingCapacity.cars.current}/{parkingCapacity.cars.total}</span>
                </div>
                <div className="vehicle-stat-item">
                  <img src={motorcycleIcon} alt="" />
                  <span>{parkingCapacity.motorcycles.current}/{parkingCapacity.motorcycles.total}</span>
                </div>
                <div className="vehicle-stat-item">
                  <img src={bikeIcon} alt="" />
                  <span>{parkingCapacity.bikes.current}/{parkingCapacity.bikes.total}</span>
                </div>
                <div className="vehicle-stat-item">
                  <img src={vanIcon} alt="" />
                  <span>Vans {parkingCapacity.vans.current}/{parkingCapacity.vans.total}</span>
                </div>
              </div>

              {/* Progress Bar */}
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

        {/* Gate Panels - 730.362px height */}
        <div className="gate-panels">
          {/* Gate 1 */}
          <div className="gate-panel">
            <div className="gate-header gate-1-header">
              <h2 className="gate-title">Gate 1 - {activeTab === 'entry' ? 'Entry' : 'Exit'}</h2>
            </div>

            <div className="gate-content">
              {isGateNewEntry(gate1Mode) ? (
                <div className="new-entry-form">
                  <div className="new-entry-field">
                    <label className="new-entry-label">Card ID</label>
                    <input
                      className="new-entry-input"
                      inputMode="text"
                      placeholder="e.g., CARD-12345"
                      value={gate1NewEntry.cardId}
                      onChange={(e) => {
                        setGate1HasQueried(false);
                        setGate1NewEntry((prev) => ({
                          ...prev,
                          cardId: e.target.value
                        }));
                      }}
                    />
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <input
                      className="new-entry-input new-entry-input-plate"
                      inputMode="text"
                      placeholder="e.g., ABC-1234"
                      value={gate1NewEntry.licensePlate}
                      onChange={(e) => {
                        setGate1HasQueried(false);
                        setGate1NewEntry((prev) => ({
                          ...prev,
                          licensePlate: e.target.value
                        }));
                      }}
                    />
                  </div>

                  <button className="new-entry-query" type="button" onClick={() => handleQueryPlate(1)}>
                    <img src={queryIcon} alt="" />
                    <span>Query</span>
                  </button>

                  {gate1Error && <p className="new-entry-error">{gate1Error}</p>}

                  {gate1HasQueried && (
                    <>
                      <div className="new-entry-field">
                        <label className="new-entry-label">Queried Plate</label>
                        <input
                          className={`new-entry-input new-entry-input-plate ${gate1NewEntry.queriedPlateMismatch ? 'new-entry-input-mismatch' : ''}`}
                          inputMode="text"
                          placeholder="--"
                          value={(gate1NewEntry.queriedPlate || '').toUpperCase()}
                          readOnly
                        />
                      </div>

                      {(gate1NewEntry.queriedPlateMode || 'INSTANT') !== 'INSTANT' && (gate1NewEntry.cardId || '').trim() ? (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-auto">
                            <p className="new-entry-vehicle-value">
                              {vehicleTypeDisplayLabel(gate1NewEntry.vehicleType) || '—'}
                            </p>
                            {gate1NewEntry.vehicleType && (
                              <p className="new-entry-vehicle-hint">Auto-selected from subscription</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-grid" role="group" aria-label="Vehicle Type">
                            {(vehicleTypes?.length ? vehicleTypes : ['car', 'motorcycle', 'truck', 'van']).map((raw) => {
                              const type = typeof raw === 'string' ? raw : raw.VehicleTypeID
                              return (
                              <button
                                key={type}
                                type="button"
                                className={`new-entry-vehicle-option ${
                                  gate1NewEntry.vehicleType === type ? 'active' : ''
                                }`}
                                onClick={() =>
                                  setGate1NewEntry((prev) => ({ ...prev, vehicleType: type }))
                                }
                              >
                                {vehicleTypeDisplayLabel(type)}
                              </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="new-entry-actions">
                    <button
                      className="new-entry-cancel"
                      type="button"
                      onClick={() => handleCancelNewEntry(1)}
                    >
                      Cancel
                    </button>
                    <button className="new-entry-submit" type="button" onClick={() => handleAddEntry(1)}>
                      Add Entry
                    </button>
                  </div>
                </div>
              ) : isGateIdle(gate1Mode, gate1Data) ? (
                <div className="gate-empty-state">
                  <div className="gate-empty-icon">
                    <img src={noVehicleIcon} alt="" />
                  </div>
                  <p className="gate-empty-title">No vehicle at Gate 1</p>
                  <p className="gate-empty-subtitle">Click below to add a new entry</p>
                  <button className="new-entry-btn" onClick={() => handleNewEntry(1)}>
                    <img src={newEntryIcon} alt="" />
                    <span>New Entry</span>
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

                  {/* Vehicle Info Grid - 3 rows x 2 columns (6 cards) */}
                  <div className="info-grid">
                    {/* Row 1: Card ID & Vehicle Type */}
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

                    {/* Row 2: Plate Queried & Plate Input */}
                    <div className="info-card">
                      <p className="info-card-label">Plate Queried</p>
                      <p className="info-card-value-text plate-text">{gate1Data.plateQueried}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Plate Input</p>
                      <p className="info-card-value-text plate-text">{gate1Data.plateInput}</p>
                    </div>

                    {/* Row 3: Entry Time & Customer */}
                    <div className="info-card">
                      <p className="info-card-label">Entry Time</p>
                      <p className="info-card-value-text entry-time-text">{gate1Data.entryTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Customer</p>
                      <p className="info-card-value-text">{gate1Data.customer}</p>
                    </div>

                    {activeTab === 'exit' && (
                      <>
                        <div className="info-card">
                          <p className="info-card-label">Exit Time</p>
                          <p className="info-card-value-text pending-text">{gate1Data.exitTime}</p>
                        </div>

                        <div className="info-card">
                          <p className="info-card-label">Price</p>
                          <p className="info-card-value-text">{gate1Data.price}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Process Button */}
                  <button className="process-btn" onClick={() => handleProcessEntry(1)}>
                    <img src={checkIcon} alt="" />
                    <span>Process {activeTab === 'entry' ? 'Entry' : 'Exit'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gate 2 */}
          <div className="gate-panel">
            <div className="gate-header gate-2-header">
              <h2 className="gate-title">Gate 2 - {activeTab === 'entry' ? 'Entry' : 'Exit'}</h2>
            </div>

            <div className="gate-content">
              {isGateNewEntry(gate2Mode) ? (
                <div className="new-entry-form">
                  <div className="new-entry-field">
                    <label className="new-entry-label">Card ID</label>
                    <input
                      className="new-entry-input"
                      inputMode="text"
                      placeholder="e.g., CARD-12345"
                      value={gate2NewEntry.cardId}
                      onChange={(e) => {
                        setGate2HasQueried(false);
                        setGate2NewEntry((prev) => ({
                          ...prev,
                          cardId: e.target.value
                        }));
                      }}
                    />
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <input
                      className="new-entry-input new-entry-input-plate"
                      inputMode="text"
                      placeholder="e.g., ABC-1234"
                      value={gate2NewEntry.licensePlate}
                      onChange={(e) => {
                        setGate2HasQueried(false);
                        setGate2NewEntry((prev) => ({
                          ...prev,
                          licensePlate: e.target.value
                        }));
                      }}
                    />
                  </div>

                  <button className="new-entry-query" type="button" onClick={() => handleQueryPlate(2)}>
                    <img src={queryIcon} alt="" />
                    <span>Query</span>
                  </button>

                  {gate2Error && <p className="new-entry-error">{gate2Error}</p>}

                  {gate2HasQueried && (
                    <>
                      <div className="new-entry-field">
                        <label className="new-entry-label">Queried Plate</label>
                        <input
                          className={`new-entry-input new-entry-input-plate ${gate2NewEntry.queriedPlateMismatch ? 'new-entry-input-mismatch' : ''}`}
                          inputMode="text"
                          placeholder="--"
                          value={(gate2NewEntry.queriedPlate || '').toUpperCase()}
                          readOnly
                        />
                      </div>

                      {(gate2NewEntry.queriedPlateMode || 'INSTANT') !== 'INSTANT' && (gate2NewEntry.cardId || '').trim() ? (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-auto">
                            <p className="new-entry-vehicle-value">
                              {vehicleTypeDisplayLabel(gate2NewEntry.vehicleType) || '—'}
                            </p>
                            {gate2NewEntry.vehicleType && (
                              <p className="new-entry-vehicle-hint">Auto-selected from subscription</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-grid" role="group" aria-label="Vehicle Type">
                            {(vehicleTypes?.length ? vehicleTypes : ['car', 'motorcycle', 'truck', 'van']).map((raw) => {
                              const type = typeof raw === 'string' ? raw : raw.VehicleTypeID
                              return (
                              <button
                                key={type}
                                type="button"
                                className={`new-entry-vehicle-option ${
                                  gate2NewEntry.vehicleType === type ? 'active' : ''
                                }`}
                                onClick={() =>
                                  setGate2NewEntry((prev) => ({ ...prev, vehicleType: type }))
                                }
                              >
                                {vehicleTypeDisplayLabel(type)}
                              </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="new-entry-actions">
                    <button
                      className="new-entry-cancel"
                      type="button"
                      onClick={() => handleCancelNewEntry(2)}
                    >
                      Cancel
                    </button>
                    <button className="new-entry-submit" type="button" onClick={() => handleAddEntry(2)}>
                      Add Entry
                    </button>
                  </div>
                </div>
              ) : isGateIdle(gate2Mode, gate2Data) ? (
                <div className="gate-empty-state">
                  <div className="gate-empty-icon">
                    <img src={noVehicleIcon} alt="" />
                  </div>
                  <p className="gate-empty-title">No vehicle at Gate 2</p>
                  <p className="gate-empty-subtitle">Click below to add a new entry</p>
                  <button className="new-entry-btn" onClick={() => handleNewEntry(2)}>
                    <img src={newEntryIcon} alt="" />
                    <span>New Entry</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* License Plate Section */}
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

                  {/* Vehicle Info Grid - 3 rows x 2 columns (6 cards) */}
                  <div className="info-grid">
                    {/* Row 1: Card ID & Vehicle Type */}
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

                    {/* Row 2: Plate Queried & Plate Input */}
                    <div className="info-card">
                      <p className="info-card-label">Plate Queried</p>
                      <p
                        className={`info-card-value-text ${
                          gate2Data.plateQueried === 'Instant' ? 'instant-text' : 'plate-text'
                        }`}
                      >
                        {gate2Data.plateQueried}
                      </p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Plate Input</p>
                      <p className="info-card-value-text plate-text">{gate2Data.plateInput}</p>
                    </div>

                    {/* Row 3: Entry Time & Customer */}
                    <div className="info-card">
                      <p className="info-card-label">Entry Time</p>
                      <p className="info-card-value-text entry-time-text">{gate2Data.entryTime}</p>
                    </div>

                    <div className="info-card">
                      <p className="info-card-label">Customer</p>
                      <p className="info-card-value-text">{gate2Data.customer}</p>
                    </div>

                    {activeTab === 'exit' && (
                      <>
                        <div className="info-card">
                          <p className="info-card-label">Exit Time</p>
                          <p className="info-card-value-text pending-text">{gate2Data.exitTime}</p>
                        </div>

                        <div className="info-card">
                          <p className="info-card-label">Price</p>
                          <p className="info-card-value-text">{gate2Data.price}</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Process Button */}
                  <button className="process-btn" onClick={() => handleProcessEntry(2)}>
                    <img src={checkIcon} alt="" />
                    <span>Process {activeTab === 'entry' ? 'Entry' : 'Exit'}</span>
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
        gateType={activeTab}
      />
    </div>
  );
};

export default StaffGatePage;
