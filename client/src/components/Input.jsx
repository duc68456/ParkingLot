import '../styles/components/Input.css';

export default function Input({ label, type, placeholder, value, onChange }) {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <input
        type={type}
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
