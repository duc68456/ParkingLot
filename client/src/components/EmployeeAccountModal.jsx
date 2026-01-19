import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/EmployeeAccountModal.css';
import { fetchEmployeeRoles, fetchRoles, setEmployeeRoles } from '../utils/authzApi';

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

function hasPinAccount(employee) {
  // The project currently doesn't fetch/display the current PIN value for security.
  // We treat the account as existing if a staffAccount-like object or flag is present.
  const staffAccount = employee?.staffAccount ?? employee?.StaffAccount ?? employee?.staff_account ?? null;
  if (staffAccount) return true;

  const flags = [
    employee?.hasPinAccount,
    employee?.HasPinAccount,
    employee?.has_pin_account,
    employee?.hasPin,
    employee?.HasPin,
    employee?.has_pin
  ];
  if (flags.some((v) => v === true)) return true;

  // If the backend provides an account status for the PIN account.
  const pinStatus = employee?.pinAccountStatus ?? employee?.PinAccountStatus ?? employee?.pin_account_status;
  if (typeof pinStatus === 'string' && pinStatus.trim()) return true;

  return false;
}

function hasAdminAccount(employee) {
  // We treat an admin account as existing if we have a username/email-like field.
  const candidates = [
    employee?.adminUsername,
    employee?.admin_username,
    employee?.AdminUsername,
    employee?.adminEmail,
    employee?.admin_email,
    employee?.AdminEmail,
    employee?.username,
    employee?.Username,
    employee?.email,
    employee?.Email
  ];
  return candidates.some((v) => typeof v === 'string' && v.trim());
}

function KeyIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13.5 10.5a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Zm0 0 7.3 0c.66 0 1.2.54 1.2 1.2v1.1c0 .55-.45 1-1 1h-1.1v1.1c0 .55-.45 1-1 1H17.8v1.1c0 .55-.45 1-1 1H15"
        stroke="#9810FA"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.2 10.5h.01"
        stroke="#9810FA"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M7 11V8.8C7 6.15 9.15 4 11.8 4h.4C14.85 4 17 6.15 17 8.8V11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6.5 11h11c.83 0 1.5.67 1.5 1.5v6.5c0 .83-.67 1.5-1.5 1.5h-11c-.83 0-1.5-.67-1.5-1.5V12.5c0-.83.67-1.5 1.5-1.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 15.2v2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function EmployeeAccountModal({ employee, onClose }) {
  const { authHeaders } = useAuth();
  const initials = getEmployeeInitials(employee);
  const name = getEmployeeDisplayName(employee);
  const employeeType = normalizeEmployeeType(employee);

  // Hub state
  const [activeTab, setActiveTab] = useState('pin'); // 'pin' | 'admin'
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [roleLoading, setRoleLoading] = useState(false);

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

  // Create Admin Account form (UI-only to match Figma empty-state)
  const [adminCreateUsername, setAdminCreateUsername] = useState('');
  const [adminCreatePassword, setAdminCreatePassword] = useState('');
  const [adminCreateConfirmPassword, setAdminCreateConfirmPassword] = useState('');
  const [adminShowCreatePassword, setAdminShowCreatePassword] = useState(false);
  const [adminShowCreateConfirmPassword, setAdminShowCreateConfirmPassword] = useState(false);
  const [adminCreateError, setAdminCreateError] = useState('');

  if (!employee) return null;

  const isStaff = employeeType === 'STAFF' || employeeType === 'GATE_STAFF';
  const username = employee?.id || employee?.ID || '';
  const pinAccountExists = hasPinAccount(employee);
  const adminAccountExists = hasAdminAccount(employee);

  const adminDisplayUsername = String(
    employee?.adminUsername ||
      employee?.AdminUsername ||
      employee?.admin_username ||
      employee?.adminEmail ||
      employee?.AdminEmail ||
      employee?.admin_email ||
      employee?.username ||
      employee?.Username ||
      employee?.email ||
      employee?.Email ||
      username ||
      ''
  ).trim();

  const status = employee?.Status || employee?.status || 'Active';

  const isAdminPasswordPanelValid = useMemo(() => {
    if (!adminNewPassword) return false;
    if (!adminNewConfirmPassword) return false;
    if (adminNewPassword !== adminNewConfirmPassword) return false;
    return true;
  }, [adminNewPassword, adminNewConfirmPassword]);

  const roleOptions = useMemo(() => {
    if (availableRoles?.length) {
      return availableRoles.map((r) => ({
        key: r.id,
        title: r.name,
        description: r.description || '—'
      }));
    }
    // Fallback to empty list if server doesn't support roles yet.
    return [];
  }, [availableRoles]);

  // Load roles + employee role assignment once when modal opens.
  // NOTE: employee business id is usually EMP#### in this codebase.
  const employeeBusinessId = String(employee?.id || employee?.ID || '').trim();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!employeeBusinessId) return;

      setRoleLoading(true);
      setError('');
      try {
        const rolesData = await fetchRoles({ authHeaders });
        const list = Array.isArray(rolesData?.roles) ? rolesData.roles : Array.isArray(rolesData) ? rolesData : rolesData?.data?.roles;
        const normalizedRoles = (list || []).map((r) => ({
          id: r?.ID || r?.id || r?._id,
          name: r?.Name || r?.name || '',
          description: r?.Description || r?.description || ''
        })).filter((r) => r.id);

        const empRolesData = await fetchEmployeeRoles({ authHeaders, employeeBusinessId });
        const roleIds = empRolesData?.roleIds || empRolesData?.data?.roleIds || empRolesData?.roles || [];
        const normalizedRoleIds = Array.from(
          new Set((Array.isArray(roleIds) ? roleIds : []).map((x) => String(x || '').trim()).filter(Boolean))
        );

        if (!cancelled) {
          setAvailableRoles(normalizedRoles);
          setSelectedRoleIds(normalizedRoleIds);
        }
      } catch (e) {
        if (!cancelled) {
          // Keep UI usable even if roles are not yet available.
          setAvailableRoles([]);
          setSelectedRoleIds([]);
          setError(e?.message || 'Failed to load roles for employee');
        }
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [employeeBusinessId, authHeaders]);

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

    setAdminCreateUsername('');
    setAdminCreatePassword('');
    setAdminCreateConfirmPassword('');
    setAdminShowCreatePassword(false);
    setAdminShowCreateConfirmPassword(false);
    setAdminCreateError('');
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

  const handleAdminCreateAccount = async (e) => {
    e?.preventDefault?.();
    setAdminCreateError('');
    setAdminStatus('');

    const u = String(adminCreateUsername || '').trim();
    if (!u) {
      setAdminCreateError('Username is required.');
      return;
    }
    if (!adminCreatePassword) {
      setAdminCreateError('Password is required.');
      return;
    }
    if (adminCreatePassword.length < 6) {
      setAdminCreateError('Password must be at least 6 characters.');
      return;
    }
    if (adminCreatePassword !== adminCreateConfirmPassword) {
      setAdminCreateError('Passwords do not match.');
      return;
    }

    // UI-only placeholder for now.
    setAdminStatus('Admin account created (UI-only). Backend wiring pending.');
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

          <div className="employee-account-modal__roleGrid" role="group" aria-label="Role Management (multi-select)">
            {roleOptions.map((opt) => {
              const checked = selectedRoleIds.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`employee-account-modal__roleCard ${checked ? 'employee-account-modal__roleCard--selected' : ''}`}
                  onClick={async () => {
                    if (!opt?.key || !employeeBusinessId) return;
                    setSubmitting(true);
                    setError('');
                    setStatusMessage('');
                    try {
                      const nextRoleIds = checked
                        ? selectedRoleIds.filter((id) => id !== opt.key)
                        : [...selectedRoleIds, opt.key];

                      await setEmployeeRoles({ authHeaders, employeeBusinessId, roleIds: nextRoleIds });
                      setSelectedRoleIds(nextRoleIds);
                      setStatusMessage('Role updated successfully.');
                    } catch (e) {
                      setError(e?.message || 'Failed to update role');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  aria-pressed={checked}
                  disabled={roleLoading || submitting}
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

          {!roleLoading && roleOptions.length ? (
            <div className="employee-account-modal__assignedBox" aria-label="Assigned roles">
              <div className="employee-account-modal__assignedLabel">Assigned:</div>
              <div className="employee-account-modal__assignedChips">
                {selectedRoleIds.length ? (
                  selectedRoleIds.map((id) => {
                    const title = roleOptions.find((r) => r.key === id)?.title || id;
                    return (
                      <span key={id} className="employee-account-modal__assignedChip">
                        <span className="employee-account-modal__assignedChipText">{title}</span>
                        <button
                          type="button"
                          className="employee-account-modal__assignedChipRemove"
                          aria-label={`Remove ${title}`}
                          onClick={async () => {
                            if (!employeeBusinessId) return;
                            setSubmitting(true);
                            setError('');
                            setStatusMessage('');
                            try {
                              const nextRoleIds = selectedRoleIds.filter((rid) => rid !== id);
                              await setEmployeeRoles({ authHeaders, employeeBusinessId, roleIds: nextRoleIds });
                              setSelectedRoleIds(nextRoleIds);
                              setStatusMessage('Role updated successfully.');
                            } catch (e) {
                              setError(e?.message || 'Failed to update role');
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          disabled={submitting}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span className="employee-account-modal__assignedEmpty">None</span>
                )}
              </div>
            </div>
          ) : null}

          {roleLoading ? (
            <div className="employee-account-modal__success" role="status">Loading roles…</div>
          ) : null}

          <div className="employee-account-modal__tabSwitch" role="tablist" aria-label="Account Type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pin'}
              className={`employee-account-modal__tab ${activeTab === 'pin' ? 'employee-account-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('pin')}
            >
              <span className="employee-account-modal__tabIcon" aria-hidden="true">▢</span>
              PIN Account
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'admin'}
              className={`employee-account-modal__tab ${activeTab === 'admin' ? 'employee-account-modal__tab--active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span className="employee-account-modal__tabIcon" aria-hidden="true">▢</span>
              Admin Account
            </button>
          </div>

          {activeTab === 'pin' ? (
            <div className="employee-account-modal__pinHub" role="tabpanel" aria-label="PIN Account">
              {!pinAccountExists && !generatedPin ? (
                <div className="employee-account-modal__pinEmpty" role="status" aria-label="No PIN Account">
                  <div className="employee-account-modal__pinEmptyIcon" aria-hidden="true">
                    <KeyIcon size={32} />
                  </div>
                  <div className="employee-account-modal__pinEmptyTitle">No PIN Account</div>
                  <div className="employee-account-modal__pinEmptySub">
                    This employee doesn&apos;t have a PIN account yet. Create one to enable gate access.
                  </div>
                  <button
                    type="button"
                    className="employee-account-modal__pinEmptyCta"
                    onClick={handleGenerateNewPin}
                    disabled={!isStaff || submitting}
                    title={!isStaff ? 'PIN is only available for staff accounts' : 'Create PIN account'}
                  >
                    Create PIN Account
                  </button>
                </div>
              ) : (
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
              )}

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
              {!adminAccountExists ? (
                <div className="employee-account-modal__adminCard employee-account-modal__adminCard--create">
                  <div className="employee-account-modal__adminCardHeader">
                    <div className="employee-account-modal__adminCardIcon employee-account-modal__adminCardIcon--create" aria-hidden="true">
                      <LockIcon size={24} />
                    </div>
                    <div className="employee-account-modal__adminCardHeading">
                      <div className="employee-account-modal__adminTitle">Create Admin Account</div>
                      <div className="employee-account-modal__adminTitleSub">Set up username and password for admin access</div>
                    </div>
                  </div>

                  <form className="employee-account-modal__adminForm" onSubmit={handleAdminCreateAccount}>
                    <div className="employee-account-modal__field">
                      <span className="employee-account-modal__label">Username</span>
                      <input
                        className="employee-account-modal__input"
                        placeholder="Enter username"
                        value={adminCreateUsername}
                        onChange={(e) => setAdminCreateUsername(e.target.value)}
                      />
                    </div>

                    <div className="employee-account-modal__field">
                      <span className="employee-account-modal__label">Password</span>
                      <div className="employee-account-modal__passwordWrap">
                        <input
                          className="employee-account-modal__input employee-account-modal__input--password"
                          type={adminShowCreatePassword ? 'text' : 'password'}
                          placeholder="Enter password"
                          value={adminCreatePassword}
                          onChange={(e) => setAdminCreatePassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="employee-account-modal__eyeBtn"
                          onClick={() => setAdminShowCreatePassword((v) => !v)}
                          aria-label={adminShowCreatePassword ? 'Hide password' : 'Show password'}
                        >
                          {adminShowCreatePassword ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>

                    <div className="employee-account-modal__field">
                      <span className="employee-account-modal__label">Confirm Password</span>
                      <div className="employee-account-modal__passwordWrap">
                        <input
                          className="employee-account-modal__input employee-account-modal__input--password"
                          type={adminShowCreateConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm password"
                          value={adminCreateConfirmPassword}
                          onChange={(e) => setAdminCreateConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="employee-account-modal__eyeBtn"
                          onClick={() => setAdminShowCreateConfirmPassword((v) => !v)}
                          aria-label={adminShowCreateConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {adminShowCreateConfirmPassword ? '🙈' : '👁'}
                        </button>
                      </div>
                    </div>

                    {adminCreateError ? (
                      <div className="employee-account-modal__error" role="alert">{adminCreateError}</div>
                    ) : null}
                    {adminStatus ? (
                      <div className="employee-account-modal__success" role="status">{adminStatus}</div>
                    ) : null}

                    <button type="submit" className="employee-account-modal__adminCreateBtn">Create Admin Account</button>
                  </form>
                </div>
              ) : (
                <div className="employee-account-modal__adminCard employee-account-modal__adminCard--change">
                  <div className="employee-account-modal__adminCardHeader">
                    <div className="employee-account-modal__adminCardIcon" aria-hidden="true">
                      <LockIcon size={24} />
                    </div>
                    <div className="employee-account-modal__adminCardHeading">
                      <div className="employee-account-modal__adminTitleCaps">ADMIN ACCOUNT</div>
                      <div className="employee-account-modal__adminSub">Manage admin credentials</div>
                    </div>
                  </div>

                  <div className="employee-account-modal__adminForm">
                    <div className="employee-account-modal__field employee-account-modal__field--readonly">
                      <span className="employee-account-modal__label employee-account-modal__label--caps">USERNAME</span>
                      <div className="employee-account-modal__readonly employee-account-modal__readonly--mono">{adminDisplayUsername || '—'}</div>
                    </div>

                    <div className="employee-account-modal__field">
                      <span className="employee-account-modal__label employee-account-modal__label--caps">PASSWORD</span>
                      {!adminIsChangingPassword ? (
                        <>
                          <div className="employee-account-modal__readonly employee-account-modal__readonly--masked employee-account-modal__readonly--mono" aria-label="Masked password">••••••••••••</div>
                          <button
                            type="button"
                            className="employee-account-modal__adminPrimaryBtn"
                            onClick={handleAdminOpenChangePassword}
                          >
                            Change Password
                          </button>

                          <div className="employee-account-modal__adminMiniMeta employee-account-modal__adminMiniMeta--inPanel">
                            <div className="employee-account-modal__adminMiniMetaItem">
                              <div className="employee-account-modal__adminMiniMetaK">Employee ID</div>
                              <div className="employee-account-modal__adminMiniMetaV">{username || '—'}</div>
                            </div>
                            <div className="employee-account-modal__adminMiniMetaItem">
                              <div className="employee-account-modal__adminMiniMetaK">Account Status</div>
                              <div className="employee-account-modal__adminMiniMetaV">{status}</div>
                            </div>
                          </div>
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
