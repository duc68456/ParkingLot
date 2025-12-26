import React from 'react';
import '../styles/components/TablePagination.css';

export default function TablePagination({ totalResults, currentPage, onPreviousPage, onNextPage, hasMore }) {
  return (
    <div className="table-pagination">
      <div className="results-info">
        <p>Showing <span className="results-count">{totalResults}</span> results</p>
      </div>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={onPreviousPage}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <button
          className="pagination-btn"
          onClick={onNextPage}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}
