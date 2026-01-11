import './TournamentList.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { endpoints } from '../api';

function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async (query = '') => {
    try {
      const res = await api.get(`${endpoints.tournaments}?search=${query}`);
      setTournaments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      {/* HEADER SECTION: Title + Create Button */}
      <div className="tournament-header">
        <h1>Upcoming Tournaments</h1>
        
      </div>

      {/* SEARCH BAR */}
      <div className="search-container">
        <input 
          className="hextech-input"
          placeholder="Search tournaments..." 
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            fetchTournaments(e.target.value);
          }} 
        />
      </div>

      {/* TOURNAMENT LIST */}
      <div className="list">
        {tournaments.map(t => (
          <div key={t.id} className={`tournament-tile status-${t.status}`}>
            
            {/* LEFT: Info Section */}
            <div className="tile-info">
              <h3>{t.name}</h3>
              <div className="tile-meta">
                <span>DISCIPLINE: <b style={{marginLeft:'5px', color:'#c8aa6e'}}>{t.discipline}</b></span>
                <span>STATUS: <b style={{marginLeft:'5px', color:'#c8aa6e'}}>{t.status.toUpperCase()}</b></span>
              </div>
            </div>

            {/* RIGHT: Action Section */}
            <div className="tile-action">
              <Link to={`/tournament/${t.id}`} className="tile-btn">
                View Lobby
              </Link>
            </div>
            
          </div>
        ))}
        
        {tournaments.length === 0 && (
          <p style={{textAlign:'center', color:'#a09b8c', marginTop:'2rem'}}>
            No tournaments found. Be the first to host one!
          </p>
        )}
      </div>
    </div>
  );
}

export default TournamentList;