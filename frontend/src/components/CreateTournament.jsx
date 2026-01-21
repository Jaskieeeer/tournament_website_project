import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../api';
import './CreateTournament.css';
import HextechModal from './HextechModal';

function CreateTournament() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
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

  const [sponsorFiles, setSponsorFiles] = useState([]);

  const showModal = (title, message, type = 'default', onConfirm = null) => {
    setModal({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModal({ ...modal, isOpen: false });
    if (modal.onConfirm) modal.onConfirm();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setSponsorFiles(e.target.files);
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
    
    if (new Date(formData.deadline) >= new Date(formData.start_time)) {
      showModal("Invalid Dates", "Registration deadline must be BEFORE the start time!", "danger");
      setLoading(false);
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('discipline', formData.discipline);
    data.append('start_time', formData.start_time);
    data.append('deadline', formData.deadline);
    data.append('max_participants', formData.max_participants);
    data.append('location_url', formData.location_url);
    data.append('description', formData.description);

    for (let i = 0; i < sponsorFiles.length; i++) {
        data.append('sponsors', sponsorFiles[i]);
    }

    try {
      await api.post(endpoints.tournaments, data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
      });
      
      showModal(
        "Success", 
        "Tournament created successfully with sponsors!", 
        "success", 
        () => navigate('/') 
      );
      
    } catch (err) {
      const errorData = err.response?.data;
      let msg = "Failed to create tournament";
      
      if (errorData) {
          if (typeof errorData === 'string') msg = errorData;
          else {
              const key = Object.keys(errorData)[0];
              const val = errorData[key];
              msg = `${key}: ${Array.isArray(val) ? val[0] : val}`;
          }
      }
      
      showModal("Creation Failed", msg, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{maxWidth: '600px'}}>
      <form onSubmit={handleSubmit} className="card create-form">
        <h2>Host a Tournament</h2>
        
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
            <label style={{color: '#c8aa6e'}}>Sponsor Logos (Optional)</label>
            <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleFileChange}
                style={{padding: '10px', background: '#010a13', border: '1px solid #3c3c41', color: '#a09b8c'}}
            />
            <small style={{color:'#5c5b57'}}>Select multiple images to appear in the tournament footer.</small>
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
          />
        </div>

       

        <button type="submit" disabled={loading} style={{marginTop: '1rem'}}>
          {loading ? 'Creating...' : 'Create Tournament'}
        </button>
      </form>

      <HextechModal 
        isOpen={modal.isOpen}
        title={modal.title}
        type={modal.type}
        showCancel={false} 
        confirmText="OK"
        onClose={closeModal}
        onConfirm={closeModal}
      >
        <p style={{whiteSpace: 'pre-wrap', textAlign: 'center'}}>{modal.message}</p>
      </HextechModal>
    </div>
  );
}

export default CreateTournament;