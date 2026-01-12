import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../api';
import './CreateTournament.css';
import HextechModal from './HextechModal'; // <--- Import Modal

function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // --- MODAL STATE ---
  const [modal, setModal] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    type: 'default',
    onConfirm: null 
  });

  const [formData, setFormData] = useState({
    name: '',
    discipline: '5v5_summoners_rift',
    start_time: '',
    location_url: '',
    description: '',
    max_participants: 8,
    deadline: ''
  });

  // Helper to show modal easily
  const showModal = (title, message, type = 'default', onConfirm = null) => {
    setModal({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
    // Execute any post-close action (like navigation)
    if (modal.onConfirm) modal.onConfirm();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (e) => {
    let val = e.target.value;
    if (val.includes('<iframe') && val.includes('src="')) {
      const srcMatch = val.match(/src="([^"]+)"/);
      if (srcMatch && srcMatch[1]) val = srcMatch[1];
    }
    setFormData({ ...formData, location_url: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Validation Alert
    if (new Date(formData.deadline) >= new Date(formData.start_time)) {
      showModal("Invalid Dates", "Registration deadline must be BEFORE the start time!", "danger");
      setLoading(false);
      return;
    }

    try {
      await api.post(endpoints.tournaments, formData);
      
      // 2. Success Alert -> Navigate Home
      showModal(
        "Success", 
        "Tournament created successfully!", 
        "success", 
        () => navigate('/') // This runs when user clicks "OK"
      );
      
    } catch (err) {
      // 3. Error Alert
      const errorData = err.response?.data;
      const msg = errorData ? JSON.stringify(errorData) : "Failed to create tournament";
      showModal("Creation Failed", msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{maxWidth: '600px'}}>
      <form onSubmit={handleSubmit} className="card create-form">
        <h2>Host a Tournament</h2>
        {/* ... (Existing inputs are unchanged) ... */}
        
        <div className="form-group">
          <label>Tournament Name</label>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Winter Split Clash" required />
        </div>

        <div className="form-group">
          <label>Discipline</label>
          <select name="discipline" value={formData.discipline} onChange={handleChange}>
            <option value="5v5_summoners_rift">5v5 Summoner's Rift</option>
            <option value="1v1_howling_abyss">1v1 Howling Abyss</option>
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Registration Deadline</label>
            <input type="datetime-local" name="deadline" value={formData.deadline} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Start Time</label>
            <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required />
          </div>
        </div>

        <div className="form-group">
          <label>Max Teams</label>
          <input type="number" name="max_participants" value={formData.max_participants} onChange={handleChange} min="2" required />
        </div>

        <div className="form-group">
          <label>Location (Google Maps)</label>
          <textarea 
            name="location_url" 
            value={formData.location_url} 
            onChange={handleLocationChange} 
            placeholder='Paste the full "Embed a map" HTML code here...'
            rows="3"
            style={{fontSize: '0.8rem', color: '#a09b8c'}} 
            required 
          />
          <small style={{color:'#a09b8c'}}>
             Tip: On Google Maps, click Share &rarr; Embed a map &rarr; Copy HTML. Paste the whole thing here.
          </small>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} rows="4" />
        </div>

        <button type="submit" disabled={loading} style={{marginTop: '1rem'}}>
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </form>

      {/* --- RENDER MODAL --- */}
      <HextechModal 
        isOpen={modal.isOpen}
        title={modal.title}
        type={modal.type}
        showCancel={false} // Hide Cancel button -> Acts like an Alert
        confirmText="OK"
        onClose={closeModal}
        onConfirm={closeModal}
      >
        <p style={{whiteSpace: 'pre-wrap'}}>{modal.message}</p>
      </HextechModal>
    </div>
  );
}

export default CreateTournament;