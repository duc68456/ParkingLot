import { useEffect, useMemo, useState } from "react";
import "../styles/pages/RolesPage.css";
import ManagePermissionsModal from "../components/ManagePermissionsModal";
import CreateRoleModal from "../components/CreateRoleModal";
import EditRoleModal from "../components/EditRoleModal";
import ViewPermissionsModal from "../components/ViewPermissionsModal";
import { useAuth } from "../contexts/AuthContext";
import {
  createRole,
  deleteRole,
  fetchRolePermissions,
  fetchRoles,
  updateRole,
  updateRolePermissions
} from "../utils/authzApi";

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
    case "refresh":
      return (
        <svg {...common}>
          <path
            d="M20 12a8 8 0 0 1-13.66 5.66"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M4 12a8 8 0 0 1 13.66-5.66"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M20 4v5h-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 20v-5h5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "eye":
      return (
        <svg {...common}>
          <path
            d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );
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

const SAMPLE_ROLES = [];

function formatUsers(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? "user" : "users"}`;
}

export default function RolesPage() {
  const { authHeaders } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [searchQuery, setSearchQuery] = useState('');

  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState(() => ({
    // Map roleId -> permissionCodes[]
  }));

  const [roles, setRoles] = useState(SAMPLE_ROLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadRoles = async ({ resetPage = true } = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRoles({ authHeaders });
      const list = Array.isArray(data?.roles) ? data.roles : Array.isArray(data) ? data : data?.data?.roles;

      // Normalize to RolesPage shape: { id, name, description, assignedUsers, status, lastUpdatedBy }
      const normalized = (list || []).map((r) => ({
        id: r?.ID || r?.id || r?._id,
        name: r?.Name || r?.name || "",
        description: r?.Description || r?.description || "",
        assignedUsers: r?.AssignedUsers ?? r?.assignedUsers ?? 0,
        status: r?.IsActive === false || String(r?.Status || "").toLowerCase() === "inactive" ? "Inactive" : "Active",
        lastUpdatedBy: r?.UpdatedBy || r?.lastUpdatedBy || "—",
      }));

      setRoles(normalized);
      if (resetPage) setPage(1);
    } catch (e) {
      setError(e?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    loadRoles({ resetPage: true });
    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  // Ensure page resets when searching
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const filteredRoles = useMemo(() => {
    const q = String(searchQuery || '').trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => {
      const name = String(r?.name || '').toLowerCase();
      const desc = String(r?.description || '').toLowerCase();
      const id = String(r?.id || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || id.includes(q);
    });
  }, [roles, searchQuery]);

  const { items, total } = useMemo(() => {
    const start = (page - 1) * pageSize;
    return {
      items: filteredRoles.slice(start, start + pageSize),
      total: filteredRoles.length,
    };
  }, [filteredRoles, page, pageSize]);

  const canPrev = page > 1;
  const canNext = page * pageSize < total;

  const openPermissions = async (role) => {
    setActiveRole(role);
    // Lazy-load permissions for this role the first time we open it.
    if (role?.id && !Array.isArray(rolePermissions?.[role.id])) {
      try {
        const data = await fetchRolePermissions({ authHeaders, roleId: role.id });
        const perms = data?.permissions || data?.data?.permissions || data || [];
        setRolePermissions((prev) => ({ ...prev, [role.id]: Array.isArray(perms) ? perms : [] }));
      } catch {
        // If it fails, keep empty; modal will still open.
        setRolePermissions((prev) => ({ ...prev, [role.id]: [] }));
      }
    }
    setIsPermissionsOpen(true);
  };

  const openViewPermissions = async (role) => {
    setActiveRole(role);
    if (role?.id && !Array.isArray(rolePermissions?.[role.id])) {
      try {
        const data = await fetchRolePermissions({ authHeaders, roleId: role.id });
        const perms = data?.permissions || data?.data?.permissions || data || [];
        setRolePermissions((prev) => ({ ...prev, [role.id]: Array.isArray(perms) ? perms : [] }));
      } catch {
        setRolePermissions((prev) => ({ ...prev, [role.id]: [] }));
      }
    }
    setIsViewOpen(true);
  };

  const openEdit = (role) => {
    setActiveRole(role);
    setIsEditOpen(true);
  };

  const closePermissions = () => {
    setIsPermissionsOpen(false);
    setActiveRole(null);
  };

  const closeViewPermissions = () => {
    setIsViewOpen(false);
    setActiveRole(null);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setActiveRole(null);
  };

  const handleSavePermissions = async (selectedKeys) => {
    if (!activeRole?.id) return;
    setError("");
    try {
      await updateRolePermissions({ authHeaders, roleId: activeRole.id, permissionCodes: selectedKeys });
      setRolePermissions((prev) => ({ ...prev, [activeRole.id]: selectedKeys }));
      closePermissions();
    } catch (e) {
      setError(e?.message || "Failed to update role permissions");
    }
  };

  const handleCreateRole = async (payload) => {
    const name = payload?.name?.trim();
    const description = payload?.description?.trim();
    if (!name || !description) {
      closeCreate();
      return;
    }

    setError("");
    try {
      const created = await createRole({
        authHeaders,
        payload: {
          Name: name,
          Description: description,
          IsActive: true
        }
      });

      const role = created?.role || created?.data?.role || created;
      const normalized = {
        id: role?.ID || role?.id || role?._id,
        name: role?.Name || role?.name || name,
        description: role?.Description || role?.description || description,
        assignedUsers: role?.AssignedUsers ?? role?.assignedUsers ?? 0,
        status: role?.IsActive === false || String(role?.Status || "").toLowerCase() === "inactive" ? "Inactive" : "Active",
        lastUpdatedBy: role?.UpdatedBy || role?.lastUpdatedBy || "—",
      };

      setRoles((prev) => [normalized, ...prev]);
      setRolePermissions((prev) => ({ ...prev, [normalized.id]: [] }));
      closeCreate();
    } catch (e) {
      setError(e?.message || "Failed to create role");
    }
  };

  const handleSaveRole = async (updatedRole) => {
    if (!updatedRole?.id) {
      closeEdit();
      return;
    }

    setError("");
    try {
      const saved = await updateRole({
        authHeaders,
        roleId: updatedRole.id,
        payload: {
          Name: updatedRole.name,
          Description: updatedRole.description,
          IsActive: updatedRole.status === "Active"
        }
      });

      const role = saved?.role || saved?.data?.role || saved;
      const normalized = {
        id: role?.ID || role?.id || updatedRole.id,
        name: role?.Name || role?.name || updatedRole.name,
        description: role?.Description || role?.description || updatedRole.description,
        assignedUsers: role?.AssignedUsers ?? role?.assignedUsers ?? updatedRole.assignedUsers ?? 0,
        status: role?.IsActive === false || String(role?.Status || "").toLowerCase() === "inactive" ? "Inactive" : "Active",
        lastUpdatedBy: role?.UpdatedBy || role?.lastUpdatedBy || updatedRole.lastUpdatedBy || "—",
      };

      setRoles((prev) => prev.map((r) => (r.id === normalized.id ? { ...r, ...normalized } : r)));
      closeEdit();
    } catch (e) {
      setError(e?.message || "Failed to update role");
    }
  };

  const handleDeleteRole = async (role) => {
    if (!role?.id) return;
    // Basic confirm to avoid accidental deletions.
    const ok = window.confirm(`Delete role ${role.name || role.id}?`);
    if (!ok) return;

    setError("");
    try {
      await deleteRole({ authHeaders, roleId: role.id });
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setRolePermissions((prev) => {
        const next = { ...prev };
        delete next[role.id];
        return next;
      });
    } catch (e) {
      setError(e?.message || "Failed to delete role");
    }
  };

  return (
    <div className="roles-page" data-node-id="363:2488">
      <div className="roles-page__top">
        <div className="roles-page__header">
          <div className="roles-page__title">Roles &amp; Permissions</div>
          <div className="roles-page__subtitle">Manage user roles and access control</div>
        </div>

        <div className="roles-page__topActions" aria-label="Role list actions">
          <div className="roles-page__search">
            <input
              type="search"
              className="roles-page__searchInput"
              placeholder="Search roles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="roles-page__iconOnlyBtn"
            onClick={() => loadRoles({ resetPage: false })}
            title="Refresh"
            aria-label="Refresh"
            disabled={loading}
          >
            <Icon name="refresh" />
          </button>

          <button type="button" className="roles-page__addBtn" onClick={() => setIsCreateOpen(true)}>
            <span className="roles-page__addIcon" aria-hidden="true">
              +
            </span>
            Add New Role
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 16, color: "#6B7280" }}>Loading roles…</div>
      ) : null}
      {error ? (
        <div style={{ padding: 16, color: "#B91C1C" }}>{error}</div>
      ) : null}

      <ManagePermissionsModal
        open={isPermissionsOpen}
        role={activeRole}
        initialSelected={activeRole ? rolePermissions[activeRole.id] : []}
        onClose={closePermissions}
        onSave={handleSavePermissions}
      />

      <ViewPermissionsModal
        open={isViewOpen}
        role={activeRole}
        permissions={activeRole ? rolePermissions[activeRole.id] : []}
        onClose={closeViewPermissions}
      />

      <CreateRoleModal open={isCreateOpen} onClose={closeCreate} onCreate={handleCreateRole} />
      <EditRoleModal open={isEditOpen} role={activeRole} onClose={closeEdit} onSave={handleSaveRole} />

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
                        title="View permissions"
                        aria-label="View permissions"
                        onClick={() => openViewPermissions(r)}
                      >
                        <Icon name="eye" />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn"
                        title="Manage permissions"
                        aria-label="Manage permissions"
                        onClick={() => openPermissions(r)}
                      >
                        <Icon name="lock" />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => openEdit(r)}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => handleDeleteRole(r)}
                      >
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
