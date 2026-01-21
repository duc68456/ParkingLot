import { useEffect, useMemo } from "react";
import "../styles/components/ViewPermissionsModal.css";

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PERMISSION_META = {
  view_dashboard: { category: "System", label: "View Dashboard", description: "Access to system dashboard" },
  manage_entry_exit: { category: "Parking", label: "Manage Entry/Exit", description: "Process vehicle entry and exit" },
  view_sessions: { category: "Parking", label: "View Sessions", description: "View parking sessions" },
};

const CATEGORY_META = {
  System: { caption: "SYSTEM" },
  Parking: { caption: "PARKING" },
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
          <h3 className="view-perms__title">View Permissions</h3>
          <button type="button" className="view-perms__closeIcon" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="view-perms__body">
          <div className="view-perms__hero">
            <div className="view-perms__heroText">
              <div className="view-perms__heroName">{role?.name || "Role"}</div>
              <div className="view-perms__heroDesc">{role?.description || ""}</div>
            </div>
            <div className="view-perms__heroTotal" aria-label={`Total ${total}`}>
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
                };

                return (
                  <section key={g.category} className="view-perms__group" aria-label={g.category}>
                    <div className="view-perms__groupHead">
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
