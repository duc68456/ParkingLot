import { useEffect, useMemo, useState } from "react";
import "../styles/components/EditRoleModal.css";

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

export default function EditRoleModal({ open, role, onClose, onSave }) {
  const mergedInitial = useMemo(() => {
    return {
      ...DEFAULT_VALUES,
      name: role?.name ?? "",
      description: role?.description ?? "",
    };
  }, [role]);

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
    if (!role?.id) return;

    onSave?.({
      ...role,
      name: values.name.trim(),
      description: values.description.trim(),
    });
  };

  const handleBackgroundMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div className="erm" role="dialog" aria-modal="true" onMouseDown={handleBackgroundMouseDown}>
      <div className="erm__panel">
        <div className="erm__header">
          <div className="erm__title">Edit Role</div>
          <button type="button" className="erm__close" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <form className="erm__body" onSubmit={handleSubmit}>
          <div className="erm__sectionHeader">
            <div className="erm__sectionIcon" aria-hidden="true">
              <Icon name="shield" size={24} />
            </div>
            <div className="erm__sectionText">
              <div className="erm__sectionTitle">Role Information</div>
              <div className="erm__sectionSub">Define the role name and description</div>
            </div>
          </div>

          <div className="erm__field">
            <label className="erm__label" htmlFor="erm-role-name">
              Role Name<span className="erm__required">*</span>
            </label>
            <input
              id="erm-role-name"
              className="erm__input"
              type="text"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <div className="erm__help">Choose a clear, descriptive name for this role</div>
          </div>

          <div className="erm__field">
            <label className="erm__label" htmlFor="erm-role-desc">
              Description<span className="erm__required">*</span>
            </label>
            <textarea
              id="erm-role-desc"
              className="erm__textarea"
              placeholder="Describe the role's responsibilities and access level"
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            <div className="erm__help">Explain what this role is responsible for</div>
          </div>

          <div className="erm__preview">
            <div className="erm__previewLabel">Preview</div>
            <div className="erm__previewRow">
              <div className="erm__previewIcon" aria-hidden="true">
                <Icon name="shield" size={20} />
              </div>
              <div className="erm__previewText">
                <div className="erm__previewName">{values.name || "Role"}</div>
                <div className="erm__previewDesc">{values.description || ""}</div>
              </div>
            </div>
          </div>

          <div className="erm__footer">
            <button type="submit" className="erm__primary">
              Save Changes
            </button>
            <button type="button" className="erm__secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
