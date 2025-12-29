import React from 'react';
import '../styles/components/ShiftReportModal.css';

// Image assets
const reportIconBlue = "http://localhost:3845/assets/549f60289de04afce20a48c1c4b57c992dd9ebd2.svg";
const exportIcon = "http://localhost:3845/assets/b75d3b7dac220190285a0be2b703239e0104a1b2.svg";
const closeIcon1 = "http://localhost:3845/assets/6f199f12f1cb801ba769086e63ec0339157278aa.svg";
const closeIcon2 = "http://localhost:3845/assets/f8c94079d0500cde9a69ab439ab2feb4cf028e36.svg";
const trendIcon = "http://localhost:3845/assets/c014f945e92ec5a0ec19db6f14015855d4001040.svg";

const ShiftReportModal = ({ isOpen, onClose, gateType = 'entry' }) => {
  if (!isOpen) return null;

  // Mock data - replace with actual data
  const reportData = {
    date: 'December 29, 2025',
    gateType: gateType === 'entry' ? 'Entry Gate' : 'Exit Gate',
    stats: {
      total: 7,
      cars: 3,
      motorcycles: 2,
      trucks: 1,
      vans: 1
    },
    sessions: [
      { entryTime: '10:12:59 AM', licensePlate: 'MNO-1111', cardId: 'UID-111222', vehicleType: 'car' },
      { entryTime: '09:12:59 AM', licensePlate: 'PQR-2222', cardId: 'UID-222333', vehicleType: 'motorcycle' },
      { entryTime: '07:12:59 AM', licensePlate: 'STU-3333', cardId: 'UID-333444', vehicleType: 'van' },
      { entryTime: '08:12:59 AM', licensePlate: 'VWX-4444', cardId: 'UID-444555', vehicleType: 'car' },
      { entryTime: '05:12:59 AM', licensePlate: 'YZA-5555', cardId: 'UID-555666', vehicleType: 'truck' },
      { entryTime: '11:12:59 AM', licensePlate: 'BCD-6666', cardId: 'UID-666777', vehicleType: 'car' },
      { entryTime: '06:12:59 AM', licensePlate: 'EFG-7777', cardId: 'UID-777888', vehicleType: 'motorcycle' }
    ]
  };

  const handleExport = () => {
    console.log('Export shift report');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="shift-report-overlay" onClick={handleOverlayClick}>
      <div className="shift-report-modal">
        {/* Header */}
        <div className="shift-report-header">
          <div className="shift-report-title-section">
            <div className="shift-report-icon-wrapper">
              <img src={reportIconBlue} alt="" />
            </div>
            <div className="shift-report-title-text">
              <h3 className="shift-report-title">Shift Report</h3>
              <p className="shift-report-subtitle">{reportData.gateType} - {reportData.date}</p>
            </div>
          </div>

          <div className="shift-report-actions">
            <button className="shift-report-export-btn" onClick={handleExport}>
              <img src={exportIcon} alt="" />
              <span>Export</span>
            </button>
            <button className="shift-report-close-btn" onClick={onClose}>
              <img src={closeIcon1} alt="" className="close-icon-1" />
              <img src={closeIcon2} alt="" className="close-icon-2" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="shift-report-content">
          {/* Statistics Cards */}
          <div className="shift-report-stats">
            <div className="shift-stat-card shift-stat-total">
              <div className="shift-stat-header">
                <img src={trendIcon} alt="" />
                <span className="shift-stat-label">Total</span>
              </div>
              <p className="shift-stat-value">{reportData.stats.total}</p>
            </div>

            <div className="shift-stat-card">
              <p className="shift-stat-label">Cars</p>
              <p className="shift-stat-value">{reportData.stats.cars}</p>
            </div>

            <div className="shift-stat-card">
              <p className="shift-stat-label">Motorcycles</p>
              <p className="shift-stat-value">{reportData.stats.motorcycles}</p>
            </div>

            <div className="shift-stat-card">
              <p className="shift-stat-label">Trucks</p>
              <p className="shift-stat-value">{reportData.stats.trucks}</p>
            </div>

            <div className="shift-stat-card">
              <p className="shift-stat-label">Vans</p>
              <p className="shift-stat-value">{reportData.stats.vans}</p>
            </div>
          </div>

          {/* Sessions Table */}
          <div className="shift-report-sessions">
            <h4 className="shift-sessions-title">All Sessions</h4>
            <div className="shift-report-table-container">
              <table className="shift-report-table">
                <thead className="shift-table-header">
                  <tr>
                    <th>Entry Time</th>
                    <th>License Plate</th>
                    <th>Card ID</th>
                    <th>Vehicle Type</th>
                  </tr>
                </thead>
                <tbody className="shift-table-body">
                  {reportData.sessions.map((session, index) => (
                    <tr key={index}>
                      <td>{session.entryTime}</td>
                      <td className="shift-license-plate">{session.licensePlate}</td>
                      <td>{session.cardId}</td>
                      <td className="shift-vehicle-type">{session.vehicleType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftReportModal;
