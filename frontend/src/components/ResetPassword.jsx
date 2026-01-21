import { useState } from 'react';
import api, { endpoints } from '../api';
import './Login.css';

function ResetPassword() {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(endpoints.resetPassword, { email });
            setSent(true);
        } catch (err) {
            console.error(err);
            setSent(true); 
        }
    };

    return (
        <div className="container" style={{maxWidth: '400px', marginTop: '100px'}}>
            <form onSubmit={handleSubmit} className="card login-form">
                <h2 style={{color: '#c8aa6e', textAlign:'center'}}>Reset Password</h2>
                
                {!sent ? (
                    <>
                        <p style={{color: '#a09b8c', fontSize: '0.9rem', marginBottom: '1rem', textAlign:'center'}}>
                            Enter your email address and we will send you a link to reset your password.
                        </p>
                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                style={{width:'100%', padding:'10px', marginTop:'5px', background:'#010a13', border:'1px solid #c8aa6e', color:'#f0e6d2'}}
                            />
                        </div>
                        <button type="submit" style={{width: '100%', marginTop: '1rem', padding:'10px', background:'#c8aa6e', border:'none', fontWeight:'bold', cursor:'pointer'}}>
                            Send Reset Link
                        </button>
                    </>
                ) : (
                    <div style={{textAlign: 'center', color: '#0acbe6'}}>
                        <h3>Check your Email</h3>
                        <p>If an account exists for {email}, you will receive a reset link shortly.</p>
                    </div>
                )}
            </form>
        </div>
    );
}

export default ResetPassword;