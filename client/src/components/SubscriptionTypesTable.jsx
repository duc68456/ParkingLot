import '../styles/components/SubscriptionTypesTable.css';

const addIcon = "http://localhost:3845/assets/25c699331c374458f53e2c0a64f9f8de133e7e81.svg";

export default function SubscriptionTypesTable({ subscriptionTypes, onAddType }) {
  return (
    <div className="subscription-types-container">
      {/* Add Type Button */}
      <div className="add-type-section">
        <button className="btn-add-type" onClick={onAddType}>
          <img src={addIcon} alt="" className="btn-icon" />
          Add Type
        </button>
      </div>

      {/* Data Table */}
      <div className="subscription-types-table-wrapper">
        <table className="subscription-types-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>NAME</th>
              <th>DURATION (DAYS)</th>
              <th>DESCRIPTION</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionTypes.map((type) => (
              <tr key={type.id}>
                <td>{type.id}</td>
                <td>{type.name}</td>
                <td>{type.duration}</td>
                <td>{type.description}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="table-footer">
          <p className="results-text">
            Showing <span className="results-count">{subscriptionTypes.length}</span> results
          </p>
          <div className="pagination-buttons">
            <button className="pagination-btn">Previous</button>
            <button className="pagination-btn">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
