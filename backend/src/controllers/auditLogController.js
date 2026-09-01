import { AuditLog } from '../models/AuditLog.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { module, action, startDate, endDate } = req.query;
    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
