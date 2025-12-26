import AdminLayout from './AdminLayout';
import '../styles/pages/Dashboard.css';

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="dashboard">
        <h2 className="dashboard-welcome">Welcome to Dashboard</h2>
        <p className="dashboard-description">
          This is the admin dashboard page. You can add your content here.
        </p>
      </div>
    </AdminLayout>
  );
}
