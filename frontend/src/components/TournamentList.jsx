import './TournamentList.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { endpoints } from '../api';

function TournamentList() {
  const [tournaments, setTournaments] = useState([]);
  const [search, setSearch] = useState('');
  
  const [nextPage, setNextPage] = useState(null);
  const [prevPage, setPrevPage] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async (query = '', url = null) => {
    try {
      const endpoint = url || `${endpoints.tournaments}?search=${query}`;
      
      const res = await api.get(endpoint);
      
      if (res.data.results) {
        setTournaments(res.data.results);
        setNextPage(res.data.next);      
        setPrevPage(res.data.previous);  
        setCount(res.data.count);        
      } else {
        setTournaments(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchTournaments(val, null);
  };

  return (
    <div className="container">
      {/* HEADER SECTION */}
      <div className="tournament-header">
        <h1>Upcoming Tournaments</h1>
      </div>

      {/* SEARCH BAR */}
      <div className="search-container">
        <input 
          className="hextech-input"
          placeholder="Search tournaments..." 
          value={search}
          onChange={handleSearch} 
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

      {/* --- PAGE CONTROLS --- */}
      {/* Only show if there are multiple pages */}
      {(nextPage || prevPage) && (
        <div className="pagination-controls" style={{
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '20px', 
            marginTop: '2rem'
        }}>
            
            <button 
                onClick={() => fetchTournaments(search, prevPage)} 
                disabled={!prevPage}
                className="btn-link"
                style={{opacity: !prevPage ? 0.5 : 1, cursor: !prevPage ? 'default' : 'pointer'}}
            >
                &laquo; Previous
            </button>

            <span style={{color: '#a09b8c', fontSize: '0.9rem'}}>
               {count} Results
            </span>

            <button 
                onClick={() => fetchTournaments(search, nextPage)} 
                disabled={!nextPage}
                className="btn-link"
                style={{opacity: !nextPage ? 0.5 : 1, cursor: !nextPage ? 'default' : 'pointer'}}
            >
                Next &raquo;
            </button>
        </div>
      )}

    </div>
  );
}

export default TournamentList;