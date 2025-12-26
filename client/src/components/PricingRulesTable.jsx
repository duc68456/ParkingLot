import '../styles/components/PricingRulesTable.css';

const editIcon = "http://localhost:3845/assets/22ed6fed4c4d56385d3b4d40f1a0236ded42a86e.svg";
const deleteIcon = "http://localhost:3845/assets/a3489249e5cd5f96ac6c7f20e6169441f273f33e.svg";

export default function PricingRulesTable({ pricingRules, onEditRule, onDeleteRule }) {
  return (
    <div className="pricing-rules-table-wrapper">
      <table className="pricing-rules-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>CARD CATEGORY</th>
            <th>VEHICLE TYPE</th>
            <th>START DATE</th>
            <th>END DATE</th>
            <th>DAY PRICE</th>
            <th>1ST HOUR</th>
            <th>NEXT HOUR</th>
            <th className="text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {pricingRules.map((rule) => (
            <tr key={rule.id}>
              <td>{rule.id}</td>
              <td>{rule.cardCategory}</td>
              <td>{rule.vehicleType}</td>
              <td>{rule.startDate}</td>
              <td>{rule.endDate}</td>
              <td>${rule.dayPrice.toFixed(2)}</td>
              <td>${rule.firstHour.toFixed(2)}</td>
              <td>${rule.nextHour.toFixed(2)}</td>
              <td className="actions-cell">
                <div className="action-buttons">
                  <button
                    className="action-btn edit-btn"
                    onClick={() => onEditRule && onEditRule(rule)}
                    aria-label="Edit"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 11.5V14H4.5L11.8733 6.62667L9.37333 4.12667L2 11.5Z" fill="#45556C"/>
                      <path d="M13.8067 4.69333L11.3067 2.19333L12.78 0.72C13.0667 0.433333 13.4267 0.293333 13.86 0.3C14.2933 0.306667 14.6533 0.453333 14.94 0.74L15.28 1.08C15.5667 1.36667 15.7067 1.72667 15.7 2.16C15.6933 2.59333 15.5467 2.95333 15.26 3.24L13.8067 4.69333Z" fill="#45556C"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => onDeleteRule && onDeleteRule(rule)}
                    aria-label="Delete"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4.5 14C4.08333 14 3.72933 13.854 3.438 13.562C3.146 13.2707 3 12.9167 3 12.5V4H2V2.66667H5.66667V2H10.3333V2.66667H14V4H13V12.5C13 12.9167 12.854 13.2707 12.562 13.562C12.2707 13.854 11.9167 14 11.5 14H4.5ZM11.6667 4H4.33333V12.5C4.33333 12.5556 4.35278 12.6 4.39167 12.6333C4.43056 12.6667 4.47778 12.6667 4.53333 12.6667H11.4667C11.5222 12.6667 11.5694 12.6528 11.6083 12.625C11.6472 12.5972 11.6667 12.5556 11.6667 12.5V4ZM6.33333 11.3333H7.66667V5.33333H6.33333V11.3333ZM8.33333 11.3333H9.66667V5.33333H8.33333V11.3333Z" fill="#D92D20"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Table Footer */}
      <div className="table-footer">
        <p className="results-text">
          Showing <span className="results-count">{pricingRules.length}</span> results
        </p>
        <div className="pagination-buttons">
          <button className="pagination-btn">Previous</button>
          <button className="pagination-btn">Next</button>
        </div>
      </div>
    </div>
  );
}
