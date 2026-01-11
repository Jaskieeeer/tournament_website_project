import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { endpoints } from '../api';
import AuthContext from '../context/AuthContext';
import './Login.css';

function Login() {
  const { loginUser } = useContext(AuthContext); // Use the global context function
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post(endpoints.login, { email, password });
      
      // 1. Update Global State (Save tokens & fetch user)
      loginUser(res.data.access, res.data.refresh);
      
      // 2. Redirect to Home
      navigate('/');
    } catch (err) {
      console.error(err);
      setError('Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{maxWidth: '400px', marginTop: '80px'}}>
      <form onSubmit={handleLogin} className="card login-form">
        <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>Agent Login</h2>
        
        {error && (
            <div style={{color: '#e33d45', textAlign:'center', marginBottom: '1rem', fontWeight:'bold'}}>
                {error}
            </div>
        )}

        <div className="form-group" style={{marginBottom: '1rem'}}>
          <label style={{display: 'block', color: '#c8aa6e', marginBottom: '0.5rem'}}>Email</label>
          <input 
            type="email" 
            placeholder="Enter your email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            style={{width: '100%', boxSizing: 'border-box'}}
          />
        </div>

        <div className="form-group" style={{marginBottom: '2rem'}}>
            <label style={{display: 'block', color: '#c8aa6e', marginBottom: '0.5rem'}}>Password</label>
            <input 
                type="password" 
                placeholder="Enter your password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                required
                style={{width: '100%', boxSizing: 'border-box'}}
            />
        </div>
        
        <button type="submit" disabled={loading} style={{width: '100%'}}>
          {loading ? 'Authenticating...' : 'Log In'}
        </button>
        
        <p style={{textAlign: 'center', marginTop: '1.5rem', color: '#a09b8c'}}>
          New Agent? <Link to="/register" className="btn-link" style={{fontSize: '0.9rem', marginLeft: '5px'}}>Register Here</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;