import './Footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="footer">
      <p className="footer-text">
        © {currentYear} Company Name. All rights reserved.
      </p>
    </footer>
  );
}
