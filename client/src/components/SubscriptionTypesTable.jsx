import '../styles/components/SubscriptionTypesTable.css';

const addIcon = "data:image/svg+xml,%3Csvg%20width%3D%2220%22height%3D%2220%22viewBox%3D%220%200%2020%2020%22fill%3D%22none%22xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M10%204.16667V15.8333M4.16667%2010H15.8333%22%20stroke%3D%22white%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E";

export default function SubscriptionTypesTable({ subscriptionTypes, onAddType }) {
  return (
    <div className="subscription-types-container">
      {/* Add Type Button */}
      <div className="add-type-section">
        <button className="btn-add-type" onClick={onAddType}>
          <img src={addIcon} alt="" className="btn-icon" />
          + Add Type
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
