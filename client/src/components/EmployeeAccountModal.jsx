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
  const initials = getEmployeeInitials(employee);
  const name = getEmployeeDisplayName(employee);
  const employeeType = normalizeEmployeeType(employee);

  // Hub state
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'admin'
  const [selectedRole, setSelectedRole] = useState('superadmin');

  // PIN actions state
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [generatedPin, setGeneratedPin] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  // Admin account state (UI only for now)
  // NOTE: Admin username is displayed from employee/admin data (read-only) in the new design.
  const [adminIsChangingPassword, setAdminIsChangingPassword] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminNewConfirmPassword, setAdminNewConfirmPassword] = useState('');
  const [adminShowNewPassword, setAdminShowNewPassword] = useState(false);
  const [adminShowNewConfirmPassword, setAdminShowNewConfirmPassword] = useState(false);
  const [adminPasswordPanelError, setAdminPasswordPanelError] = useState('');
  const [adminStatus, setAdminStatus] = useState('');

  if (!employee) return null;

  const isStaff = employeeType === 'STAFF' || employeeType === 'GATE_STAFF';
  const username = employee?.id || employee?.ID || '';

  const status = employee?.Status || employee?.status || 'Active';

  const isAdminPasswordPanelValid = useMemo(() => {
    if (!adminNewPassword) return false;
    if (!adminNewConfirmPassword) return false;
    if (adminNewPassword !== adminNewConfirmPassword) return false;
    return true;
  }, [adminNewPassword, adminNewConfirmPassword]);

  const roleOptions = [
    { key: 'superadmin', title: 'SuperAdmin', description: 'Full system access' },
    { key: 'gateguard', title: 'GateGuard', description: 'Gate management only' },
    { key: 'accountant', title: 'Accountant', description: 'Financial reports access' },
    { key: 'hr', title: 'HR Manager', description: 'Employee management' },
    { key: 'customer-service', title: 'Customer Service', description: 'Customer support' }
  ];

  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  const handleClose = () => {
    // Clear any sensitive, one-time display data on close.
    setGeneratedPin('');
    setCopyMessage('');
    setError('');
    setStatusMessage('');

    // Clear admin fields on close as well.
    setAdminIsChangingPassword(false);
    setAdminNewPassword('');
    setAdminNewConfirmPassword('');
    setAdminShowNewPassword(false);
    setAdminShowNewConfirmPassword(false);
    setAdminPasswordPanelError('');
    setAdminStatus('');
    onClose?.();
  };

  const handleAdminOpenChangePassword = () => {
    setAdminPasswordPanelError('');
    setAdminStatus('');
    setAdminIsChangingPassword(true);
  };

  const handleAdminCancelChangePassword = () => {
    setAdminIsChangingPassword(false);
    setAdminNewPassword('');
    setAdminNewConfirmPassword('');
    setAdminShowNewPassword(false);
    setAdminShowNewConfirmPassword(false);
    setAdminPasswordPanelError('');
  };

  const handleAdminSavePassword = async () => {
    setAdminPasswordPanelError('');
    setAdminStatus('');

    if (!adminNewPassword) {
      setAdminPasswordPanelError('New password is required.');
      return;
    }
    if (adminNewPassword.length < 6) {
      setAdminPasswordPanelError('Password must be at least 6 characters.');
      return;
    }
    if (adminNewPassword !== adminNewConfirmPassword) {
      setAdminPasswordPanelError('Passwords do not match.');
      return;
    }

    // UI-only placeholder for now.
    setAdminStatus('Password updated (UI-only). Backend wiring pending.');
    setAdminIsChangingPassword(false);
    setAdminNewPassword('');
    setAdminNewConfirmPassword('');
    setAdminShowNewPassword(false);
    setAdminShowNewConfirmPassword(false);
  };

  // Admin account creation is not part of the current Figma flow; keep the panel focused on
  // managing credentials (change password) to avoid conflicting forms.

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
      <div className="employee-account-modal employee-account-modal--hub" role="dialog" aria-modal="true" aria-label="Access Management Hub">
        <div className="employee-account-modal__header">
          <div className="employee-account-modal__title">Access Management Hub</div>
          <button className="employee-account-modal__close" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="employee-account-modal__body employee-account-modal__body--hub">
          <div className="employee-account-modal__hubTop">
            <div className="employee-account-modal__avatar" aria-hidden="true">{initials}</div>
            <div className="employee-account-modal__hubWho">
              <div className="employee-account-modal__hubName">{name}</div>
              <div className="employee-account-modal__hubSub">{username || '—'}</div>
              <div className="employee-account-modal__hubPills">
                <span className="employee-account-modal__pill employee-account-modal__pill--role">{employeeType || '—'}</span>
                <span className="employee-account-modal__pill employee-account-modal__pill--status">{status}</span>
              </div>
            </div>
          </div>

          <div className="employee-account-modal__divider" />

          <div className="employee-account-modal__sectionTitle">
            <span className="employee-account-modal__sectionIcon" aria-hidden="true">▢</span>
            <span className="employee-account-modal__sectionText">
              <span className="employee-account-modal__sectionHeading">Role Management</span>
              <span className="employee-account-modal__sectionSub">Assign permissions and access levels</span>
            </span>
          </div>

          <div className="employee-account-modal__roleGrid" role="radiogroup" aria-label="Role Management">
            {roleOptions.map((opt) => {
              const checked = selectedRole === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`employee-account-modal__roleCard ${checked ? 'employee-account-modal__roleCard--selected' : ''}`}
                  onClick={() => setSelectedRole(opt.key)}
                  aria-pressed={checked}
                >
                  <div className="employee-account-modal__roleCardText">
                    <div className="employee-account-modal__roleCardTitle">{opt.title}</div>
                    <div className="employee-account-modal__roleCardDesc">{opt.description}</div>
                  </div>
                  <span className={`employee-account-modal__radio ${checked ? 'employee-account-modal__radio--checked' : ''}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>

          <div className="employee-account-modal__tabSwitch" role="tablist" aria-label="Account Type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pin'}
              className={`employee-account-modal__tab ${activeTab === 'pin' ? 'employee-account-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('pin')}
            >
              <span className="employee-account-modal__tabIcon" aria-hidden="true">🔑</span>
              PIN Account
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              className={`employee-account-modal__tab ${activeTab === 'admin' ? 'employee-account-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span className="employee-account-modal__tabIcon" aria-hidden="true">👤</span>
              Admin Account
            </button>
          </div>

          {activeTab === 'pin' ? (
            <div className="employee-account-modal__pinHub" role="tabpanel" aria-label="PIN Account">
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
                    <div className="employee-account-modal__pinMetaV">{status}</div>
                  </div>
                </div>

                {generatedPin ? (
                  <div className="employee-account-modal__generatedPin">
                    <div className="employee-account-modal__generatedPinLabel">NEW PIN</div>
                    <div className="employee-account-modal__generatedPinValue">{generatedPin}</div>
                    <div className="employee-account-modal__pinActions">
                      <button className="employee-account-modal__copyBtn" type="button" onClick={handleCopyPin}>
                        Copy
                      </button>
                      <button className="employee-account-modal__clearBtn" type="button" onClick={handleClearPin}>
                        Clear
                      </button>
                    </div>
                    {copyMessage ? (
                      <div className="employee-account-modal__success" role="status">{copyMessage}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="employee-account-modal__error" role="alert">{error}</div>
              ) : null}
              {statusMessage ? (
                <div className="employee-account-modal__success" role="status">{statusMessage}</div>
              ) : null}

              <button
                type="button"
                className="employee-account-modal__primaryGradientBtn"
                onClick={handleGenerateNewPin}
                disabled={!isStaff || submitting}
                title={!isStaff ? 'PIN is only available for staff accounts' : 'Generate new PIN'}
              >
                <span aria-hidden="true">🔑</span>
                Generate New PIN Code
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div className="employee-account-modal__adminHub" role="tabpanel" aria-label="Admin Account">
              <div className="employee-account-modal__adminMiniMeta">
                <div className="employee-account-modal__adminMiniMetaItem">
                  <div className="employee-account-modal__adminMiniMetaK">Employee ID</div>
                  <div className="employee-account-modal__adminMiniMetaV">{username || '—'}</div>
                </div>
                <div className="employee-account-modal__adminMiniMetaItem">
                  <div className="employee-account-modal__adminMiniMetaK">Account Status</div>
                  <div className="employee-account-modal__adminMiniMetaV">{status}</div>
                </div>
              </div>

              <div className="employee-account-modal__adminCard employee-account-modal__adminCard--change">
                <div className="employee-account-modal__adminCardHeader">
                  <div className="employee-account-modal__adminCardIcon" aria-hidden="true">🔒</div>
                  <div className="employee-account-modal__adminCardHeading">
                    <div className="employee-account-modal__adminTitle">Admin Account</div>
                    <div className="employee-account-modal__adminSub">Manage admin credentials</div>
                  </div>
                </div>

                <div className="employee-account-modal__adminForm">
                  <div className="employee-account-modal__field employee-account-modal__field--readonly">
                    <span className="employee-account-modal__label employee-account-modal__label--caps">USERNAME</span>
                    <div className="employee-account-modal__readonly">{username || '—'}</div>
                  </div>

                  <div className="employee-account-modal__field">
                    <span className="employee-account-modal__label employee-account-modal__label--caps">PASSWORD</span>

                    {!adminIsChangingPassword ? (
                      <>
                        <div className="employee-account-modal__readonly employee-account-modal__readonly--masked" aria-label="Masked password">••••••••••••</div>
                        <button
                          type="button"
                          className="employee-account-modal__adminPrimaryBtn"
                          onClick={handleAdminOpenChangePassword}
                        >
                          Change Password
                        </button>
                      </>
                    ) : (
                      <div className="employee-account-modal__adminPasswordPanel">
                        <label className="employee-account-modal__subField">
                          <span className="employee-account-modal__subLabel">New Password</span>
                          <div className="employee-account-modal__passwordWrap employee-account-modal__passwordWrap--sm">
                            <input
                              className="employee-account-modal__input employee-account-modal__input--panel"
                              type={adminShowNewPassword ? 'text' : 'password'}
                              value={adminNewPassword}
                              onChange={(e) => {
                                setAdminNewPassword(e.target.value);
                                setAdminPasswordPanelError('');
                                setAdminStatus('');
                              }}
                              placeholder="Enter new password"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              className="employee-account-modal__eyeBtn employee-account-modal__eyeBtn--sm"
                              onClick={() => setAdminShowNewPassword((v) => !v)}
                              aria-label={adminShowNewPassword ? 'Hide new password' : 'Show new password'}
                              title={adminShowNewPassword ? 'Hide new password' : 'Show new password'}
                            >
                              {adminShowNewPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </label>

                        <label className="employee-account-modal__subField">
                          <span className="employee-account-modal__subLabel">Confirm Password</span>
                          <div className="employee-account-modal__passwordWrap employee-account-modal__passwordWrap--sm">
                            <input
                              className="employee-account-modal__input employee-account-modal__input--panel"
                              type={adminShowNewConfirmPassword ? 'text' : 'password'}
                              value={adminNewConfirmPassword}
                              onChange={(e) => {
                                setAdminNewConfirmPassword(e.target.value);
                                setAdminPasswordPanelError('');
                                setAdminStatus('');
                              }}
                              placeholder="Confirm new password"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              className="employee-account-modal__eyeBtn employee-account-modal__eyeBtn--sm"
                              onClick={() => setAdminShowNewConfirmPassword((v) => !v)}
                              aria-label={adminShowNewConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                              title={adminShowNewConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                            >
                              {adminShowNewConfirmPassword ? '🙈' : '👁️'}
                            </button>
                          </div>
                        </label>

                        {adminPasswordPanelError ? (
                          <div className="employee-account-modal__error" role="alert">{adminPasswordPanelError}</div>
                        ) : null}

                        <div className="employee-account-modal__adminBtnRow">
                          <button
                            type="button"
                            className="employee-account-modal__adminSaveBtn"
                            onClick={handleAdminSavePassword}
                            disabled={!isAdminPasswordPanelValid}
                          >
                            Save Password
                          </button>
                          <button
                            type="button"
                            className="employee-account-modal__adminCancelBtn"
                            onClick={handleAdminCancelChangePassword}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {adminStatus ? (
                    <div className="employee-account-modal__success" role="status">{adminStatus}</div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
