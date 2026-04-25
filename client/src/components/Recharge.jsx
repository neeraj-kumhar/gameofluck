import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './Admin.css';

const Recharge = ({ user, setUser, navigate }) => {
    const [amount, setAmount] = useState(100);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Select Amount, 2: Pay QR
    const [message, setMessage] = useState('');

    const presetAmounts = [100, 500, 1000, 2000, 5000];

    const upiID = 'gameofluck@upi'; // Placeholder UPI ID
    const upiLink = `upi://pay?pa=${upiID}&pn=GameOfLuck&am=${amount}&cu=INR`;

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('https://gameofluck-r491.vercel.app/api/wallet/recharge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount, referenceId: 'UPI' + Date.now() })
            });

            const data = await res.json();
            if (data.success) {
                // Update local user state
                setUser({ ...user, balance: data.balance });
                setStep(3); // Success step
                setMessage(`₹${amount} added successfully!`);
            } else {
                setMessage(data.error || 'Recharge failed');
            }
        } catch (err) {
            setMessage('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-container animate-fade-in" style={{ maxWidth: '450px', margin: '40px auto' }}>
            <div className="admin-header">
                <h2>💰 Recharge Wallet</h2>
                <p>Deposit funds to continue playing your favorite games</p>
            </div>

            <div className="admin-card" style={{ padding: '30px' }}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <label style={{ display: 'block', marginBottom: '15px', color: '#94a3b8' }}>Select or Enter Amount (₹)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                            {presetAmounts.map(a => (
                                <button 
                                    key={a}
                                    className={`admin-btn ${amount === a ? 'btn-primary' : ''}`}
                                    style={{ 
                                        padding: '10px', 
                                        backgroundColor: amount === a ? '#4facfe' : 'rgba(255,255,255,0.05)',
                                        border: amount === a ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                    }}
                                    onClick={() => setAmount(a)}
                                >
                                    ₹{a}
                                </button>
                            ))}
                        </div>
                        <input 
                            type="number" 
                            className="admin-input" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Min ₹10" 
                            style={{ width: '100%', marginBottom: '25px', fontSize: '18px' }}
                        />
                        <button 
                            className="admin-btn btn-success" 
                            style={{ width: '100%', padding: '15px', fontSize: '16px' }}
                            onClick={() => setStep(2)}
                            disabled={amount < 10}
                        >
                            Confirm Deposit
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                        <h4 style={{ color: '#4facfe', marginBottom: '20px' }}>Pay via UPI QR</h4>
                        <div style={{ 
                            background: '#fff', 
                            padding: '15px', 
                            display: 'inline-block', 
                            borderRadius: '10px',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            marginBottom: '20px'
                        }}>
                            <QRCodeSVG value={upiLink} size={180} />
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px' }}>Amount to Pay: <strong style={{ color: '#fff' }}>₹{amount}</strong></p>
                        <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>Scan this QR code with any UPI App (GPay, PhonePe, Paytm)</p>
                        
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                className="admin-btn" 
                                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }}
                                onClick={() => setStep(1)}
                            >
                                Back
                            </button>
                            <button 
                                className="admin-btn btn-success" 
                                style={{ flex: 2, padding: '12px' }}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Paid - Confirm'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '60px', marginBottom: '20px' }}>✅</div>
                        <h3 style={{ color: '#10b981', marginBottom: '10px' }}>Recharge Successful!</h3>
                        <p style={{ color: '#94a3b8', marginBottom: '25px' }}>{message}</p>
                        <button 
                            className="admin-btn btn-primary" 
                            style={{ width: '100%', padding: '15px' }}
                            onClick={() => navigate('home')}
                        >
                            Return to Play
                        </button>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <p style={{ fontSize: '12px', color: '#f59e0b', margin: 0 }}>
                    ⚠️ <strong>Note</strong>: This is a simulated transaction. In a real application, you should verify the Payment Reference ID (UTR) before confirming.
                </p>
            </div>
        </div>
    );
};

export default Recharge;
