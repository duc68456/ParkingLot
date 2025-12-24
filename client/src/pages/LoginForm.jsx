import { useState } from 'react';
import FormHeader from '../components/FormHeader';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import './LoginForm.css';

export default function LoginForm({ type }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login submitted:', { type, username, password });
    // Add login logic here
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Add forgot password logic here
  };

  return (
    <div className="login-form">
      <FormHeader />
      <form onSubmit={handleSubmit} className="form-content">
        <Input
          label="Username"
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit">Login</Button>
        <button 
          type="button" 
          className="forgot-password-link"
          onClick={handleForgotPassword}
        >
          Forgot password?
        </button>
      </form>
    </div>
  );
}
