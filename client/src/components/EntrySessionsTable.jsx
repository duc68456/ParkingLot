import '../styles/components/EntrySessionsTable.css';

const eyeIcon = "http://localhost:3845/assets/fff43459d23d75a693e463832b4f1a77eebd5c88.svg";

export default function EntrySessionsTable({ sessions, onViewSession }) {
  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'active':
        return 'status-active';
      default:
        return '';
    }
  };

  return (
    <div className="entry-sessions-table-wrapper">
      <table className="entry-sessions-table">
        <thead>
          <tr>
            <th>SESSION ID</th>
            <th>CARD</th>
            <th>PLATE</th>
            <th>ENTRY TIME</th>
            <th>EXIT TIME</th>
            <th>STATUS</th>
            <th>FINAL FEE</th>
            <th>STAFF</th>
            <th className="text-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.id}>
              <td>{session.id}</td>
              <td>{session.cardId}</td>
              <td className="plate-cell">{session.plate}</td>
              <td className="time-cell">{session.entryTime}</td>
              <td className="time-cell">{session.exitTime || '-'}</td>
              <td>
                <span className={`status-badge ${getStatusClass(session.status)}`}>
                  {session.status}
                </span>
              </td>
              <td>${session.finalFee.toFixed(2)}</td>
              <td className="staff-cell">{session.staff}</td>
              <td className="actions-cell">
                <button
                  className="action-btn view-btn"
                  onClick={() => onViewSession && onViewSession(session)}
                  aria-label="View Details"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M1.61342 8.47329C1.52262 8.33051 1.47723 8.25913 1.45182 8.14916C1.43273 8.06457 1.43273 7.93543 1.45182 7.85084C1.47723 7.74087 1.52262 7.66949 1.61341 7.52671C2.36369 6.33734 4.59693 3.33333 8.00027 3.33333C11.4036 3.33333 13.6369 6.33734 14.3871 7.52671C14.4779 7.66949 14.5233 7.74087 14.5487 7.85084C14.5678 7.93543 14.5678 8.06457 14.5487 8.14916C14.5233 8.25913 14.4779 8.33051 14.3871 8.47329C13.6369 9.66266 11.4036 12.6667 8.00027 12.6667C4.59693 12.6667 2.36369 9.66266 1.61342 8.47329Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8.00027 10C9.10484 10 10.0003 9.10457 10.0003 8C10.0003 6.89543 9.10484 6 8.00027 6C6.8957 6 6.00027 6.89543 6.00027 8C6.00027 9.10457 6.8957 10 8.00027 10Z" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Table Footer */}
      <div className="table-footer">
        <p className="results-text">
          Showing <span className="results-count">{sessions.length}</span> results
        </p>
        <div className="pagination-buttons">
          <button className="pagination-btn">Previous</button>
          <button className="pagination-btn">Next</button>
        </div>
      </div>
    </div>
  );
}
