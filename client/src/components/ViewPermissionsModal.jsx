import { useEffect, useMemo } from "react";
import "../styles/components/ViewPermissionsModal.css";

function StopIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M12 2.75l7 3.2v6.07c0 4.62-3.02 8.83-7 9.98-3.98-1.15-7-5.36-7-9.98V5.95l7-3.2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PERMISSION_META = {
  view_dashboard: { category: "System", label: "View Dashboard", description: "Access to system dashboard" },
  manage_entry_exit: { category: "Parking", label: "Manage Entry/Exit", description: "Process vehicle entry and exit" },
  view_sessions: { category: "Parking", label: "View Sessions", description: "View parking sessions" },
};

const CATEGORY_META = {
  System: { caption: "SYSTEM", iconBg: "#F3E8FF", iconColor: "#9333EA" },
  Parking: { caption: "PARKING", iconBg: "#DBEAFE", iconColor: "#2563EB" },
};

function normalizeKey(key) {
  return String(key || "").trim();
}

function groupPermissions(keys) {
  const groups = {};
  keys.forEach((raw) => {
    const key = normalizeKey(raw);
    if (!key) return;

    const meta = PERMISSION_META[key] || {
      category: "Other",
      label: key
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      description: "",
    };

    const category = meta.category || "Other";
    groups[category] = groups[category] || [];
    groups[category].push({ key, ...meta });
  });

  return Object.entries(groups)
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export default function ViewPermissionsModal({ open, role, permissions, onClose }) {
  const grouped = useMemo(() => groupPermissions(Array.isArray(permissions) ? permissions : []), [permissions]);
  const total = Array.isArray(permissions) ? permissions.filter(Boolean).length : 0;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="view-perms" role="dialog" aria-modal="true" aria-label="View Permissions">
      <div className="view-perms__backdrop" onMouseDown={onClose} />

      <div className="view-perms__panel" role="document">
        <div className="view-perms__header">
          <div className="view-perms__title">View Permissions</div>
          <button type="button" className="view-perms__closeIcon" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="view-perms__body">
          <div className="view-perms__hero">
            <div className="view-perms__heroLeft">
              <div className="view-perms__heroBadge" aria-hidden="true">
                <StopIcon size={28} />
              </div>
              <div className="view-perms__heroText">
                <div className="view-perms__heroName">{role?.name || "Role"}</div>
                <div className="view-perms__heroDesc">{role?.description || ""}</div>
              </div>
            </div>

            <div className="view-perms__heroTotal" aria-label={`Total ${total}`}
            >
              <div className="view-perms__heroTotalLabel">TOTAL</div>
              <div className="view-perms__heroTotalValue">{total}</div>
            </div>
          </div>

          <div className="view-perms__groups">
            {grouped.length === 0 ? (
              <div className="view-perms__empty">
                <div className="view-perms__emptyTitle">No permissions enabled</div>
                <div className="view-perms__emptySub">This role currently has no permissions assigned.</div>
              </div>
            ) : (
              grouped.map((g) => {
                const catMeta = CATEGORY_META[g.category] || {
                  caption: String(g.category || "OTHER").toUpperCase(),
                  iconBg: "#E2E8F0",
                  iconColor: "#45556C",
                };

                return (
                  <section key={g.category} className="view-perms__group" aria-label={g.category}>
                    <div className="view-perms__groupHead">
                      <div className="view-perms__groupIcon" style={{ background: catMeta.iconBg, color: catMeta.iconColor }} aria-hidden="true">
                        <StopIcon size={20} />
                      </div>
                      <div className="view-perms__groupText">
                        <div className="view-perms__groupTitle">{catMeta.caption}</div>
                        <div className="view-perms__groupSub">
                          {g.items.length} {g.items.length === 1 ? "permission" : "permissions"} enabled
                        </div>
                      </div>
                    </div>

                    <div className="view-perms__groupBody">
                      {g.items.map((p) => (
                        <div className="view-perms__perm" key={p.key}>
                          <div className="view-perms__permCheck" aria-hidden="true">
                            <CheckIcon />
                          </div>
                          <div className="view-perms__permText">
                            <div className="view-perms__permLabel">{p.label}</div>
                            {p.description ? <div className="view-perms__permDesc">{p.description}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            )}
          </div>
        </div>

        <div className="view-perms__footer">
          <button type="button" className="view-perms__closeBtn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
