import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { endpoints } from '../api';
import './Login.css'; // Reusing Login styles

function ActivateAccount() {
    const { uid, token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle');

    const handleActivate = async () => {
        try {
            await api.post(endpoints.activate, { uid, token });
            setStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="container" style={{maxWidth: '400px', marginTop: '100px', textAlign: 'center'}}>
            <div className="card login-form">
                <h2 style={{color: '#c8aa6e'}}>Account Activation</h2>
                
                {status === 'idle' && (
                    <>
                        <p>Please confirm your account activation.</p>
                        <button onClick={handleActivate} className="btn-confirm" style={{width: '100%', marginTop: '20px', padding:'10px', background:'#0acbe6', border:'none', color:'#000', fontWeight:'bold', cursor:'pointer'}}>
                            Activate Account
                        </button>
                    </>
                )}

                {status === 'success' && (
                    <div style={{color: '#0acbe6', marginTop: '20px'}}>
                        <h3>Verified!</h3>
                        <p>Redirecting to login...</p>
                    </div>
                )}

                {status === 'error' && (
                    <div style={{color: '#e33d45', marginTop: '20px'}}>
                        <h3>Activation Failed</h3>
                        <p>The link may be invalid or expired.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivateAccount;