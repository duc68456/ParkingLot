import { useState } from 'react';
import '../styles/components/VehiclesTable.css';

const carIcon = "/assets/451b0bfafe1bd8b45066c5669f5ee7eb4a897814.svg";
const motorcycleIcon = "/assets/bfa7ae87c1c00827dc55252c29f9b7e463310eac.svg";
const viewIcon = "/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg";
const editIcon = "/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg";
const deleteIcon = "/assets/1fdb1f29273b223332a28061a714a4354ee0c9ae.svg";

export default function VehiclesTable({ vehicles, onViewVehicle, onEditVehicle, onDeleteVehicle }) {
  const [currentPage, setCurrentPage] = useState(1);

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'status-pill status-pill--active'
      case 'inactive':
        return 'status-pill status-pill--inactive'
      default:
        return 'status-pill'
    }
  }

  const getStatusLabel = (vehicle) => ((vehicle?.IsActive ?? true) ? 'Active' : 'Inactive')

  const getVehicleIcon = (type) => {
    switch(type) {
      case 'Car':
      case 'Truck':
        return carIcon;
      case 'Motorcycle':
        return motorcycleIcon;
      default:
        return carIcon;
    }
  };

  return (
    <div className="vehicles-table-container">
      <div className="vehicles-table-wrapper">
        <table className="vehicles-table">
          <thead>
            <tr className="table-header-row">
              <th className="table-header-cell">ID</th>
              <th className="table-header-cell">VEHICLE</th>
              <th className="table-header-cell">TYPE</th>
              <th className="table-header-cell">COLOR</th>
              <th className="table-header-cell">STATUS</th>
              <th className="table-header-cell align-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="table-row">
                <td className="table-cell">{vehicle.id}</td>
                <td className="table-cell">
                  <div className="vehicle-info">
                    <div className="vehicle-icon-container">
                      <img src={getVehicleIcon(vehicle.type)} alt="" className="vehicle-icon" />
                    </div>
                    <div className="vehicle-details">
                      <div className="vehicle-plate">{vehicle.licensePlate}</div>
                      <div className="vehicle-type-label">{vehicle.type}</div>
                    </div>
                  </div>
                </td>
                <td className="table-cell">{vehicle.type}</td>
                <td className="table-cell">{vehicle.color || '—'}</td>
                <td className="table-cell">
                  {(() => {
                    const label = getStatusLabel(vehicle)
                    return (
                      <span className={getStatusBadgeClass(label)}>{label}</span>
                    )
                  })()}
                </td>
                <td className="table-cell align-right">
                  <div className="action-buttons">
                    <button 
                      className="action-btn" 
                      title="View"
                      onClick={() => onViewVehicle && onViewVehicle(vehicle)}
                    >
                      <img src={viewIcon} alt="View" />
                    </button>
                    <button 
                      className="action-btn" 
                      title="Edit"
                      onClick={() => onEditVehicle && onEditVehicle(vehicle)}
                    >
                      <img src={editIcon} alt="Edit" />
                    </button>
                    <button
                      className="action-btn"
                      title="Delete"
                      onClick={() => onDeleteVehicle && onDeleteVehicle(vehicle)}
                    >
                      <img src={deleteIcon} alt="Delete" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="table-footer-info">
          Showing <strong>{vehicles.length}</strong> results
        </div>
        <div className="table-pagination">
          <button 
            className="pagination-btn" 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button 
            className="pagination-btn" 
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
