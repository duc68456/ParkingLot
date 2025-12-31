import { useEffect, useMemo, useState } from 'react';
import '../styles/components/EditEmployeeModal.css';

const closeIcon = "http://localhost:3845/assets/ea632bee3622f9ce524687f090e3e13c86ed0717.svg";
const infoIcon = "http://localhost:3845/assets/75a784162eadb383fb8b7b9265d6f214fe3ead16.svg";

const EMPLOYEE_TYPE_OPTIONS = [
  { value: 'GATE_STAFF', label: 'Gate Staff' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' }
];

const ACCOUNT_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Suspended', label: 'Suspended' }
];

export default function EditEmployeeModal({ employee, onClose, onSave }) {
  const initialForm = useMemo(() => {
    if (!employee) {
      return {
        fullName: '',
        phone: '',
        employeeType: '',
        accountStatus: 'Active'
      };
    }

    // Note: existing mock employees don't have phone, so we default to empty.
    return {
      fullName: employee.name || '',
      phone: employee.phone || '',
      employeeType: employee.role || '',
      accountStatus: employee.status || 'Active'
    };
  }, [employee]);

  const [formData, setFormData] = useState(initialForm);

  // Keep form in sync when switching selected employee while modal is open.
  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  const handleOverlayClick = () => {
    onClose?.();
  };

  const handleInnerClick = (e) => {
    e.stopPropagation();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const updatedEmployee = {
      ...employee,
      name: formData.fullName,
      phone: formData.phone,
      role: formData.employeeType,
      status: formData.accountStatus,
      initials: formData.fullName
        ? formData.fullName
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((n) => n[0]?.toUpperCase())
            .join('')
        : employee?.initials
    };

    onSave?.(updatedEmployee);
    onClose?.();
  };

  if (!employee) return null;

  return (
    <>
      <div className="edit-employee-modal-overlay" onClick={handleOverlayClick} />
      <div className="edit-employee-modal-container" onClick={handleOverlayClick}>
        <div className="edit-employee-modal" onClick={handleInnerClick}>
          <div className="edit-employee-modal__header">
            <h3 className="edit-employee-modal__title">Edit Employee</h3>
            <button className="edit-employee-modal__close" type="button" onClick={onClose} aria-label="Close">
              <img src={closeIcon} alt="" />
            </button>
          </div>

          <form className="edit-employee-modal__body" onSubmit={handleSubmit}>
            <div className="edit-employee-modal__section">
              <div className="edit-employee-modal__sectionHeader">
                <img src={infoIcon} alt="" className="edit-employee-modal__sectionIcon" />
                <h4 className="edit-employee-modal__sectionTitle">Employee Information</h4>
              </div>

              <div className="edit-employee-modal__grid">
                <div className="edit-employee-modal__field">
                  <label className="edit-employee-modal__label">
                    Full Name<span className="edit-employee-modal__required">*</span>
                  </label>
                  <input
                    type="text"
                    className="edit-employee-modal__input"
                    placeholder="Jane Smith"
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    required
                  />
                </div>

                <div className="edit-employee-modal__field">
                  <label className="edit-employee-modal__label">
                    Phone<span className="edit-employee-modal__required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="edit-employee-modal__input"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                  />
                </div>

                <div className="edit-employee-modal__field">
                  <label className="edit-employee-modal__label">
                    Employee Type<span className="edit-employee-modal__required">*</span>
                  </label>
                  <select
                    className="edit-employee-modal__select"
                    value={formData.employeeType}
                    onChange={(e) => handleChange('employeeType', e.target.value)}
                    required
                  >
                    <option value="">Select type</option>
                    {EMPLOYEE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-employee-modal__field">
                  <label className="edit-employee-modal__label">
                    Account Status<span className="edit-employee-modal__required">*</span>
                  </label>
                  <select
                    className="edit-employee-modal__select"
                    value={formData.accountStatus}
                    onChange={(e) => handleChange('accountStatus', e.target.value)}
                    required
                  >
                    {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="edit-employee-modal__footer">
              <button type="button" className="edit-employee-modal__btn edit-employee-modal__btn--cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="edit-employee-modal__btn edit-employee-modal__btn--submit">
                Update Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
