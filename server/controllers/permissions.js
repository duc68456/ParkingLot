const permissionsRouter = require('express').Router();

const Permission = require('../models/permission');
const middleware = require('../utils/middleware');

// GET /api/permissions?limit=2000
permissionsRouter.get('/', middleware.authRequired, middleware.adminOnly, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '2000', 10) || 2000, 10000);
    const permissions = await Permission.find({}, null, { sort: { Module: 1, Name: 1 }, limit }).lean();

    return res.json({ success: true, data: { permissions } });
  } catch (error) {
    console.error('Get permissions error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to get permissions', details: error.message } });
  }
});

module.exports = permissionsRouter;
