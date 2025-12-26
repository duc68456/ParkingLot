import '../styles/components/SearchInput.css';

export default function SearchInput({ placeholder, value, onChange, icon, className = '' }) {
  return (
    <div className={`search-input-wrapper ${className}`}>
      {icon && <img src={icon} alt="" className="search-input-icon" />}
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
