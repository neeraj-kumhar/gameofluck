import API_BASE_URL from '../config';
import React, { useState } from 'react';
import './Auth.css';

const Login = ({ navigate, setUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
                navigate('home'); // Redirect to home after login
            } else {
                setError(data.error || 'Invalid credentials');
            }
        } catch (err) {
            setError('Connection failed. Please check your internet.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-immersive-wrapper animate-fade-in">
            <div className="auth-glass-card">
                <div className="auth-header">
                    <span className="auth-logo-text">GAME OF LUCK</span>
                    <h2>Welcome Back</h2>
                    <p>Enter your details to access your dashboard</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-input-group">
                        <label>Email Address</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="email" 
                                placeholder="name@domain.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="auth-input-group">
                        <label>Password</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-btn-primary" 
                        disabled={loading}
                    >
                        {loading ? 'Authenticating...' : 'Sign In to Play'}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? 
                    <span onClick={() => navigate('signup')} className="auth-link">Create Account</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
