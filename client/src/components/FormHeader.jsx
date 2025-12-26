import '../styles/components/FormHeader.css';

const adminIcon = "http://localhost:3845/assets/af824e0bea873c71370fc00e95f0408094a8778b.svg";

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
