import API_BASE_URL from '../config';
import React, { useState } from 'react';
import './Auth.css';

const Signup = ({ navigate, setUser }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { username, email, password, confirmPassword } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
                navigate('home');
            } else {
                setError(data.error || 'Registration failed');
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
                    <h2>Join the Game</h2>
                    <p>Create your account and claim your welcome bonus</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-input-group">
                        <label>Username</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="text" 
                                name="username"
                                placeholder="LuckyPlayer123" 
                                value={username}
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Email Address</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="email" 
                                name="email"
                                placeholder="name@domain.com" 
                                value={email}
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>
                    
                    <div className="auth-input-group">
                        <label>Password</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="password" 
                                name="password"
                                placeholder="••••••••" 
                                value={password}
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="auth-input-group">
                        <label>Confirm Password</label>
                        <div className="auth-input-wrapper">
                            <input 
                                type="password" 
                                name="confirmPassword"
                                placeholder="••••••••" 
                                value={confirmPassword}
                                onChange={onChange}
                                required
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-btn-primary" 
                        disabled={loading}
                    >
                        {loading ? 'Creating Identity...' : 'Register & Start Winning'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? 
                    <span onClick={() => navigate('login')} className="auth-link">Sign In</span>
                </div>
            </div>
        </div>
    );
};

export default Signup;
