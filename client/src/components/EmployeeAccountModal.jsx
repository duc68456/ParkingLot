import { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/EmployeeAccountModal.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

function normalizeEmployeeType(employee) {
  const raw = employee?.EmployeeType ?? employee?.employeeType ?? employee?.role ?? employee?.type;
  return String(raw || '').trim().toUpperCase();
}

function getEmployeeDisplayName(employee) {
  return employee?.name || employee?.FullName || employee?.fullName || '—';
}

function getEmployeeInitials(employee) {
  if (!employee) return '';
  if (employee.initials) return employee.initials;
  const name = getEmployeeDisplayName(employee);
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export default function EmployeeAccountModal({ employee, onClose }) {
  const { authHeaders } = useAuth();
  const initials = useMemo(() => getEmployeeInitials(employee), [employee]);
  const name = useMemo(() => getEmployeeDisplayName(employee), [employee]);
  const employeeType = useMemo(() => normalizeEmployeeType(employee), [employee]);

  const [isChanging, setIsChanging] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  if (!employee) return null;

  const isAdmin = employeeType === 'ADMIN';
  const isStaff = employeeType === 'STAFF' || employeeType === 'GATE_STAFF';
  const username = employee?.id || employee?.ID || '';

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleClose = () => {
    // Clear any sensitive, one-time display data on close.
    setGeneratedPin('');
    setCopyMessage('');
    onClose?.();
  };

  const handleStartChangePassword = () => {
    if (!isAdmin) return;
    setIsChanging(true);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setStatusMessage('');
    setGeneratedPin('');
    setCopyMessage('');
  };

  const validate = () => {
    if (!newPassword || !confirmPassword) return 'Please enter and confirm the new password.';
    if (newPassword.length < 6) return 'Password must be at least 6 characters.';
    if (newPassword !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmitPassword = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
  setStatusMessage('');

    try {
      // TODO: wire real API call. For now we just close after a tiny delay.
      await new Promise((r) => setTimeout(r, 300));
      setIsChanging(false);
      setNewPassword('');
      setConfirmPassword('');
      setStatusMessage('Password updated.');
    } catch (e) {
      setError(e?.message || 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelChange = () => {
    setIsChanging(false);
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setStatusMessage('');
  };

  const handleGenerateNewPin = async () => {
    if (!isStaff) return;

    setSubmitting(true);
    setError('');
    setStatusMessage('');
    setCopyMessage('');

    try {
      const businessId = employee?.id || employee?.ID || '';
      const res = await fetch(`${API_BASE_URL}/api/staff-accounts/by-employee/${encodeURIComponent(businessId)}/generate-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        const message = data?.error?.message || `Failed to generate new PIN. (${res.status})`;
        throw new Error(message);
      }

      const pin = String(data?.data?.pin || '').trim();
      if (!pin) {
        throw new Error('PIN was generated but not returned by server.');
      }

      setGeneratedPin(pin);
      setStatusMessage('New PIN generated. Save it before closing.');
    } catch (e) {
      setError(e?.message || 'Failed to generate new PIN.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearPin = () => {
    setGeneratedPin('');
    setCopyMessage('');
    setStatusMessage('');
    setError('');
  };

  const handleCopyPin = async () => {
    if (!generatedPin) return;

    try {
      await navigator.clipboard.writeText(generatedPin);
      setCopyMessage('Copied.');
      // Don’t keep piling messages.
      setTimeout(() => setCopyMessage(''), 1500);
    } catch {
      setCopyMessage('Copy failed.');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  return (
    <div className="employee-account-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="employee-account-modal" role="dialog" aria-modal="true" aria-label="Employee Account">
        <div className="employee-account-modal__header">
          <div className="employee-account-modal__title">Employee Account</div>
          <button className="employee-account-modal__close" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="employee-account-modal__body">
          <div className="employee-account-modal__top">
            <div className="employee-account-modal__avatar" aria-hidden="true">{initials}</div>
            <div className="employee-account-modal__who">
              <div className="employee-account-modal__name">{name}</div>
              <div className="employee-account-modal__role">{employeeType || '—'}</div>
            </div>
          </div>

          <div className="employee-account-modal__divider" />

          {isStaff ? (
            <div className="employee-account-modal__pinWrap">
              <div className="employee-account-modal__pinCard">
                <div className="employee-account-modal__pinHeader">
                  <div>
                    <div className="employee-account-modal__pinLabel">CURRENT PIN CODE</div>
                    <div className="employee-account-modal__pinSub">6-digit authentication code</div>
                  </div>
                  <div className="employee-account-modal__pinIcon" aria-hidden="true">🔑</div>
                </div>

                <div className="employee-account-modal__pinMasked" aria-label="Masked PIN">• • • • • •</div>

                <div className="employee-account-modal__pinMeta">
                  <div className="employee-account-modal__pinMetaItem">
                    <div className="employee-account-modal__pinMetaK">Employee ID</div>
                    <div className="employee-account-modal__pinMetaV">{username || '—'}</div>
                  </div>
                  <div className="employee-account-modal__pinMetaItem">
                    <div className="employee-account-modal__pinMetaK">Account Status</div>
                    <div className="employee-account-modal__pinMetaV">{employee?.Status || employee?.status || 'Active'}</div>
                  </div>
                </div>
              </div>

              {generatedPin ? (
                <div className="employee-account-modal__newPinWrap">
                  <div className="employee-account-modal__newPinHeader">
                    <div>
                      <div className="employee-account-modal__newPinTitle">New PIN Generated</div>
                      <div className="employee-account-modal__newPinSub">Share this code securely with the employee</div>
                    </div>
                    <div className="employee-account-modal__newPinIcon" aria-hidden="true">🔑</div>
                  </div>

                  <div className="employee-account-modal__newPinCard">
                    <div className="employee-account-modal__newPinLabel">PIN CODE</div>
                    <div className="employee-account-modal__pinDigits" aria-label="Generated PIN">
                      {generatedPin.padEnd(6, '•').slice(0, 6).split('').map((d, idx) => (
                        <div key={idx} className="employee-account-modal__pinDigit" aria-hidden="true">
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="employee-account-modal__pinActions">
                    <button
                      className="employee-account-modal__copyBtn"
                      type="button"
                      onClick={handleCopyPin}
                    >
                      Copy PIN
                    </button>
                    <button
                      className="employee-account-modal__clearBtn"
                      type="button"
                      onClick={handleClearPin}
                    >
                      Clear
                    </button>
                  </div>

                  <div className="employee-account-modal__pinWarning" role="note">
                    <div className="employee-account-modal__pinWarningTitle">Important:</div>
                    <div>Save this PIN before closing. It will not be shown again.</div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="employee-account-modal__error" role="alert">{error}</div>
              ) : null}
              {statusMessage ? (
                <div className="employee-account-modal__success" role="status">{statusMessage}</div>
              ) : null}
              {copyMessage ? (
                <div className="employee-account-modal__success" role="status">{copyMessage}</div>
              ) : null}

              <button
                className="employee-account-modal__pinBtn"
                type="button"
                disabled={submitting}
                onClick={handleGenerateNewPin}
              >
                {submitting ? 'Generating…' : 'Generate New PIN Code'}
              </button>
            </div>
          ) : !isAdmin ? (
            <div className="employee-account-modal__hint">This employee does not have an admin account.</div>
          ) : (
            <div className="employee-account-modal__form">
              <div className="employee-account-modal__field">
                <div className="employee-account-modal__label">Username</div>
                <div className="employee-account-modal__input employee-account-modal__input--readonly" aria-readonly="true">
                  {username || '—'}
                </div>
              </div>

              <div className="employee-account-modal__field">
                <div className="employee-account-modal__label">Password</div>

                {!isChanging ? (
                  <>
                    <div className="employee-account-modal__input employee-account-modal__input--readonly" aria-readonly="true">
                      ••••••••
                    </div>
                    <button
                      className="employee-account-modal__primaryBtn"
                      type="button"
                      onClick={handleStartChangePassword}
                    >
                      Change Password
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      className="employee-account-modal__textInput"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      autoFocus
                    />
                    <input
                      className="employee-account-modal__textInput"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />

                    {error ? (
                      <div className="employee-account-modal__error" role="alert">{error}</div>
                    ) : null}

                    {statusMessage ? (
                      <div className="employee-account-modal__success" role="status">{statusMessage}</div>
                    ) : null}

                    <button
                      className="employee-account-modal__primaryBtn"
                      type="button"
                      disabled={submitting}
                      onClick={handleSubmitPassword}
                    >
                      {submitting ? 'Saving…' : 'Save Password'}
                    </button>

                    <button
                      className="employee-account-modal__secondaryBtn"
                      type="button"
                      disabled={submitting}
                      onClick={handleCancelChange}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
