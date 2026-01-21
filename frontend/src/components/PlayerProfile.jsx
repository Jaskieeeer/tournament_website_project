import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { endpoints } from '../api';
import './TournamentList.css'; 
import './PlayerProfile.css';   

function PlayerProfile() {
  const { username } = useParams();
  const [history, setHistory] = useState({ active: [], past: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
const res = await api.get(`${endpoints.tournaments}history/?username=${username}`);        setHistory(res.data);
      } catch (err) {
        setError("Failed to load player history.");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [username]);

  if (loading) return <div className="container">Loading Agent Profile...</div>;
  if (error) return <div className="container" style={{color:'#e33d45'}}>{error}</div>;

  return (
    <div className="container profile-container">
      {/* HEADER */}
      <div className="profile-header">
        <h1>
            Summoner: <span>{username}</span>
        </h1>
      </div>

      {/* ACTIVE SECTION */}
      <h3 className="section-title title-active">Active Tournaments</h3>
      <div className="history-list" style={{marginBottom: '3rem'}}>
        {history.active.length === 0 ? (
          <div className="empty-state">No active tournaments assigned.</div>
        ) : (
          history.active.map(t => (
            <div key={t.id} className={`tournament-tile status-${t.status}`}>
              <div className="tile-info">
                <h3>{t.name}</h3>
                <div className="tile-meta">
                  <span>STATUS: <b style={{color: '#0acbe6', marginLeft:'5px'}}>{t.status.toUpperCase()}</b></span>
                  <span>START: {new Date(t.start_time).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="tile-action">
                <Link to={`/tournament/${t.id}`} className="tile-btn">View Lobby</Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* PAST SECTION */}
      <h3 className="section-title title-past">History</h3>
      <div className="history-list">
        {history.past.length === 0 ? (
          <div className="empty-state">No prior history found.</div>
        ) : (
          history.past.map(t => (
            <div key={t.id} className="tournament-tile status-finished" style={{opacity: 0.8}}>
              <div className="tile-info">
                <h3>{t.name}</h3>
                <div className="tile-meta">
                   <span>RESULT: <b>FINISHED</b></span>
                   <span>DATE: {new Date(t.start_time).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="tile-action">
                <Link to={`/tournament/${t.id}`} className="tile-btn">View Results</Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default PlayerProfile;