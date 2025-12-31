import { useMemo } from 'react';
import '../styles/components/ViewEmployeeModal.css';

function formatMaybeDate(value) {
  if (!value) return '—';
  // Keep it simple: if the app already provides formatted dates (e.g., 01/01/2022), show as-is.
  return String(value);
}

export default function ViewEmployeeModal({ employee, onClose }) {
  const initials = useMemo(() => {
    if (!employee) return '';
    if (employee.initials) return employee.initials;
    const parts = String(employee.name || '').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  }, [employee]);

  if (!employee) return null;

  const name = employee.name || '—';
  const role = employee.role || '—';
  const status = employee.status || '—';

  const phone = employee.phone || employee.phoneNumber || '—';
  const employeeType = employee.employeeType || employee.type || role;
  const accountStatus = employee.accountStatus || status;
  const hiredDate = formatMaybeDate(employee.hiredDate);

  const handleOverlayMouseDown = (e) => {
    // Close only if clicking the backdrop.
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="view-employee-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="view-employee-modal" role="dialog" aria-modal="true" aria-label="Employee Details">
        <div className="view-employee-modal__header">
          <div className="view-employee-modal__title">Employee Details</div>
          <button className="view-employee-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="view-employee-modal__body">
          <div className="view-employee-modal__top">
            <div className="view-employee-modal__avatar" aria-hidden="true">{initials}</div>

            <div className="view-employee-modal__who">
              <div className="view-employee-modal__name">{name}</div>
              <div className="view-employee-modal__role">{role}</div>
              <div className="view-employee-modal__status">
                <span className="view-employee-modal__status-pill">
                  {accountStatus}
                </span>
              </div>
            </div>
          </div>

          <div className="view-employee-modal__divider" />

          <div className="view-employee-modal__grid">
            <div className="view-employee-modal__field">
              <div className="view-employee-modal__label">PHONE</div>
              <div className="view-employee-modal__value">{phone}</div>
            </div>

            <div className="view-employee-modal__field">
              <div className="view-employee-modal__label">EMPLOYEE TYPE</div>
              <div className="view-employee-modal__value">{employeeType}</div>
            </div>

            <div className="view-employee-modal__field">
              <div className="view-employee-modal__label">ACCOUNT STATUS</div>
              <div className="view-employee-modal__value">{accountStatus}</div>
            </div>

            <div className="view-employee-modal__field">
              <div className="view-employee-modal__label">HIRED DATE</div>
              <div className="view-employee-modal__value">{hiredDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
