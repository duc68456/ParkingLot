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

// Inline SVG icons matching VehiclesTable pattern (16x16)
const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="8" cy="8" r="2" stroke="#314158" strokeWidth="1.5" fill="none" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.3333 2.00004C11.5084 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6666 1.44775C12.9146 1.44775 13.1598 1.49653 13.3886 1.59129C13.6173 1.68605 13.8249 1.82494 14 2.00004C14.1751 2.17513 14.314 2.38272 14.4088 2.61149C14.5035 2.84026 14.5523 3.08543 14.5523 3.33337C14.5523 3.58132 14.5035 3.82649 14.4088 4.05526C14.314 4.28403 14.1751 4.49162 14 4.66671L5.00001 13.6667L1.33334 14.6667L2.33334 11L11.3333 2.00004Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 4H14" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5.33334 4V2.66667C5.33334 2.48986 5.40358 2.32029 5.52861 2.19526C5.65363 2.07024 5.8232 2 6.00001 2H10C10.1768 2 10.3464 2.07024 10.4714 2.19526C10.5964 2.32029 10.6667 2.48986 10.6667 2.66667V4M12.6667 4V13.3333C12.6667 13.5101 12.5964 13.6797 12.4714 13.8047C12.3464 13.9298 12.1768 14 12 14H4.00001C3.8232 14 3.65363 13.9298 3.52861 13.8047C3.40358 13.6797 3.33334 13.5101 3.33334 13.3333V4H12.6667Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.66666 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9.33334 7.33337V11.3334" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 7V5.33333C4 4.62609 4.28095 3.94781 4.78105 3.44772C5.28115 2.94762 5.95942 2.66667 6.66667 2.66667H9.33333C10.0406 2.66667 10.7189 2.94762 11.219 3.44772C11.719 3.94781 12 4.62609 12 5.33333V7" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.33334 7H12.6667C13.403 7 14 7.59695 14 8.33333V12.6667C14 13.403 13.403 14 12.6667 14H3.33334C2.59696 14 2.00001 13.403 2.00001 12.6667V8.33333C2.00001 7.59695 2.59696 7 3.33334 7Z" stroke="#314158" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 2.29167L16.6667 5.20833V10.0417C16.6667 13.8917 13.9167 17.3583 10 18.75C6.08333 17.3583 3.33333 13.8917 3.33333 10.0417V5.20833L10 2.29167Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const SAMPLE_ROLES = [];

function formatUsers(count) {
  const n = Number(count) || 0;
  return `${n} ${n === 1 ? "user" : "users"}`;
}

export default function RolesPage() {
  const { authHeaders } = useAuth();
  const [page, setPage] = useState(1);
  const pageSize = 5;

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

  useEffect(() => {
    let mounted = true;

    const load = async () => {
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

        if (mounted) {
          setRoles(normalized);
          setPage(1);
        }
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load roles");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [authHeaders]);

  const { items, total } = useMemo(() => {
    const start = (page - 1) * pageSize;
    return {
      items: roles.slice(start, start + pageSize),
      total: roles.length,
    };
  }, [page, pageSize, roles]);

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

        <button type="button" className="roles-page__addBtn" onClick={() => setIsCreateOpen(true)}>
          <span className="roles-page__addIcon" aria-hidden="true">
            +
          </span>
          Add New Role
        </button>
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
                <th scope="col" className="roles-page__actionsHeader">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="roles-page__id">{r.id}</td>
                  <td>
                    <div className="roles-page__roleCell">
                      <div className="roles-page__roleIcon" aria-hidden="true">
                        <ShieldIcon />
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
                  <td className="roles-page__actionsCell">
                    <div className="roles-page__actions" aria-label={`Actions for ${r.name}`}>
                      <button
                        type="button"
                        className="roles-page__iconBtn roles-page__iconBtn--view"
                        title="View permissions"
                        aria-label="View permissions"
                        onClick={() => openViewPermissions(r)}
                      >
                        <ViewIcon />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn roles-page__iconBtn--lock"
                        title="Manage permissions"
                        aria-label="Manage permissions"
                        onClick={() => openPermissions(r)}
                      >
                        <LockIcon />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn roles-page__iconBtn--edit"
                        title="Edit"
                        aria-label="Edit"
                        onClick={() => openEdit(r)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="roles-page__iconBtn roles-page__iconBtn--delete"
                        title="Delete"
                        aria-label="Delete"
                        onClick={() => handleDeleteRole(r)}
                      >
                        <DeleteIcon />
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
