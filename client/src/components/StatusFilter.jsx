import '../styles/components/StatusFilter.css';

export default function StatusFilter({ value, onChange, count }) {
  const options = ['All Status', 'Active', 'Inactive', 'Suspended'];

  return (
    <div className="status-filter">
      <label className="status-filter-label">Status:</label>
      <select 
        className="status-filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <span className="status-filter-count">{count}</span>
    </div>
  );
}
