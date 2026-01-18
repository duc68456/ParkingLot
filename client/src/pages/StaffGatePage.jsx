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
const entryIcon = entryIconSvg;
const exitIcon = exitIconSvg;
const logoutIcon = exitIconSvg; // Reuse exit icon for logout
const reportIcon = reportIconSvg;
const carIcon = carIconSvg;
const motorcycleIcon = motorcycleIconSvg;
const bikeIcon = motorcycleIconSvg; // Reuse motorcycle for bike
const vanIcon = vanIconSvg;
const carLargeIcon = carLargeIconSvg;
const motorcycleLargeIcon = motorcycleLargeIconSvg;
const checkIcon = checkIconSvg;
const noVehicleIcon = carIconSvg; // Placeholder
const newEntryIcon = entryIconSvg; // Reuse entry icon
const queryIcon = queryIconSvg;

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
  const [creatingVisitorCard, setCreatingVisitorCard] = useState({ gate1: false, gate2: false })

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

  // Fetch card categories for visitor card creation
  useEffect(() => {
    let cancelled = false

    const fetchCategories = async () => {
      if (!token) return

      try {
        const res = await fetch(`${API_BASE_URL}/api/card-categories?limit=100`, {
          headers: { ...authHeaders() }
        })

        const json = await res.json().catch(() => null)

        console.log('Card categories API response:', {
          ok: res.ok,
          status: res.status,
          json
        })

        if (!res.ok) {
          throw new Error(json?.error?.message || 'Failed to load card categories')
        }

        const list = json?.data?.cardCategories || []
        console.log('Parsed card categories list:', list)

        if (!cancelled) {
          setCardCategories(list)
          console.log('Card categories set to state:', list.length, 'items')
        }
      } catch (e) {
        console.error('Failed to fetch card categories:', e)
      }
    }

    fetchCategories()
    return () => {
      cancelled = true
    }
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

  // Camera & LP Recognition states for Gate 1
  const [gate1ShowCamera, setGate1ShowCamera] = useState(false);
  const [gate1CapturedImage, setGate1CapturedImage] = useState(null);
  const [gate1CroppedImage, setGate1CroppedImage] = useState(null); // Cropped LP image for display
  const [gate1Recognition, setGate1Recognition] = useState(null);
  const [gate1RecognitionError, setGate1RecognitionError] = useState(null);

  // Camera & LP Recognition states for Gate 2
  const [gate2ShowCamera, setGate2ShowCamera] = useState(false);
  const [gate2CapturedImage, setGate2CapturedImage] = useState(null);
  const [gate2CroppedImage, setGate2CroppedImage] = useState(null); // Cropped LP image for display
  const [gate2Recognition, setGate2Recognition] = useState(null);
  const [gate2RecognitionError, setGate2RecognitionError] = useState(null);

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
    // Customer name comes from Card.OwnerID (Person) - null for visitors
    const customer = session?.CardID?.OwnerID?.FullName || ''

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

  /* 
   * Removed auto-fetch of "latest active session" to prevent sticky state on refresh/re-login.
   * Entry gate should start fresh.
   */
  useEffect(() => {
    // Reset gates to idle on mount/token change
    if (token) {
      setGate1Mode('idle')
      setGate1Data(sessionToGateData(1, null))
      setGate2Mode('idle')
      setGate2Data(sessionToGateData(2, null))
    }
  }, [token])

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
    // Refresh every 30 seconds
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

  // Best-effort: if the staff closes/reloads the page unexpectedly,
  // treat it like logout so the active shift is completed on the server.
  useEffect(() => {
    if (!token) return

    let didSend = false

    const sendLogout = () => {
      if (didSend) return
      didSend = true

      try {
        const safeToken = encodeURIComponent(String(token || ''))
        const url = `${API_BASE_URL}/api/staff-accounts/logout-beacon?token=${safeToken}`

        // Primary attempt: keepalive fetch.
        fetch(url, {
          method: 'POST',
          keepalive: true
        }).catch(() => { })

        // Secondary attempt: Beacon API.
        try {
          if (navigator?.sendBeacon) {
            const blob = new Blob([], { type: 'application/json' })
            navigator.sendBeacon(url, blob)
          }
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }

    const handlePageHide = () => sendLogout()
    const handleBeforeUnload = () => sendLogout()

    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
      setGate1NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      // Reset camera/recognition states
      setGate1CapturedImage(null);
      setGate1CroppedImage(null);
      setGate1Recognition(null);
      setGate1RecognitionError(null);
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('newEntry');
      setGate2HasQueried(false);
      setGate2NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      // Reset camera/recognition states
      setGate2CapturedImage(null);
      setGate2CroppedImage(null);
      setGate2Recognition(null);
      setGate2RecognitionError(null);
    }
  };

  const handleCancelNewEntry = (gateNumber) => {
    if (gateNumber === 1) {
      setGate1Mode('idle');
      setGate1HasQueried(false);
      setGate1NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      // Reset camera/recognition states
      setGate1CapturedImage(null);
      setGate1CroppedImage(null);
      setGate1Recognition(null);
      setGate1RecognitionError(null);
      return;
    }
    if (gateNumber === 2) {
      setGate2Mode('idle');
      setGate2HasQueried(false);
      setGate2NewEntry({ cardId: '', licensePlate: '', queriedPlate: '', vehicleType: '', queriedPlateMismatch: false, queriedPlateMode: 'INSTANT' });
      // Reset camera/recognition states
      setGate2CapturedImage(null);
      setGate2CroppedImage(null);
      setGate2Recognition(null);
      setGate2RecognitionError(null);
    }
  };

  const handleQueryPlate = async (gateNumber) => {
    const gateState = gateNumber === 1 ? gate1NewEntry : gate2NewEntry
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error
    const setHasQueried = gateNumber === 1 ? setGate1HasQueried : setGate2HasQueried
    const setNewEntry = gateNumber === 1 ? setGate1NewEntry : setGate2NewEntry

    let cardId = (gateState.cardId || '').trim()
    const licensePlate = (gateState.licensePlate || '').trim().toUpperCase()

    setErr('')
    setBusy(true)

    try {
      // If no cardId is provided, create a visitor card first (simulating card scan)
      if (!cardId) {
        const createRes = await fetch(`${API_BASE_URL}/api/staff-gate/create-visitor-card`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders()
          }
        })

        const createJson = await createRes.json().catch(() => null)
        if (!createRes.ok) {
          throw new Error(createJson?.error?.message || 'Failed to create visitor card')
        }

        const createdCard = createJson?.data
        cardId = createdCard?.CardID || createdCard?.ID || createdCard?.id

        console.log('Visitor card created during scan simulation:', cardId)

        // Update form with the new card ID
        setNewEntry((prev) => ({ ...prev, cardId }))
      }

      // Proceed with query
      const res = await fetch(`${API_BASE_URL}/api/entry-sessions/gate/query?cardId=${encodeURIComponent(cardId)}&licensePlate=${encodeURIComponent(licensePlate)}`, {
        headers: {
          ...authHeaders()
        }
      })

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
        cardId, // Ensure cardId is updated in case it was created
        queriedPlate: normalizedQueriedPlate,
        queriedPlateMismatch: mismatch,
        queriedPlateMode: gate?.queriedPlateMode || (normalizedQueriedPlate === 'INSTANT' ? 'INSTANT' : prev.queriedPlateMode),
        // Only set vehicleType from subscription when provided.
        vehicleType: subscriptionVehicleTypeId || prev.vehicleType
      }))
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
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
    const setNewEntry = gateNumber === 1 ? setGate1NewEntry : setGate2NewEntry;
    const setBusy = gateNumber === 1 ? setGate1Busy : setGate2Busy;
    const setErr = gateNumber === 1 ? setGate1Error : setGate2Error;

    setShowCamera(false);
    setCapturedImage(imageData);

    // Call recognition API
    try {
      setBusy(true);
      setErr('');

      // Compress image before sending
      const compressedImage = await compressImage(imageData, 1024, 0.75);

      const response = await recognizePlateOnly({ imageBase64: compressedImage }, token);

      if (response.success) {
        setRecognition(response.recognition);
        setRecognitionError(null);

        // Store cropped image for display
        const croppedImg = response.recognition?.croppedImage || null;
        setCroppedImage(croppedImg);

        // Auto-fill license plate
        if (response.recognition?.licensePlate) {
          setNewEntry((prev) => ({
            ...prev,
            licensePlate: response.recognition.licensePlate
          }));
        }

        console.log(`Gate ${gateNumber} recognition success:`, response.recognition);
      } else {
        setRecognitionError(response.error || 'Recognition failed');
        setErr(response.error || 'Không thể nhận diện biển số');
      }
    } catch (err) {
      console.error(`Gate ${gateNumber} recognition error:`, err);
      setRecognitionError(err.message);
      setErr(err.message || 'Lỗi nhận diện biển số');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateVisitorCard = async (gateNumber) => {
    const isGate1 = gateNumber === 1
    const setError = isGate1 ? setGate1Error : setGate2Error

    setCreatingVisitorCard(prev => ({ ...prev, [`gate${gateNumber}`]: true }))
    setError('')

    try {
      // Use dedicated staff-gate endpoint for creating visitor cards
      const createRes = await fetch(`${API_BASE_URL}/api/staff-gate/create-visitor-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        }
      })

      const createJson = await createRes.json().catch(() => null)
      if (!createRes.ok) {
        throw new Error(createJson?.error?.message || 'Failed to create visitor card')
      }

      const createdCard = createJson?.data
      const cardId = createdCard?.CardID || createdCard?.ID || createdCard?.id

      console.log('Visitor card created:', cardId)

      // Auto-fill the card ID in the form
      if (isGate1) {
        setGate1NewEntry(prev => ({ ...prev, cardId }))
      } else {
        setGate2NewEntry(prev => ({ ...prev, cardId }))
      }

      setError('')
    } catch (err) {
      console.error('Failed to create visitor card:', err)
      setError(err?.message || 'Failed to create visitor card')
    } finally {
      setCreatingVisitorCard(prev => ({ ...prev, [`gate${gateNumber}`]: false }))
    }
  }

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

        // Handle active session warning - ask for confirmation
        if (json?.warning === true && json?.code === 'ACTIVE_SESSION_EXISTS') {
          const existingSession = json?.existingSession
          const originalTime = existingSession?.EntryTime
            ? new Date(existingSession.EntryTime).toLocaleString()
            : 'unknown'

          const confirmMsg = `⚠️ WARNING: This card already has an active parking session.\n\n` +
            `Session ID: ${existingSession?.ID || 'N/A'}\n` +
            `Original Entry Time: ${originalTime}\n\n` +
            `Do you want to update the entry time to NOW?\n` +
            `(This will reset the parking duration and log a warning)`

          if (window.confirm(confirmMsg)) {
            // Call confirm-reentry endpoint
            setBusy(true)
            fetch(`${API_BASE_URL}/api/entry-sessions/gate/entry/confirm-reentry`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...authHeaders()
              },
              body: JSON.stringify({
                SessionID: existingSession?.ID,
                CardID,
                GateNumber: gateNumber,
                LicensePlate,
                ProcessedEntryBy: staffEmployeeId
              })
            })
              .then(async (reentryRes) => {
                const reentryJson = await reentryRes.json().catch(() => null)
                if (!reentryRes.ok) {
                  throw new Error(reentryJson?.error?.message || 'Failed to confirm re-entry')
                }

                const session = reentryJson?.data?.session
                const displayPlate = (session?.LicensePlate || LicensePlate || '').toUpperCase()

                setData((prev) => ({
                  ...prev,
                  hasVehicle: true,
                  cardId: CardID,
                  vehicleType: vehicleTypeDisplayLabel(VehicleTypeID) || VehicleTypeID,
                  licensePlate: displayPlate,
                  plateInput: LicensePlate,
                  plateQueried: 'Re-entry',
                  entryTime: session?.EntryTime ? new Date(session.EntryTime).toLocaleTimeString() : prev.entryTime,
                  customer: session?.CardID?.OwnerID?.FullName || 'Guest'
                }))
                setMode('processing')
                setHasQueried(false)
                window.alert('Re-entry confirmed. Entry time has been updated. Warning logged.')
              })
              .catch((e) => {
                setErr(e.message)
              })
              .finally(() => {
                setBusy(false)
              })
          } else {
            // User cancelled - do nothing
            setErr('Re-entry cancelled by user')
          }
          return
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

        // Extract customer name from Card.OwnerID (null for visitors)
        const customerName = session?.CardID?.OwnerID?.FullName || ''

        setData((prev) => ({
          ...prev,
          hasVehicle: true,
          cardId: CardID,
          vehicleType: vehicleTypeDisplayLabel(VehicleTypeID) || VehicleTypeID,
          licensePlate: displayPlate,
          plateInput: LicensePlate,
          plateQueried: plateQueriedValue,
          entryTime: session?.EntryTime ? new Date(session.EntryTime).toLocaleTimeString() : prev.entryTime,
          customer: customerName
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

  const handleViewShiftReport = async () => {
    await fetchShiftReport()
    setShowShiftReport(true)
  };

  const handleLogout = () => {
    ; (async () => {
      try {
        // Best-effort: tell server to end the current shift before clearing auth.
        // Even if it fails, we still logout locally.
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

              {/* Vehicle Stats - Dynamic from API */}
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
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
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
                      <button
                        type="button"
                        className="capture-plate-btn"
                        onClick={() => {
                          // Clear cardId and show hint that Query will create visitor card
                          setGate1NewEntry(prev => ({ ...prev, cardId: '' }))
                          setGate1Error('Click "Query" to simulate card scan and create visitor card')
                        }}
                        disabled={creatingVisitorCard.gate1 || gate1Busy}
                        title="Clear card ID - Query will create visitor card"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Visitor Card
                      </button>
                    </div>
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <div className="new-entry-plate-wrapper">
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
                        alt="Biển số đã nhận diện"
                        className="lp-preview-image"
                      />
                    </div>
                  )}

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
                                  className={`new-entry-vehicle-option ${gate1NewEntry.vehicleType === type ? 'active' : ''
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
                    <div className="new-entry-plate-wrapper">
                      <input
                        className="new-entry-input new-entry-input-plate"
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
                      <button
                        type="button"
                        className="capture-plate-btn"
                        onClick={() => {
                          // Clear cardId and show hint that Query will create visitor card
                          setGate2NewEntry(prev => ({ ...prev, cardId: '' }))
                          setGate2Error('Click "Query" to simulate card scan and create visitor card')
                        }}
                        disabled={creatingVisitorCard.gate2 || gate2Busy}
                        title="Clear card ID - Query will create visitor card"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Visitor Card
                      </button>
                    </div>
                  </div>

                  <div className="new-entry-field">
                    <label className="new-entry-label">License Plate</label>
                    <div className="new-entry-plate-wrapper">
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

                  {/* Cropped LP Image Preview - Gate 2 */}
                  {gate2CroppedImage && (
                    <div className="lp-preview-container">
                      <img
                        src={gate2CroppedImage}
                        alt="Biển số đã nhận diện"
                        className="lp-preview-image"
                      />
                    </div>
                  )}

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
                                  className={`new-entry-vehicle-option ${gate2NewEntry.vehicleType === type ? 'active' : ''
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
                        className={`info-card-value-text ${gate2Data.plateQueried === 'Instant' ? 'instant-text' : 'plate-text'
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
        report={shiftReportData}
      />

      {/* Webcam Modals */}
      <WebcamCapture
        isOpen={gate1ShowCamera}
        onClose={() => setGate1ShowCamera(false)}
        onCapture={(imageData) => handleCaptureComplete(1, imageData)}
        title={`Capture ${activeTab === 'entry' ? 'Entry' : 'Exit'} License Plate - Gate 1`}
        mode={activeTab}
      />

      <WebcamCapture
        isOpen={gate2ShowCamera}
        onClose={() => setGate2ShowCamera(false)}
        onCapture={(imageData) => handleCaptureComplete(2, imageData)}
        title={`Capture ${activeTab === 'entry' ? 'Entry' : 'Exit'} License Plate - Gate 2`}
        mode={activeTab}
      />
    </div>
  );
};

export default StaffGatePage;
