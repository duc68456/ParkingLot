import Header from '../components/Header';
import LoginCard from '../components/LoginCard';
import Footer from '../components/Footer';
import './LoginPage.css';

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-container">
        <Header />
        <LoginCard />
        <Footer />
      </div>
    </div>
  );
}
