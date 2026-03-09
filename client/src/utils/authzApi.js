import { getApiBaseUrl } from './apiBase'

const API_BASE_URL = getApiBaseUrl()

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function buildError(res, data, fallbackMessage) {
  const message = data?.error?.message || data?.message || fallbackMessage || `Request failed (${res.status})`;
  const err = new Error(message);
  err.status = res.status;
  err.data = data;
  return err;
}

/**
 * Roles
 */
export async function fetchRoles({ authHeaders }) {
  const res = await fetch(`${API_BASE_URL}/api/roles?limit=500`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to load roles');
  return data?.data || data;
}

export async function createRole({ authHeaders, payload }) {
  const res = await fetch(`${API_BASE_URL}/api/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    },
    body: JSON.stringify(payload || {})
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to create role');
  return data?.data || data;
}

export async function updateRole({ authHeaders, roleId, payload }) {
  const res = await fetch(`${API_BASE_URL}/api/roles/${encodeURIComponent(roleId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    },
    body: JSON.stringify(payload || {})
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to update role');
  return data?.data || data;
}

export async function deleteRole({ authHeaders, roleId }) {
  const res = await fetch(`${API_BASE_URL}/api/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to delete role');
  return data?.data || data;
}

/**
 * Permissions
 */
export async function fetchPermissions({ authHeaders }) {
  const res = await fetch(`${API_BASE_URL}/api/permissions?limit=2000`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to load permissions');
  return data?.data || data;
}

export async function fetchRolePermissions({ authHeaders, roleId }) {
  const res = await fetch(`${API_BASE_URL}/api/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to load role permissions');
  return data?.data || data;
}

export async function updateRolePermissions({ authHeaders, roleId, permissionCodes }) {
  const res = await fetch(`${API_BASE_URL}/api/roles/${encodeURIComponent(roleId)}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    },
    body: JSON.stringify({ permissions: permissionCodes || [] })
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to update role permissions');
  return data?.data || data;
}

/**
 * Employee role assignments (Access Management Hub)
 */
export async function fetchEmployeeRoles({ authHeaders, employeeBusinessId }) {
  const res = await fetch(`${API_BASE_URL}/api/employees/${encodeURIComponent(employeeBusinessId)}/roles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    }
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to load employee roles');
  return data?.data || data;
}

export async function setEmployeeRoles({ authHeaders, employeeBusinessId, roleIds }) {
  const res = await fetch(`${API_BASE_URL}/api/employees/${encodeURIComponent(employeeBusinessId)}/roles`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders || {})
    },
    body: JSON.stringify({ roleIds: roleIds || [] })
  });
  const data = await parseJsonSafe(res);
  if (!res.ok || data?.success === false) throw buildError(res, data, 'Failed to update employee roles');
  return data?.data || data;
}
