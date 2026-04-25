const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdraw', 'bet', 'win'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        defaultValue: 'success' // Defaulting to success for this simulated version
    },
    paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: 'UPI'
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true
    }
});

// Relationships
const User = require('./User');
User.hasMany(Transaction);
Transaction.belongsTo(User);

module.exports = Transaction;
