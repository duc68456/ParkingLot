import { useState } from 'react';
import '../styles/components/VehiclesTable.css';
import carIcon from '../assets/icons/dashboard/car.svg';
import motorcycleIcon from '../assets/icons/reports/detailed/motorbike.svg';

// Inline SVG icons for consistent rendering
const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="#314158" strokeWidth="1.5" fill="none" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.33334 4V2.66667C5.33334 2.48986 5.40358 2.32029 5.52861 2.19526C5.65363 2.07024 5.8232 2 6.00001 2H10C10.1768 2 10.3464 2.07024 10.4714 2.19526C10.5964 2.32029 10.6667 2.48986 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.5101 12.5964 13.6797 12.4714 13.8047C12.3464 13.9298 12.1768 14 12 14H4.00001C3.8232 14 3.65363 13.9298 3.52861 13.8047C3.40358 13.6797 3.33334 13.5101 3.33334 13.3333V4H12.6667Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.66666 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.33334 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
    switch (type) {
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
                <td className="table-cell">{vehicle.VehicleID || vehicle.id}</td>
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
                      className="action-btn action-btn--view"
                      title="View"
                      onClick={() => onViewVehicle && onViewVehicle(vehicle)}
                    >
                      <ViewIcon />
                    </button>
                    <button
                      className="action-btn action-btn--edit"
                      title="Edit"
                      onClick={() => onEditVehicle && onEditVehicle(vehicle)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="action-btn action-btn--delete"
                      title="Delete"
                      onClick={() => onDeleteVehicle && onDeleteVehicle(vehicle)}
                    >
                      <DeleteIcon />
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
