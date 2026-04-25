const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// @desc    Recharge Wallet
// @route   POST /api/wallet/recharge
// @access  Private
router.post('/recharge', protect, async (req, res) => {
    try {
        const { amount, referenceId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Please provide a valid amount' });
        }

        // Add money to user balance
        const user = await User.findByPk(req.user.id);
        user.balance = (user.balance || 0) + parseFloat(amount);
        await user.save();

        // Create Transaction record
        const transaction = await Transaction.create({
            amount,
            type: 'deposit',
            status: 'success',
            paymentMethod: 'UPI',
            referenceId,
            UserId: user.id
        });

        res.status(200).json({
            success: true,
            balance: user.balance,
            transaction
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Get Transaction History
// @route   GET /api/wallet/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const transactions = await Transaction.findAll({
            where: { UserId: req.user.id },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            transactions
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// @desc    Update Balance (Bet or Win)
// @route   POST /api/wallet/update-balance
// @access  Private
router.post('/update-balance', protect, async (req, res) => {
    try {
        const { amount, type, referenceId } = req.body; 
        // amount can be negative for bets, positive for wins

        const user = await User.findByPk(req.user.id);
        
        if (type === 'bet' && user.balance < Math.abs(amount)) {
            return res.status(400).json({ success: false, error: 'Insufficient balance' });
        }

        user.balance += parseFloat(amount);
        await user.save();

        // Log transaction
        await Transaction.create({
            amount: Math.abs(amount),
            type: type, // 'bet' or 'win'
            status: 'success',
            referenceId,
            UserId: user.id
        });

        res.status(200).json({
            success: true,
            balance: user.balance
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;
