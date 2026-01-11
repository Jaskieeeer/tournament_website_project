import "./TournamentDetail.css";
import { useState, useEffect } from 'react';
import api, { endpoints } from '../api';
import { useContext } from 'react';
import AuthContext from '../context/AuthContext'; 
import HextechModal from './HextechModal';
function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

function TournamentDetail() {
  const { user } = useContext(AuthContext);
  const id = window.location.pathname.split('/').pop(); 
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [teamName, setTeamName] = useState('');
  const [summonerName, setSummonerName] = useState('');
  const [rank, setRank] = useState(0);
  const [teammates, setTeammates] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  useEffect(() => {
    loadTournament();
  }, []);

  const loadTournament = async () => {
    try {
      const res = await api.get(endpoints.tournamentDetail(id));
      setTournament(res.data);
    } catch (err) {
      alert("Error loading tournament");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await api.post(endpoints.join(id), {
        team_name: teamName,
        license_number: summonerName,
        ranking_points: rank,
        teammates_names: teammates
      });
      alert('Joined successfully!');
      loadTournament();
    } catch (err) {
      alert(JSON.stringify(err.response.data));
    }
  };

  const handleStart = async () => {
    if (!window.confirm("This is irreversible. Start tournament?")) return;
    try {
      await api.post(endpoints.start(id));
      loadTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Failed");
    }
  };

  const handleReport = async (matchId, winnerEmail) => {
    if (!window.confirm(`Report winner: ${winnerEmail}?`)) return;
    try {
      await api.post(endpoints.report(id, matchId), { winner_email: winnerEmail });
      loadTournament();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error);
      loadTournament(); 
    }
  };

  if (loading || !tournament) return <div>Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <h1>{tournament.name}</h1>
        <p>Organizer: {tournament.organizer_email}</p>
        <p>Status: <b>{tournament.status}</b></p>
        
        {tournament.location_url && (
            <div className="map-container">
                <iframe 
                    width="100%" 
                    height="300" 
                    frameBorder="0" 
                    scrolling="no" 
                    src={tournament.location_url}>
                </iframe>
            </div>
        )}
      </div>

      {tournament.status === 'open' && (
  <div className="lobby-container">
    
    {/* LEFT: Registration Form */}
    <div className="join-section card">
      <h3>Register Team</h3>
      <form onSubmit={handleJoin}>
        <input placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} required />
        <input placeholder="Captain Summoner Name" value={summonerName} onChange={e => setSummonerName(e.target.value)} required />
        <input type="number" placeholder="Team MMR" value={rank} onChange={e => setRank(parseInt(e.target.value))} required />
        <input placeholder="Teammates (comma sep)" value={teammates} onChange={e => setTeammates(e.target.value)} />
        <button type="submit">Join Tournament</button>
      </form>
      
      {/* Only show Start button if current user is the organizer */}
      {/* (You can check this by comparing tournament.organizer with your decoded token ID, 
          but for now we just show it if you are logged in) */}
      {user && user.email === tournament.organizer_email && (
                <div style={{borderTop: '1px solid #444', marginTop: '20px', paddingTop: '10px'}}>
                    <button onClick={handleStart} className="btn-success" style={{width: '100%'}}>
                        Start Tournament (Organizer)
                    </button>
                </div>
            )}
    </div>

   
    <div className="roster-section card">
      <h3>Registered Teams ({tournament.participants.length} / {tournament.max_participants})</h3>
      
      {tournament.participants.length === 0 ? (
        <p style={{color: '#a09b8c', fontStyle: 'italic'}}>No teams registered yet.</p>
      ) : (
        <div className="roster-list">
          {tournament.participants.map((p) => (
            <div key={p.id} className="roster-item">
              <div className="roster-name">
                <strong>{p.team_name}</strong>
                <span className="roster-captain">Capt: {p.license_number}</span>
              </div>
              <div className="roster-rank">
                MMR: {p.ranking_points}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    
  </div>
)}
      {tournament.status !== 'open' && (
        <div className="bracket">
          <h2>Tournament Bracket</h2>
          <div className="bracket-container">
            {Object.values(groupBy(tournament.matches, 'round_number')).map((roundMatches, idx) => (
              <div key={idx} className="round-column">
                <h3>Round {idx + 1}</h3>
                {roundMatches.map((m) => (
                  <div 
                    key={m.id} 
                    className={`match-card ${m.winner_email ? 'winner-declared' : ''}`}
                  >
                    <div>
                      P1: {m.player1_email || 'BYE'} 
                      {m.player1_email && !m.winner_email && (
                        <button style={{marginLeft:'5px'}} onClick={() => handleReport(m.id, m.player1_email)}>Vote</button>
                      )}
                    </div>
                    <div style={{marginTop: '5px'}}>
                      P2: {m.player2_email || 'BYE'}
                      {m.player2_email && !m.winner_email && (
                        <button style={{marginLeft:'5px'}} onClick={() => handleReport(m.id, m.player2_email)}>Vote</button>
                      )}
                    </div>
                    
                    {m.winner_email && <div style={{marginTop:'5px'}}><strong>Winner: {m.winner_email}</strong></div>}
                    
                    {!m.winner_email && m.player1_vote && m.player2_vote && (
                      <span className="conflict-msg">CONFLICT! Re-vote.</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentDetail;