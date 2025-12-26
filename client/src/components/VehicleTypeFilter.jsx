import '../styles/components/VehicleTypeFilter.css';

export default function VehicleTypeFilter({ value, onChange }) {
  return (
    <div className="vehicle-type-filter">
      <label className="filter-label">Type:</label>
      <select 
        className="filter-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="All Types">All Types</option>
        <option value="Car">Car</option>
        <option value="Motorcycle">Motorcycle</option>
        <option value="Truck">Truck</option>
        <option value="Van">Van</option>
      </select>
    </div>
  );
}
