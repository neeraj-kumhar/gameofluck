const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect, authorizeAdmin } = require('../middleware/auth');
const { sequelize } = require('../config/db');

// @desc    Get all users (Admin only)
// @route   GET /api/admin/users
router.get('/users', protect, authorizeAdmin, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, count: users.length, data: users });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Update user balance (Admin only)
// @route   PATCH /api/admin/users/:id/balance
router.patch('/users/:id/balance', protect, authorizeAdmin, async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User.findByPk(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        user.balance = amount;
        await user.save();

        res.json({ success: true, data: user });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @desc    Get site statistics (Admin only)
// @route   GET /api/admin/stats
router.get('/stats', protect, authorizeAdmin, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const totalBalance = await User.sum('balance');
        const totalTransactions = await Transaction.count();
        
        // Example: Get last 24h bet volume (if table has bets)
        // const totalBets = await Transaction.sum('amount', { where: { type: 'bet' } });

        res.json({
            success: true,
            data: {
                totalUsers,
                totalBalance,
                totalTransactions,
                systemHealth: 'running'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;
