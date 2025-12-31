import '../styles/components/FormHeader.css';

import adminIcon from '../assets/admin-icon.svg';

export default function FormHeader({ 
  title = 'Login', 
  subtitle = 'Enter your credentials',
  iconSrc = adminIcon
}) {
  return (
    <div className="form-header">
      <div className="form-icon">
        <img 
          src={iconSrc} 
          alt="Login Icon"
        />
      </div>
      <h2 className="form-title">{title}</h2>
      <p className="form-subtitle">{subtitle}</p>
    </div>
  );
}
