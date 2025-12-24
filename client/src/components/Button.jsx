import './Button.css';

export default function Button({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false,
  variant = 'primary' 
}) {
  const className = variant === 'disabled' || disabled 
    ? 'primary-button disabled' 
    : 'primary-button';
    
  return (
    <button 
      type={type} 
      className={className} 
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
