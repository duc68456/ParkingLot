import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EntrySessionsTable from '../components/EntrySessionsTable';
import '../styles/pages/EntrySessionsPage.css';

const searchIcon = "http://localhost:3845/assets/48c5ec2984942afc7a9f1923cb9d463027cdf83f.svg";

// Mock data for entry sessions
const mockEntrySessions = [
  {
    id: 'SESS001',
    cardId: 'CARD001',
    plate: 'ABC-1234',
    entryTime: 'Jan 15, 08:00 AM',
    exitTime: 'Jan 15, 10:30 AM',
    status: 'Completed',
    finalFee: 15.00,
    staff: 'Tom Staff'
  },
  {
    id: 'SESS002',
    cardId: 'CARD002',
    plate: 'XYZ-5678',
    entryTime: 'Jan 15, 09:00 AM',
    exitTime: null,
    status: 'Active',
    finalFee: 0.00,
    staff: 'Tom Staff'
  }
];

export default function EntrySessionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState(mockEntrySessions);

  const handleViewSession = (session) => {
    alert(`View details for session: ${session.id}`);
  };

  const filteredSessions = sessions.filter(session =>
    session.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.cardId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.staff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="entry-sessions-page">
      {/* Page Header */}
      <div className="page-header-section">
        <h2 className="page-title">Manage Entry Session</h2>
        <p className="page-subtitle">View and manage all parking entry sessions</p>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-wrapper">
          <img src={searchIcon} alt="" className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Entry Sessions Table */}
      <EntrySessionsTable 
        sessions={filteredSessions}
        onViewSession={handleViewSession}
      />
    </div>
  );
}
