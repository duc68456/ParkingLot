import { useState } from 'react';
import '../styles/components/DataTable.css';

export default function DataTable({ headers, rows, total, itemName = 'items' }) {
  const [currentPage, setCurrentPage] = useState(1);

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    setCurrentPage(currentPage + 1);
  };

  return (
    <div className="data-table-container">
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr className="table-header-row">
              {headers.map((header, index) => (
                <th 
                  key={index} 
                  className={`table-header-cell ${index === headers.length - 1 ? 'align-right' : ''}`}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="table-row">
                <td className="table-cell">{row.id}</td>
                <td className="table-cell">{row.customer || row.employee}</td>
                <td className="table-cell">{row.contact || row.role}</td>
                <td className="table-cell">{row.status}</td>
                <td className="table-cell">{row.registered || row.hiredDate}</td>
                <td className="table-cell align-right">{row.actions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="table-footer">
        <div className="table-footer-info">
          Showing <strong>{total}</strong> {itemName}
        </div>
        <div className="table-pagination">
          <button 
            className="pagination-btn" 
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button className="pagination-btn" onClick={handleNext}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
