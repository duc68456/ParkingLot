import { useEffect, useMemo, useState } from "react";
import "../styles/components/ManagePermissionsModal.css";

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
    case "check":
      return (
        <svg {...common}>
          <path d="M5 12.5l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "system":
      return (
        <svg {...common}>
          <path
            d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "parking":
      return (
        <svg {...common}>
          <path
            d="M7 20V4h7a5 5 0 0 1 0 10H7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "finance":
      return (
        <svg {...common}>
          <path
            d="M6.5 8.5a5.5 5.5 0 1 1 0 7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M10 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "hr":
      return (
        <svg {...common}>
          <path
            d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M4.5 21a7.5 7.5 0 0 1 15 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case "customer":
      return (
        <svg {...common}>
          <path
            d="M16 11a4 4 0 1 0-8 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M5.5 20.5c1.9-2.6 4.3-4 6.5-4s4.6 1.4 6.5 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M12 12.2a3 3 0 1 0-3-3 3 3 0 0 0 3 3z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}

function normalizeSet(value) {
  if (!value) return new Set();
  if (value instanceof Set) return new Set(value);
  if (Array.isArray(value)) return new Set(value);
  return new Set();
}

export default function ManagePermissionsModal({
  open,
  role,
  initialSelected,
  onClose,
  onSave,
}) {
  const modules = useMemo(() => {
    // Figma-inspired sample set (UI only). Can be replaced by API data later.
    return [
      {
        key: "SYSTEM",
        title: "SYSTEM",
        meta: "1 of 2 selected",
        icon: "system",
        accent: "purple",
        permissions: [
          { key: "view_dashboard", title: "View Dashboard", desc: "Access to system dashboard" },
          { key: "system_settings", title: "System Settings", desc: "Manage system configuration" },
        ],
      },
      {
        key: "PARKING",
        title: "PARKING",
        meta: "2 of 3 selected",
        icon: "parking",
        accent: "blue",
        permissions: [
          { key: "manage_entry_exit", title: "Manage Entry/Exit", desc: "Process vehicle entry and exit" },
          { key: "view_sessions", title: "View Sessions", desc: "View parking sessions" },
          { key: "manage_vehicles", title: "Manage Vehicles", desc: "Add, edit, delete vehicles" },
        ],
      },
      {
        key: "FINANCE",
        title: "FINANCE",
        meta: "0 of 3 selected",
        icon: "finance",
        accent: "green",
        permissions: [
          { key: "view_reports", title: "View Reports", desc: "Access financial reports" },
          { key: "manage_pricing", title: "Manage Pricing", desc: "Configure pricing rules" },
          { key: "process_refunds", title: "Process Refunds", desc: "Handle refund requests" },
        ],
      },
      {
        key: "HR",
        title: "HR",
        meta: "0 of 3 selected",
        icon: "hr",
        accent: "amber",
        permissions: [
          { key: "manage_employees", title: "Manage Employees", desc: "Add, edit, delete employees" },
          { key: "view_employee_data", title: "View Employee Data", desc: "View employee information" },
          { key: "manage_shifts", title: "Manage Shifts", desc: "Schedule and manage shifts" },
        ],
      },
      {
        key: "CUSTOMER",
        title: "CUSTOMER",
        meta: "0 of 3 selected",
        icon: "customer",
        accent: "pink",
        permissions: [
          { key: "manage_customers", title: "Manage Customers", desc: "Add, edit, delete customers" },
          { key: "manage_cards", title: "Manage Cards", desc: "Issue and manage parking cards" },
          { key: "manage_subscriptions", title: "Manage Subscriptions", desc: "Handle subscription plans" },
        ],
      },
    ];
  }, []);

  const [selected, setSelected] = useState(() => normalizeSet(initialSelected));

  useEffect(() => {
    if (!open) return;
    setSelected(normalizeSet(initialSelected));
  }, [open, initialSelected]);

  const selectedCount = selected.size;

  const moduleSelectedCount = (m) =>
    m.permissions.reduce((acc, p) => (selected.has(p.key) ? acc + 1 : acc), 0);

  const togglePermission = (permKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const selectAllInModule = (m) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of m.permissions) next.add(p.key);
      return next;
    });
  };

  const isAllSelectedInModule = (m) => moduleSelectedCount(m) === m.permissions.length;

  const handleBackgroundMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div className="mpm" role="dialog" aria-modal="true" onMouseDown={handleBackgroundMouseDown}>
      <div className="mpm__panel">
        <div className="mpm__header">
          <div className="mpm__title">Manage Permissions</div>
          <button type="button" className="mpm__close" aria-label="Close" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mpm__body">
          <div className="mpm__roleBanner">
            <div className="mpm__roleBannerLeft">
              <div className="mpm__roleBadge" aria-hidden="true">
                <Icon name="shield" size={22} />
              </div>
              <div className="mpm__roleMeta">
                <div className="mpm__roleName">{role?.name ?? "Role"}</div>
                <div className="mpm__roleDesc">{role?.description ?? ""}</div>
              </div>
            </div>
            <div className="mpm__selectedCard">
              <div className="mpm__selectedLabel">Selected</div>
              <div className="mpm__selectedValue">{selectedCount}</div>
            </div>
          </div>

          <div className="mpm__modules">
            {modules.map((m) => {
              const selectedInModule = moduleSelectedCount(m);
              const headMeta = `${selectedInModule} of ${m.permissions.length} selected`;

              return (
                <section className="mpm__module" key={m.key}>
                  <div className="mpm__moduleHeader">
                    <div className="mpm__moduleId">
                      <div className={`mpm__moduleIcon mpm__moduleIcon--${m.accent}`} aria-hidden="true">
                        <Icon name={m.icon} size={18} />
                      </div>
                      <div className="mpm__moduleTitleWrap">
                        <div className="mpm__moduleTitle">{m.title}</div>
                        <div className="mpm__moduleMeta">{headMeta}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mpm__selectAll"
                      onClick={() => selectAllInModule(m)}
                      disabled={isAllSelectedInModule(m)}
                    >
                      Select All
                    </button>
                  </div>

                  <div className="mpm__moduleBody">
                    {m.permissions.map((p) => {
                      const checked = selected.has(p.key);

                      return (
                        <button
                          key={p.key}
                          type="button"
                          className={`mpm__perm ${checked ? "mpm__perm--checked" : ""}`}
                          onClick={() => togglePermission(p.key)}
                          aria-pressed={checked}
                        >
                          <span className={`mpm__checkbox ${checked ? "mpm__checkbox--checked" : ""}`} aria-hidden="true">
                            {checked ? <Icon name="check" size={14} /> : null}
                          </span>
                          <span className="mpm__permText">
                            <span className="mpm__permTitle">{p.title}</span>
                            <span className="mpm__permDesc">{p.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <div className="mpm__footer">
          <button
            type="button"
            className="mpm__primary"
            onClick={() => onSave?.(Array.from(selected))}
          >
            Save Permissions
          </button>
          <button type="button" className="mpm__secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
