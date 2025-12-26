import React from 'react';
import '../styles/components/VehicleTypesTable.css';

export default function VehicleTypesTable({ vehicleTypes, onEditType, onDeleteType }) {
  return (
    <div className="vehicle-types-table-container">
      <table className="vehicle-types-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type Name</th>
            <th className="actions-header">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vehicleTypes.map((type) => (
            <tr key={type.id}>
              <td>{type.id}</td>
              <td>{type.name}</td>
              <td className="actions-cell">
                <div className="action-buttons">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => onEditType && onEditType(type)}
                    aria-label="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 11.5V14H4.5L11.8733 6.62667L9.37333 4.12667L2 11.5Z" fill="#45556C"/>
                      <path d="M13.8067 4.69333L11.3067 2.19333L12.78 0.72C13.0667 0.433333 13.4267 0.293333 13.86 0.3C14.2933 0.306667 14.6533 0.453333 14.94 0.74L15.28 1.08C15.5667 1.36667 15.7067 1.72667 15.7 2.16C15.6933 2.59333 15.5467 2.95333 15.26 3.24L13.8067 4.69333Z" fill="#45556C"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => onDeleteType && onDeleteType(type)}
                    aria-label="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.5 14C4.08333 14 3.72933 13.854 3.438 13.562C3.146 13.2707 3 12.9167 3 12.5V4H2V2.66667H5.66667V2H10.3333V2.66667H14V4H13V12.5C13 12.9167 12.854 13.2707 12.562 13.562C12.2707 13.854 11.9167 14 11.5 14H4.5ZM11.6667 4H4.33333V12.5C4.33333 12.5556 4.35278 12.6 4.39167 12.6333C4.43056 12.6667 4.47778 12.6667 4.53333 12.6667H11.4667C11.5222 12.6667 11.5694 12.6528 11.6083 12.625C11.6472 12.5972 11.6667 12.5556 11.6667 12.5V4ZM6.33333 11.3333H7.66667V5.33333H6.33333V11.3333ZM8.33333 11.3333H9.66667V5.33333H8.33333V11.3333Z" fill="#D92D20"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
