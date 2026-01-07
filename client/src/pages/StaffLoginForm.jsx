import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormHeader from '../components/FormHeader';
import PinInput from '../components/PinInput';
import Button from '../components/Button';
import '../styles/pages/StaffLoginForm.css';

import staffIcon from '../assets/staff-icon.svg';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function StaffLoginForm({ type }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const isPinComplete = pin.every(digit => digit !== '');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    const pinCode = pin.join('');

    ;(async () => {
      try {
        // Staff verify endpoint requires EmployeeID + PINCode
        // We accept EmployeeID as the 6-digit entered PIN for now if your UI hasn't collected EmployeeID yet.
        // If your backend expects a real EmployeeID, we can extend the UI to ask for it.
        const res = await fetch(`${API_BASE_URL}/api/staff-accounts/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            EmployeeID: pinCode,
            PINCode: pinCode
          })
        })

        const json = await res.json()
        if (!res.ok) {
          const msg = json?.error?.message || `Login failed (${res.status})`
          throw new Error(msg)
        }

        const data = json?.data
        const token = data?.token

        const fullName = data?.EmployeeID?.PersonID?.FullName || 'Staff'
        const initials = fullName
          ? fullName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0]?.toUpperCase())
              .join('')
          : 'ST'

        login(
          {
            name: fullName,
            email: 'staff',
            initials,
            id: data?.ID,
            employeeId: data?.EmployeeID?.ID,
            employeeMongoId: data?.EmployeeID?.id,
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
