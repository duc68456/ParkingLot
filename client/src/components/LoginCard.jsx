import { useState } from 'react';
import TabButtons from './TabButtons';
import LoginForm from '../pages/LoginForm';
import StaffLoginForm from '../pages/StaffLoginForm';
import '../styles/components/LoginCard.css';

export default function LoginCard() {
  const [activeTab, setActiveTab] = useState('staff');

  return (
    <div className="login-card">
      <TabButtons activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="login-card-content">
        {activeTab === 'staff' ? (
          <StaffLoginForm type={activeTab} />
        ) : (
          <LoginForm type={activeTab} />
        )}
      </div>
    </div>
  );
}
