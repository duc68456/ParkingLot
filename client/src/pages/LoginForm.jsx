import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormHeader from '../components/FormHeader';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import '../styles/pages/LoginForm.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export default function LoginForm({ type }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();

    ;(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/admin-accounts/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Username: username,
            Password: password
          })
        })

        const json = await res.json()

        if (!res.ok) {
          const msg = json?.error?.message || `Login failed (${res.status})`
          throw new Error(msg)
        }

        const data = json?.data
        const token = data?.token

        const fullName =
          data?.EmployeeID?.PersonID?.FullName ||
          data?.EmployeeID?.PersonID?.fullName ||
          data?.Username ||
          username

        const initials = fullName
          ? fullName
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0]?.toUpperCase())
              .join('')
          : 'AD'

        login(
          {
            name: fullName,
            email: data?.Username ? `${data.Username}` : username,
            initials,
            id: data?.ID,
            type: 'admin'
          },
          'admin',
          token
        )
      } catch (err) {
        console.error('Admin login error:', err)
        window.alert(err?.message || 'Failed to login')
      }
    })()
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
