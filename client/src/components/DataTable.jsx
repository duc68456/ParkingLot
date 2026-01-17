import '../styles/components/DataTable.css';

export default function DataTable({
  headers,
  columnKeys,
  rows,
  total,
  itemName = 'items',
  currentPage = 1,
  totalPages = 1,
  onPageChange
}) {

  const handlePrevious = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  // If columnKeys isn't provided, we'll try to use the keys from the first row object
  // (excluding 'actions' which usually goes at the end, and 'id' which usually goes at the start)
  const keys = columnKeys || (rows.length > 0 ? Object.keys(rows[0]) : []);

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
                {keys.map((key, colIndex) => (
                  <td
                    key={colIndex}
                    className={`table-cell ${key === 'actions' || colIndex === headers.length - 1 ? 'align-right' : ''}`}
                  >
                    {row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="table-footer-info">
          Showing <strong>{rows.length}</strong> of <strong>{total}</strong> {itemName}
        </div>
        <div className="table-pagination">
          <button
            className="pagination-btn"
            onClick={handlePrevious}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
