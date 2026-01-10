import '../styles/components/PricingRulesTable.css';

const historyIcon = "http://localhost:3845/assets/3c622c974067bf8fdbfa9d68558b44e32eb6d202.svg";

export default function PricingRulesTable({ pricingRules, onEditRule, onViewHistory }) {
  const formatDate = (value) => {
    if (!value) return '--';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-GB');
  };

  const money = (v) => {
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isNaN(n)) return '--';
    return `$${n.toFixed(2)}`;
  };

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
              <td>{formatDate(rule.startDate)}</td>
              <td>{rule.endDate ? formatDate(rule.endDate) : 'Active'}</td>
              <td>{money(rule.dayPrice)}</td>
              <td>{money(rule.firstHour)}</td>
              <td>{money(rule.nextHour)}</td>
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
                    className="action-btn"
                    onClick={() => onViewHistory && onViewHistory(rule)}
                    aria-label="View history"
                    title="View Price History"
                    type="button"
                  >
                    <img src={historyIcon} alt="" width="16" height="16" />
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
