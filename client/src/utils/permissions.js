export const normalizePermission = (p) => String(p || '').trim().toUpperCase();

export const modulePermission = (moduleKey, level) => {
  const m = String(moduleKey || '').trim().toUpperCase();
  const l = String(level || '').trim().toUpperCase();
  return `${m}.${l}`;
};

export const canViewModule = (hasPermission, moduleKey) => {
  if (!hasPermission) return true;
  return (
    hasPermission(modulePermission(moduleKey, 'VIEW')) ||
    hasPermission(modulePermission(moduleKey, 'FULL'))
  );
};

export const canEditModule = (hasPermission, moduleKey) => {
  if (!hasPermission) return true;
  return hasPermission(modulePermission(moduleKey, 'FULL'));
};
