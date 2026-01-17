import '../styles/components/PricingRulesTable.css';

// Inline SVG icons for consistent rendering
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 4V8L10.5 10.5" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C5.87827 2 4.01111 3.08909 2.91118 4.72727" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 2V5H5" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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
                    className="action-btn action-btn--edit"
                    onClick={() => onEditRule && onEditRule(rule)}
                    aria-label="Edit"
                  >
                    <EditIcon />
                  </button>

                  <button
                    className="action-btn action-btn--history"
                    onClick={() => onViewHistory && onViewHistory(rule)}
                    aria-label="View history"
                    title="View Price History"
                    type="button"
                  >
                    <HistoryIcon />
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
