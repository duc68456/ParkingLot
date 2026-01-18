import { useMemo, useState } from "react";
import "../styles/pages/RolesPage.css";
import ManagePermissionsModal from "../components/ManagePermissionsModal";

function Icon({ name, size = 16, className = "" }) {
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
    case "lock":
      return (
        <svg {...common}>
          <path
            d="M7 11V8.5A5 5 0 0 1 17 8.5V11"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M6.5 11h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "edit":
      return (
        <svg {...common}>
          <path
            d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M6 7h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path
            d="M9 7V5.5A2 2 0 0 1 11 3.5h2a2 2 0 0 1 2 2V7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M8 7l1 14h6l1-14"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
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

const SAMPLE_ROLES = [
  {
    id: "ROLE001",
    name: "SuperAdmin",
    description: "Full system access with all permissions",
    assignedUsers: 2,
    status: "Active",
    lastUpdatedBy: "System",
  },
  {
    id: "ROLE002",
    name: "GateGuard",
    description: "Gate management and entry/exit operations",
    assignedUsers: 5,
    status: "Active",
    lastUpdatedBy: "Admin User",
  },
  {
    id: "ROLE003",
    name: "Accountant",
    description: "Financial reports and pricing management",
    assignedUsers: 3,
    status: "Active",
    lastUpdatedBy: "Admin User",
  },
  {
    id: "ROLE004",
    name: "HR Manager",
    description: "Employee and customer management",
    assignedUsers: 2,
    status: "Active",
    lastUpdatedBy: "Admin User",
  },
  {
    id: "ROLE005",
    name: "Customer Service",
    description: "Customer support and card management",
    assignedUsers: 4,
    status: "Active",
    lastUpdatedBy: "Admin User",
  },
];

function formatUsers(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? "user" : "users"}`;
}

export default function RolesPage() {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(() => ({
    ROLE001: ["view_dashboard", "manage_entry_exit", "view_sessions"],
    ROLE002: ["manage_entry_exit", "view_sessions"],
    ROLE003: [],
    ROLE004: [],
    ROLE005: [],
  }));

  // UI-only for now.
  const roles = SAMPLE_ROLES;

  const { items, total } = useMemo(() => {
    const start = (page - 1) * pageSize;
    return {
      items: roles.slice(start, start + pageSize),
      total: roles.length,
    };
  }, [page, pageSize, roles]);

  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  const openPermissions = (role) => {
    setActiveRole(role);
    setIsPermissionsOpen(true);
  };

  const closePermissions = () => {
    setIsPermissionsOpen(false);
    setActiveRole(null);
  };

  const handleSavePermissions = (selectedKeys) => {
    if (!activeRole?.id) return;
    setRolePermissions((prev) => ({ ...prev, [activeRole.id]: selectedKeys }));
    closePermissions();
  };

  return (
    <div className="roles-page" data-node-id="363:2488">
      <div className="roles-page__header">
        <div className="roles-page__title">Roles &amp; Permissions</div>
        <div className="roles-page__subtitle">Manage user roles and access control</div>
      </div>

      <ManagePermissionsModal
        open={isPermissionsOpen}
        role={activeRole}
        initialSelected={activeRole ? rolePermissions[activeRole.id] : []}
        onClose={closePermissions}
        onSave={handleSavePermissions}
      />

      <section className="roles-page__tableCard" aria-label="Roles table">
        <div className="roles-page__tableWrap">
          <table className="roles-page__table">
            <thead>
              <tr>
                <th scope="col">Role ID</th>
                <th scope="col">Role Name</th>
                <th scope="col">Assigned Users</th>
                <th scope="col">Status</th>
                <th scope="col">Last Updated By</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="roles-page__id">{r.id}</td>
                  <td>
                    <div className="roles-page__roleCell">
                      <div className="roles-page__roleIcon" aria-hidden="true">
                        <Icon name="shield" size={20} />
                      </div>
                      <div className="roles-page__roleText">
                        <div className="roles-page__roleName">{r.name}</div>
                        <div className="roles-page__roleDesc">{r.description}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="roles-page__pill roles-page__pill--blue">{formatUsers(r.assignedUsers)}</span>
                  </td>
                  <td>
                    <span className={`roles-page__pill ${r.status === "Active" ? "roles-page__pill--green" : "roles-page__pill--gray"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="roles-page__updated">{r.lastUpdatedBy}</td>
                  <td>
                    <div className="roles-page__actions" aria-label={`Actions for ${r.name}`}>
                      <button
                        type="button"
                        className="roles-page__iconBtn"
                        title="Manage permissions"
                        aria-label="Manage permissions"
                        onClick={() => openPermissions(r)}
                      >
                        <Icon name="lock" />
                      </button>
                      <button type="button" className="roles-page__iconBtn" title="Edit" aria-label="Edit">
                        <Icon name="edit" />
                      </button>
                      <button type="button" className="roles-page__iconBtn" title="Delete" aria-label="Delete">
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="roles-page__footer">
          <div className="roles-page__results">Showing {items.length} results</div>
          <div className="roles-page__pager">
            <button
              type="button"
              className="roles-page__pagerBtn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
            >
              Previous
            </button>
            <button
              type="button"
              className="roles-page__pagerBtn"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
