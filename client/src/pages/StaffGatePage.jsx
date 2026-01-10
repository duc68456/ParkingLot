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
  const { user, logout, getStaffGateType } = useAuth();
  const [activeTab, setActiveTab] = useState('entry');
  const [showShiftReport, setShowShiftReport] = useState(false);

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
    vehicleType: ''
  });
  const [gate2NewEntry, setGate2NewEntry] = useState({
    cardId: '',
    licensePlate: '',
    queriedPlate: '',
    vehicleType: ''
  });

  // Mock data for gates - Enhanced with license plates and more fields
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
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('newEntry');
      setGate2HasQueried(false);
    }
  };

  const handleCancelNewEntry = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('idle');
      setGate1HasQueried(false);
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('idle');
      setGate2HasQueried(false);
    }
  };

  const handleQueryPlate = (gateNumber) => {
    // Mock behavior per requirements:
    // - non-round ticket: fills Vehicle Type + Queried Plate
    // - round ticket: Queried Plate mirrors License Plate, Vehicle Type is user-chosen
    //
    // Assumption for now (until ticket type exists in the model):
    // treat entries with a Card ID as "non-round" (subscription/card scan);
    // treat empty Card ID as "round" (single ticket).
    const getTypeFromPlate = (plate) => {
      const p = (plate || '').toUpperCase();
      if (!p) return '';
      if (p.includes('VAN')) return 'van';
      if (p.includes('TRK') || p.includes('TRUCK')) return 'truck';
      if (p.includes('MOTO') || p.includes('MC')) return 'motorcycle';
      return 'van';
    };

    if (gateNumber === 1) {
      const plate = (gate1NewEntry.licensePlate || '').trim().toUpperCase();
      const cardId = (gate1NewEntry.cardId || '').trim();
      const isNonRound = Boolean(cardId);

      setGate1HasQueried(true);

      if (isNonRound) {
        setGate1NewEntry((prev) => ({
          ...prev,
          queriedPlate: plate,
          vehicleType: prev.vehicleType || getTypeFromPlate(plate) || 'van'
        }));
      } else {
        setGate1NewEntry((prev) => ({
          ...prev,
          queriedPlate: plate
        }));
      }
      return;
    }

    if (gateNumber === 2) {
      const plate = (gate2NewEntry.licensePlate || '').trim().toUpperCase();
      const cardId = (gate2NewEntry.cardId || '').trim();
      const isNonRound = Boolean(cardId);

      setGate2HasQueried(true);

      if (isNonRound) {
        setGate2NewEntry((prev) => ({
          ...prev,
          queriedPlate: plate,
          vehicleType: prev.vehicleType || getTypeFromPlate(plate) || 'van'
        }));
      } else {
        setGate2NewEntry((prev) => ({
          ...prev,
          queriedPlate: plate
        }));
      }
    }
  };

  const handleAddEntry = (gateNumber) => {
    console.log(`Add entry for Gate ${gateNumber}`);

    if (gateNumber === 1) {
      const nextPlate = (gate1NewEntry.licensePlate || '').trim().toUpperCase();
      const nextCardId = (gate1NewEntry.cardId || '').trim();
      const nextVehicleType = (gate1NewEntry.vehicleType || '').trim().toLowerCase();
      const nextQueriedPlate = (gate1NewEntry.queriedPlate || '').trim().toUpperCase();

      const isNonRound = Boolean(nextCardId);

      setGate1Data((prev) => ({
        ...prev,
        hasVehicle: true,
        cardId: nextCardId || prev.cardId,
        vehicleType: isNonRound ? (nextVehicleType || prev.vehicleType || 'van') : (nextVehicleType || prev.vehicleType || 'car'),
        licensePlate: nextPlate || prev.licensePlate || 'ABC-1234',
        plateInput: nextPlate || prev.plateInput || 'ABC-1234',
        plateQueried: nextQueriedPlate || prev.plateQueried || nextPlate || 'Instant'
      }));
      setGate1Mode('processing');
      setGate1HasQueried(false);
      return;
    }

    if (gateNumber === 2) {
      const nextPlate = (gate2NewEntry.licensePlate || '').trim().toUpperCase();
      const nextCardId = (gate2NewEntry.cardId || '').trim();
      const nextVehicleType = (gate2NewEntry.vehicleType || '').trim().toLowerCase();
      const nextQueriedPlate = (gate2NewEntry.queriedPlate || '').trim().toUpperCase();

      const isNonRound = Boolean(nextCardId);

      setGate2Data((prev) => ({
        ...prev,
        hasVehicle: true,
        cardId: nextCardId || prev.cardId,
        vehicleType: isNonRound ? (nextVehicleType || prev.vehicleType || 'van') : (nextVehicleType || prev.vehicleType || 'car'),
        licensePlate: nextPlate || prev.licensePlate || 'XYZ-5678',
        plateInput: nextPlate || prev.plateInput || 'XYZ-5678',
        plateQueried: nextQueriedPlate || prev.plateQueried || nextPlate || 'Instant'
      }));
      setGate2Mode('processing');
      setGate2HasQueried(false);
    }
  };

  const vehicleTypeDisplayLabel = (type) => {
    if (!type) return '';
    return type.charAt(0).toUpperCase() + type.slice(1);
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

                  {gate1HasQueried && (
                    <>
                      <div className="new-entry-field">
                        <label className="new-entry-label">Queried Plate</label>
                        <input
                          className="new-entry-input new-entry-input-plate"
                          inputMode="text"
                          placeholder="--"
                          value={(gate1NewEntry.queriedPlate || '').toUpperCase()}
                          readOnly
                        />
                      </div>

                      {(gate1NewEntry.cardId || '').trim() ? (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-auto">
                            <p className="new-entry-vehicle-value">
                              {vehicleTypeDisplayLabel(gate1NewEntry.vehicleType) || 'Van'}
                            </p>
                            <p className="new-entry-vehicle-hint">Auto-selected from database</p>
                          </div>
                        </div>
                      ) : (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-grid" role="group" aria-label="Vehicle Type">
                            {['car', 'motorcycle', 'truck', 'van'].map((type) => (
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
                            ))}
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

                  {gate2HasQueried && (
                    <>
                      <div className="new-entry-field">
                        <label className="new-entry-label">Queried Plate</label>
                        <input
                          className="new-entry-input new-entry-input-plate"
                          inputMode="text"
                          placeholder="--"
                          value={(gate2NewEntry.queriedPlate || '').toUpperCase()}
                          readOnly
                        />
                      </div>

                      {(gate2NewEntry.cardId || '').trim() ? (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-auto">
                            <p className="new-entry-vehicle-value">
                              {vehicleTypeDisplayLabel(gate2NewEntry.vehicleType) || 'Van'}
                            </p>
                            <p className="new-entry-vehicle-hint">Auto-selected from database</p>
                          </div>
                        </div>
                      ) : (
                        <div className="new-entry-field">
                          <label className="new-entry-label">Vehicle Type</label>
                          <div className="new-entry-vehicle-grid" role="group" aria-label="Vehicle Type">
                            {['car', 'motorcycle', 'truck', 'van'].map((type) => (
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
                            ))}
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
