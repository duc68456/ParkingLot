import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormHeader from '../components/FormHeader';
import PinInput from '../components/PinInput';
import Button from '../components/Button';
import '../styles/pages/StaffLoginForm.css';

const staffIcon = "http://localhost:3845/assets/fd1d48cb3a7b000f034556812f92351cbb70d0bc.svg";

export default function StaffLoginForm({ type }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const isPinComplete = pin.every(digit => digit !== '');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    const pinCode = pin.join('');
    console.log('Staff login submitted:', { type, pinCode });
    
    // Simulate login with staff type
    login({
      name: 'Staff Member',
      email: 'staff@parkingpro.com',
      initials: 'SM',
      id: '#000',
      type: 'staff'
    }, 'staff'); // Pass 'staff' as the user type
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
