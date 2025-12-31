import '../styles/components/Header.css';

import companyLogo from '../assets/company-logo.svg';

export default function Header() {
  return (
    <div className="header">
      <div className="header-icon">
        <img 
          src={companyLogo} 
          alt="Company Logo"
        />
      </div>
      <h1 className="header-title">Company Portal</h1>
      <p className="header-subtitle">Secure Access System</p>
    </div>
  );
}
