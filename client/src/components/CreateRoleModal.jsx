import { useEffect, useMemo, useState } from "react";
import "../styles/components/CreateRoleModal.css";

function Icon({ name, size = 20, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    "aria-hidden": true,
    focusable: false,
  };

  switch (name) {
    case "x":
      return (
        <svg {...common}>
          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    // Shield icon to match the Figma header card.
    case "shield":
      return (
        <svg {...common}>
          <path
            d="M12 2.75l7 3.2v6.07c0 4.62-3.02 8.83-7 9.98-3.98-1.15-7-5.36-7-9.98V5.95l7-3.2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return null;
  }
}

const DEFAULT_VALUES = {
  name: "",
  description: "",
};

export default function CreateRoleModal({
  open,
  initialValues,
  onClose,
  onCreate,
}) {
  const mergedInitial = useMemo(
    () => ({ ...DEFAULT_VALUES, ...(initialValues || {}) }),
    [initialValues]
  );

  const [values, setValues] = useState(mergedInitial);

  useEffect(() => {
    if (!open) return;
    setValues(mergedInitial);
  }, [open, mergedInitial]);

  const setField = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    onCreate?.({
      name: values.name.trim(),
      description: values.description.trim(),
    });
  };

  const handleBackgroundMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div className="crm" role="dialog" aria-modal="true" onMouseDown={handleBackgroundMouseDown}>
      <div className="crm__panel">
        <div className="crm__header">
          <div className="crm__title">Create New Role</div>
          <button type="button" className="crm__close" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form className="crm__body" onSubmit={handleSubmit}>
          <div className="crm__sectionHeader">
            <div className="crm__sectionIcon" aria-hidden="true">
              <Icon name="shield" size={24} />
            </div>
            <div className="crm__sectionText">
              <div className="crm__sectionTitle">Role Information</div>
              <div className="crm__sectionSub">Define the role name and description</div>
            </div>
          </div>

          <div className="crm__field">
            <label className="crm__label" htmlFor="crm-role-name">
              Role Name<span className="crm__required">*</span>
            </label>
            <input
              id="crm-role-name"
              className="crm__input"
              type="text"
              placeholder="e.g., Manager, Supervisor, Operator"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <div className="crm__help">Choose a clear, descriptive name for this role</div>
          </div>

          <div className="crm__field">
            <label className="crm__label" htmlFor="crm-role-desc">
              Description<span className="crm__required">*</span>
            </label>
            <textarea
              id="crm-role-desc"
              className="crm__textarea"
              placeholder="Describe the role's responsibilities and access level"
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            <div className="crm__help">Explain what this role is responsible for</div>
          </div>

          <div className="crm__footer">
            <button type="submit" className="crm__primary">
              Create Role
            </button>
            <button type="button" className="crm__secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
