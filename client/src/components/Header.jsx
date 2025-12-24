import './Header.css';

export default function Header() {
  return (
    <div className="header">
      <div className="header-icon">
        <img 
          src="http://localhost:3845/assets/1acb3050167d6a4814823522ee5128257328b234.svg" 
          alt="Company Logo"
        />
      </div>
      <h1 className="header-title">Company Portal</h1>
      <p className="header-subtitle">Secure Access System</p>
    </div>
  );
}
