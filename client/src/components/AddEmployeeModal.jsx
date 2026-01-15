import { useState } from "react";
import "../styles/components/AddEmployeeModal.css";
import infoIcon from "../assets/icons/dashboard/alert-info.svg";

export default function AddEmployeeModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    gender: "",
    employeeType: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      fullName: "",
      phone: "",
      gender: "",
      employeeType: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="add-employee-modal-overlay" onClick={handleClose}></div>
      <div className="add-employee-modal-container">
        <div className="add-employee-modal-content">
          <div className="add-employee-modal-header">
            <h3 className="add-employee-modal-title">Add Employee</h3>
            <button
              className="add-employee-modal-close-btn"
              onClick={handleClose}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 5L15 15M15 5L5 15"
                  stroke="#62748e"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <form className="add-employee-modal-body" onSubmit={handleSubmit}>
            <div className="add-employee-form-section">
              <div className="add-employee-section-header">
                <img
                  src={infoIcon}
                  alt=""
                  className="add-employee-section-icon"
                />
                <h4 className="add-employee-section-title">
                  Employee Information
                </h4>
              </div>

              <div className="add-employee-form-grid">
                <div className="add-employee-form-field">
                  <label className="add-employee-form-label">
                    Full Name<span className="add-employee-required">*</span>
                  </label>
                  <input
                    type="text"
                    className="add-employee-form-input"
                    placeholder="Jane Smith"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                  />
                </div>

                <div className="add-employee-form-field">
                  <label className="add-employee-form-label">
                    Phone<span className="add-employee-required">*</span>
                  </label>
                  <input
                    type="tel"
                    className="add-employee-form-input"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                  />
                </div>

                <div className="add-employee-form-field">
                  <label className="add-employee-form-label">
                    Employee Type
                    <span className="add-employee-required">*</span>
                  </label>
                  <select
                    className="add-employee-form-select"
                    value={formData.employeeType}
                    onChange={(e) =>
                      handleChange("employeeType", e.target.value)
                    }
                    required
                  >
                    <option value="">Select type</option>
                    <option value="STAFF">Staff</option>
                    <option value="GATE_STAFF">Gate Staff</option>
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>

                <div className="add-employee-form-field">
                  <label className="add-employee-form-label">
                    Gender<span className="add-employee-required">*</span>
                  </label>
                  <select
                    className="add-employee-form-select"
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="add-employee-modal-footer">
              <button
                type="button"
                className="add-employee-btn-cancel"
                onClick={handleClose}
              >
                Cancel
              </button>
              <button type="submit" className="add-employee-btn-submit">
                Create Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
