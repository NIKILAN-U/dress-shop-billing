import { AuditLog } from '../models/AuditLog.js';

export const logAudit = async ({ user, action, module, recordId, details, oldValue, newValue, req }) => {
  try {
    await AuditLog.create({
      user: user?._id || user?.id,
      userName: user?.name || 'System',
      userRole: user?.role || 'system',
      action,
      module,
      recordId: recordId ? String(recordId) : undefined,
      details,
      oldValue,
      newValue,
      ipAddress: req ? req.ip : 'local'
    });
  } catch (err) {
    console.error('[Audit Logger Error]', err.message);
  }
};
