import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FormHeader from '../components/FormHeader';
import Input from '../components/Input';
import PasswordInput from '../components/PasswordInput';
import Button from '../components/Button';
import '../styles/pages/LoginForm.css';
import { getApiBaseUrl } from '../utils/apiBase'

const API_BASE_URL = getApiBaseUrl()

export default function LoginForm({ type }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();

    ; (async () => {
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

        // Server login response returns EmployeeID as a business id string (EMP####).
        // The populated details (employee/person) are exposed via virtuals (employee -> person).
        // Keep fallbacks for older responses.
        const fullName =
          data?.employee?.person?.FullName ||
          data?.employee?.person?.fullName ||
          data?.employee?.person?.name ||
          data?.employee?.FullName ||
          data?.employee?.fullName ||
          data?.fullName ||
          data?.FullName ||
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
            // EmployeeBusinessID is a string like "EMP0001", not an object
            employeeId: data?.EmployeeBusinessID || data?.EmployeeID,
            // Prefer populated virtual employee, if present.
            employeeMongoId: data?.employee?.id || data?.employee?._id || data?.EmployeeID?.id,
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
