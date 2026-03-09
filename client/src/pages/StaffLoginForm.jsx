import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormHeader from '../components/FormHeader';
import PinInput from '../components/PinInput';
import Button from '../components/Button';
import '../styles/pages/StaffLoginForm.css';

import staffIcon from '../assets/staff-icon.svg';

// Import real icons from assets
import entryGateIcon from '../assets/icons/dashboard/activity-entry.svg';
import exitGateIcon from '../assets/icons/dashboard/activity-exit.svg';
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE_URL = getApiBaseUrl()

export default function StaffLoginForm({ type }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const isPinComplete = pin.every(digit => digit !== '');
  const { login, setStaffGateType } = useAuth();

  const [gateType, setGateType] = useState('entry');

  const handleSubmit = (e) => {
    e.preventDefault();
    const pinCode = pin.join('');

    ; (async () => {
      try {
        // Staff verify endpoint supports PIN-only login
        const res = await fetch(`${API_BASE_URL}/api/staff-accounts/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            PINCode: pinCode,
            Gate: gateType
          })
        })

        const json = await res.json()
        if (!res.ok) {
          const msg = json?.error?.message || `Login failed (${res.status})`
          throw new Error(msg)
        }

        const data = json?.data
        const token = data?.token

        const fullName = data?.FullName || 'Staff'
        const initials = fullName
          ? fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join('')
          : 'ST'

        // Persist selected gate type so staff view can default to it.
        setStaffGateType(gateType);

        login(
          {
            name: fullName,
            email: 'staff',
            initials,
            id: data?.ID, // This is STA...
            employeeId: data?.EmployeeID, // This is EMP... (Fix: direct access)
            employeeMongoId: null, // Not needed or not available
            personId: data?.PersonID, // Added for reference
            type: 'staff'
          },
          'staff',
          token
        )
      } catch (err) {
        console.error('Staff login error:', err)
        window.alert(err?.message || 'Failed to login')
      }
    })()
  };

  return (
    <div className="staff-login-form">
      <FormHeader
        title="Login"
        subtitle="Enter your 6-digit PIN code"
        iconSrc={staffIcon}
      />
      <form onSubmit={handleSubmit} className="staff-form-content">
        <PinInput
          length={6}
          value={pin}
          onChange={setPin}
        />

        <div className="staff-gate-type">
          <p className="staff-gate-type-label">Select Gate Type</p>
          <div className="staff-gate-type-grid" role="group" aria-label="Select Gate Type">
            <button
              type="button"
              className={`staff-gate-type-option ${gateType === 'entry' ? 'active' : ''}`}
              onClick={() => setGateType('entry')}
            >
              <img src={entryGateIcon} alt="" />
              <span>Entry Gate</span>
            </button>
            <button
              type="button"
              className={`staff-gate-type-option ${gateType === 'exit' ? 'active' : ''}`}
              onClick={() => setGateType('exit')}
            >
              <img src={exitGateIcon} alt="" />
              <span>Exit Gate</span>
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!isPinComplete}
          variant={isPinComplete ? 'primary' : 'disabled'}
        >
          Login
        </Button>
        <p className="staff-note">For staff members only</p>
      </form>
    </div>
  );
}
