import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api, { endpoints } from '../api';
import './Register.css';
import HextechModal from './HextechModal';
function Register() {
  const navigate = useNavigate();
  const [modal, setModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '',
    type: 'default', 
    onConfirm: null });

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    re_password: ''
  });

  const showMessage = (title, message, type='default', onConfirm=null) => {
    setModal({ isOpen: true, title, message, type, onConfirm });
  };
  
  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.onConfirm) modal.onConfirm();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await api.post(endpoints.register, formData);
      showMessage(
        "Welcome", 
        "Registration successful! Please check your email to activate your account before logging in.", 
        "success", 
        () => navigate('/login')
      );
    } catch (err) {
      const errorData = err.response?.data;
      let errorMsg = 'Registration failed.';
      
      if (errorData) {
        errorMsg = Object.entries(errorData).map(([key, val]) => `${key}: ${val}`).join('\n');
      }
      showMessage("Registration Error", errorMsg, "danger");
    }
  };

  return (
    <div className="container" style={{maxWidth: '500px', marginTop: '50px'}}>
      <form onSubmit={handleRegister} className="card register-form">
        <h2>Agent Registration</h2>
        
        <div className="form-group">
          <label>Email</label>
          <input 
            name="email" 
            type="email" 
            value={formData.email} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Username (Login)</label>
          <input 
            name="username" 
            value={formData.username} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-row">
            <div className="form-group">
                <label>First Name</label>
                <input 
                    name="first_name" 
                    value={formData.first_name} 
                    onChange={handleChange} 
                    required 
                />
            </div>
            <div className="form-group">
                <label>Last Name</label>
                <input 
                    name="last_name" 
                    value={formData.last_name} 
                    onChange={handleChange} 
                    required 
                />
            </div>
        </div>

        <div className="form-group">
          <label>Password</label>
          <input 
            name="password" 
            type="password" 
            value={formData.password} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input 
            name="re_password" 
            type="password" 
            value={formData.re_password} 
            onChange={handleChange} 
            required 
          />
        </div>

        <button type="submit" style={{width: '100%', marginTop: '1rem'}}>
          Initialize Account
        </button>

        <p style={{textAlign: 'center', marginTop: '1rem', color: '#a09b8c'}}>
          Already have an account? <Link to="/login" className="btn-link">Log In</Link>
        </p>
      </form>
      <HextechModal 
        isOpen={modal.isOpen}
        title={modal.title}
        type={modal.type}
        showCancel={false}
        onClose={closeModal}
        onConfirm={closeModal}
      >
        <p style={{whiteSpace: 'pre-line'}}>{modal.message}</p>
      </HextechModal>
    </div>
  );
}

export default Register;