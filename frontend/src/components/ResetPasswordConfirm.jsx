import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { endpoints } from '../api';
import './Login.css';

function ResetPasswordConfirm() {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ new_password: '', re_new_password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.new_password !== formData.re_new_password) {
            setError("Passwords do not match.");
            return;
        }

        try {
            await api.post(endpoints.resetPasswordConfirm, {
                uid,
                token,
                new_password: formData.new_password,
                re_new_password: formData.re_new_password
            });
            navigate('/login');
        } catch (err) {
            setError("Failed to reset password. The link may have expired.");
        }
    };

    return (
        <div className="container" style={{maxWidth: '400px', marginTop: '100px'}}>
            <form onSubmit={handleSubmit} className="card login-form">
                <h2 style={{color: '#c8aa6e', textAlign:'center'}}>Set New Password</h2>
                
                <div className="form-group">
                    <label>New Password</label>
                    <input 
                        type="password" 
                        value={formData.new_password} 
                        onChange={(e) => setFormData({...formData, new_password: e.target.value})} 
                        required 
                        style={{width:'100%', padding:'10px', marginTop:'5px', background:'#010a13', border:'1px solid #c8aa6e', color:'#f0e6d2'}}
                    />
                </div>
                
                <div className="form-group" style={{marginTop:'1rem'}}>
                    <label>Confirm Password</label>
                    <input 
                        type="password" 
                        value={formData.re_new_password} 
                        onChange={(e) => setFormData({...formData, re_new_password: e.target.value})} 
                        required 
                        style={{width:'100%', padding:'10px', marginTop:'5px', background:'#010a13', border:'1px solid #c8aa6e', color:'#f0e6d2'}}
                    />
                </div>

                {error && <p style={{color: '#e33d45', marginTop: '10px'}}>{error}</p>}

                <button type="submit" style={{width: '100%', marginTop: '1.5rem', padding:'10px', background:'#0acbe6', border:'none', fontWeight:'bold', cursor:'pointer',color:'#010a13'}}>
                    Confirm Change
                </button>
            </form>
        </div>
    );
}

export default ResetPasswordConfirm;