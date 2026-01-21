import { useEffect, useMemo, useState } from "react";
import "../styles/components/ManagePermissionsModal.css";

const PERMISSION_CODES = Object.freeze({
  DASHBOARD_VIEW: 'DASHBOARD.VIEW',
  ENTRY_SESSIONS_VIEW: 'ENTRY_SESSIONS.VIEW',
  REPORTS_VIEW: 'REPORTS.VIEW',

  SYSTEM_CONFIG_VIEW: 'SYSTEM_CONFIG.VIEW',
  SYSTEM_CONFIG_FULL: 'SYSTEM_CONFIG.FULL',

  PEOPLE_VIEW: 'PEOPLE.VIEW',
  PEOPLE_ACCESS_HUB: 'PEOPLE.ACCESS_MANAGEMENT_HUB',
  PEOPLE_FULL: 'PEOPLE.FULL',

  VEHICLES_VIEW: 'VEHICLES.VIEW',
  VEHICLES_FULL: 'VEHICLES.FULL',

  CARDS_VIEW: 'CARDS.VIEW',
  CARDS_FULL: 'CARDS.FULL',

  SUBSCRIPTIONS_VIEW: 'SUBSCRIPTIONS.VIEW',
  SUBSCRIPTIONS_FULL: 'SUBSCRIPTIONS.FULL',

  PURCHASE_CARD_FULL: 'PURCHASE_CARD.FULL',

  PRICING_VIEW: 'PRICING.VIEW',
  PRICING_FULL: 'PRICING.FULL',

  SHIFTS_VIEW: 'SHIFTS.VIEW',
  SHIFTS_FULL: 'SHIFTS.FULL',

  ROLES_VIEW: 'ROLES.VIEW',
  ROLES_FULL: 'ROLES.FULL',

  STAFF_VIEW_FULL: 'STAFF_VIEW.FULL'
});

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 5L15 15M15 5L5 15" stroke="#62748e" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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
  const groups = useMemo(() => {
    return [
      {
        key: 'general-monitoring',
        title: 'General & Monitoring',
        description: 'Focuses on high-level data visualization, reporting, and tracking live activity.',
        sections: [
          {
            key: 'dashboard',
            title: 'Dashboard',
            items: [
              {
                key: PERMISSION_CODES.DASHBOARD_VIEW,
                title: 'Dashboard',
                desc: 'Show button: Dashboard'
              }
            ]
          },
          {
            key: 'sessions-activity',
            title: 'Sessions & Activity',
            items: [
              {
                key: PERMISSION_CODES.ENTRY_SESSIONS_VIEW,
                title: 'View Entry Sessions',
                desc: 'Show button: Sessions'
              }
            ]
          },
          {
            key: 'analytics',
            title: 'Analytics',
            items: [
              {
                key: PERMISSION_CODES.REPORTS_VIEW,
                title: 'Reports',
                desc: 'Show button: Reports'
              }
            ]
          }
        ]
      },
      {
        key: 'customer-entity',
        title: 'Customer & Entity Management',
        description: 'Focuses on the management of physical users (people) and their associated assets (vehicles).',
        sections: [
          {
            key: 'people',
            title: 'People Management',
            items: [
              {
                key: PERMISSION_CODES.PEOPLE_VIEW,
                title: 'View People',
                desc: 'Includes “View” action and “View Cards of People”. Show button: People'
              },
              {
                key: PERMISSION_CODES.PEOPLE_ACCESS_HUB,
                title: 'Employee Access',
                desc: 'Action: Access Management Hub (Employee)'
              },
              {
                key: PERMISSION_CODES.PEOPLE_FULL,
                title: 'Full Management',
                desc: 'Full actions of People page (Create, Edit, Delete, etc.)'
              }
            ]
          },
          {
            key: 'vehicles',
            title: 'Vehicle Management',
            items: [
              {
                key: PERMISSION_CODES.VEHICLES_VIEW,
                title: 'View Vehicles',
                desc: 'Includes “View Vehicle Type”. Show button: Vehicles'
              },
              {
                key: PERMISSION_CODES.VEHICLES_FULL,
                title: 'Full Management',
                desc: 'Full actions of Vehicles page'
              }
            ]
          }
        ]
      },
      {
        key: 'cards-subscriptions-sales',
        title: 'Cards, Subscriptions & Sales',
        description: 'Focuses on the issuance of credentials, billing, and recurring revenue models.',
        sections: [
          {
            key: 'cards',
            title: 'Card Management',
            items: [
              {
                key: PERMISSION_CODES.CARDS_VIEW,
                title: 'View Cards',
                desc: 'Includes view Categories, view Invoices. Show button: Cards'
              },
              {
                key: PERMISSION_CODES.CARDS_FULL,
                title: 'Full Management',
                desc: 'Full actions of Cards'
              }
            ]
          },
          {
            key: 'subscriptions',
            title: 'Subscription Management',
            items: [
              {
                key: PERMISSION_CODES.SUBSCRIPTIONS_VIEW,
                title: 'View Subscriptions',
                desc: 'Includes View Subscription Types. Show button: Subscriptions'
              },
              {
                key: PERMISSION_CODES.SUBSCRIPTIONS_FULL,
                title: 'Full Management',
                desc: 'Full actions of Subscriptions'
              }
            ]
          },
          {
            key: 'transactions',
            title: 'Transactions',
            items: [
              {
                key: PERMISSION_CODES.PURCHASE_CARD_FULL,
                title: 'Purchase Card Action',
                desc: 'Show button: Purchase Card'
              }
            ]
          }
        ]
      },
      {
        key: 'operational-configuration',
        title: 'Operational Configuration',
        description: 'Focuses on the rules, pricing, and scheduling that dictate how the system operates.',
        icon: 'parking',
        accent: 'blue',
        sections: [
          {
            key: 'pricing',
            title: 'Pricing Configuration',
            items: [
              {
                key: PERMISSION_CODES.PRICING_VIEW,
                title: 'View Pricing',
                desc: 'View Entry Pricing, Card Pricing, Subscription Pricing, and pricing history. Show button: Pricing'
              },
              {
                key: PERMISSION_CODES.PRICING_FULL,
                title: 'Full Management',
                desc: 'Full actions of Pricing'
              }
            ]
          },
          {
            key: 'shifts',
            title: 'Shift Management',
            items: [
              {
                key: PERMISSION_CODES.SHIFTS_VIEW,
                title: 'View Shifts',
                desc: 'Show button: Shifts'
              },
              {
                key: PERMISSION_CODES.SHIFTS_FULL,
                title: 'Full Management',
                desc: 'Full actions of Shifts page'
              }
            ]
          },
          {
            key: 'system-config',
            title: 'System Configuration',
            items: [
              {
                key: PERMISSION_CODES.SYSTEM_CONFIG_VIEW,
                title: 'View System Config',
                desc: 'Show button: System Config'
              },
              {
                key: PERMISSION_CODES.SYSTEM_CONFIG_FULL,
                title: 'Full Management',
                desc: 'Allow editing and saving System Config settings'
              }
            ]
          }
        ]
      },
      {
        key: 'staff-interface',
        title: 'Staff Interface',
        description: 'Permissions specific to the operational staff view, distinct from the management sidebar.',
        sections: [
          {
            key: 'staff-ops',
            title: 'Staff Operations',
            items: [
              {
                key: PERMISSION_CODES.STAFF_VIEW_FULL,
                title: 'Full actions of Staff view',
                desc: 'Full actions of Staff view'
              }
            ]
          }
        ]
      },
      {
        key: 'access-control',
        title: 'Access Control & Administration',
        description: 'Manages roles, permissions, and user access to the system.',
        sections: [
          {
            key: 'roles',
            title: 'Role Management',
            items: [
              {
                key: PERMISSION_CODES.ROLES_VIEW,
                title: 'View Roles',
                desc: 'View list of roles and their permissions. Show button: Roles'
              },
              {
                key: PERMISSION_CODES.ROLES_FULL,
                title: 'Full Management',
                desc: 'Full actions of Roles page (Create, Edit, Delete roles and manage permissions)'
              }
            ]
          }
        ]
      }
    ];
  }, []);

  const [selected, setSelected] = useState(() => normalizeSet(initialSelected));

  useEffect(() => {
    if (!open) return;
    setSelected(normalizeSet(initialSelected));
  }, [open, initialSelected]);

  const selectedCount = selected.size;

  const groupItems = (g) => g.sections.flatMap((s) => s.items);

  const groupSelectedCount = (g) =>
    groupItems(g).reduce((acc, p) => (selected.has(p.key) ? acc + 1 : acc), 0);

  const togglePermission = (permKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const selectAllInGroup = (g) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of groupItems(g)) next.add(p.key);
      return next;
    });
  };

  const isAllSelectedInGroup = (g) => groupSelectedCount(g) === groupItems(g).length;

  const handleBackgroundMouseDown = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!open) return null;

  return (
    <div className="mpm" role="dialog" aria-modal="true" onMouseDown={handleBackgroundMouseDown}>
      <div className="mpm__panel">
        <div className="mpm__header">
          <h3 className="mpm__title">Manage Permissions</h3>
          <button type="button" className="mpm__close" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="mpm__body">
          <div className="mpm__roleBanner">
            <div className="mpm__roleMeta">
              <div className="mpm__roleName">{role?.name ?? "Role"}</div>
              <div className="mpm__roleDesc">{role?.description ?? ""}</div>
            </div>
            <div className="mpm__selectedCard">
              <div className="mpm__selectedLabel">SELECTED</div>
              <div className="mpm__selectedValue">{selectedCount}</div>
            </div>
          </div>

          <div className="mpm__modules">
            {groups.map((g) => {
              const selectedInGroup = groupSelectedCount(g);
              const headMeta = `${selectedInGroup} of ${groupItems(g).length} selected`;

              return (
                <section className="mpm__module" key={g.key}>
                  <div className="mpm__moduleHeader">
                    <div className="mpm__moduleId">
                      <div className="mpm__moduleTitleWrap">
                        <div className="mpm__moduleTitle">{g.title}</div>
                        {g.description ? (
                          <div className="mpm__moduleDesc">{g.description}</div>
                        ) : null}
                        <div className="mpm__moduleMeta">{headMeta}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mpm__selectAll"
                      onClick={() => selectAllInGroup(g)}
                      disabled={isAllSelectedInGroup(g)}
                    >
                      Select All
                    </button>
                  </div>

                  <div className="mpm__moduleBody">
                    {g.sections.map((section) => (
                      <div key={section.key} className="mpm__groupSection">
                        <div className="mpm__groupSectionTitle">{section.title}</div>

                        <div className="mpm__groupSectionBody">
                          {section.items.map((p) => {
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
                                </span>
                                <span className="mpm__permText">
                                  <span className="mpm__permTitle">{p.title}</span>
                                  <span className="mpm__permDesc">{p.desc}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
