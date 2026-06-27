const express = require('express');
const router = express.Router();
const db = require('../db/helpers');
const { verifyAdmin } = require('../middleware/auth');

// GET /api/admin-dashboard
router.get('/admin-dashboard', verifyAdmin, async (req, res) => {
  try {
    const completedOrders = await db.get("SELECT COUNT(*) as c, SUM(price) as t FROM orders WHERE status = 'completed'");
    const totalRevenue = completedOrders ? (completedOrders.t || 0.0) : 0.0;
    const totalOrders = completedOrders ? (completedOrders.c || 0) : 0;

    const userCount = await db.get("SELECT COUNT(*) as c FROM users");
    const totalUsers = userCount ? (userCount.c || 0) : 0;

    const todayStr = new Date().toISOString().split('T')[0] + ' 00:00:00';
    // Handle both ISO time and simple date strings by checking >= start of today
    const todayRevenueRow = await db.get(
      "SELECT SUM(price) as t FROM orders WHERE status = 'completed' AND datetime(created_at) >= datetime(?)",
      [todayStr]
    );
    const todayRevenue = todayRevenueRow ? (todayRevenueRow.t || 0.0) : 0.0;

    const pendingRow = await db.get("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'");
    const pendingOrders = pendingRow ? (pendingRow.c || 0) : 0;

    const gamesRow = await db.get("SELECT COUNT(*) as c FROM games");
    const totalGames = gamesRow ? (gamesRow.c || 0) : 0;

    return res.status(200).json({
      success: true,
      dashboard: {
        total_revenue: totalRevenue,
        today_revenue: todayRevenue,
        total_orders: totalOrders,
        pending_orders: pendingOrders,
        total_users: totalUsers,
        total_games: totalGames
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

module.exports = router;
