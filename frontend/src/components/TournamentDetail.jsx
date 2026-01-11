import "./TournamentDetail.css";
import { useState, useEffect, useContext } from 'react';
import api, { endpoints } from '../api';
import AuthContext from '../context/AuthContext';
import HextechModal from './HextechModal';

// Helper to group matches by round number for the bracket view
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
  
  // Form State for joining
  const [teamName, setTeamName] = useState('');
  const [summonerName, setSummonerName] = useState('');
  const [rank, setRank] = useState(0);
  const [teammates, setTeammates] = useState('');

  // Modal State
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
      alert("Error loading tournament data");
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
      loadTournament(); // Refresh list
      // Clear form
      setTeamName('');
      setSummonerName('');
      setRank(0);
      setTeammates('');
    } catch (err) {
      // Backend now sends polite errors, we display them here
      alert(err.response?.data?.error || JSON.stringify(err.response?.data));
    }
  };

  // --- MODAL ACTIONS ---

  // 1. Start Tournament
  const confirmStart = async () => {
    try {
      await api.post(endpoints.start(id));
      setShowStartModal(false);
      loadTournament();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to start tournament");
      setShowStartModal(false);
    }
  };

  // 2. Report Match
  const initiateReport = (matchId, winnerEmail) => {
    setSelectedMatch({ id: matchId, winner: winnerEmail });
    setShowReportModal(true);
  };

  const confirmReport = async () => {
    if (!selectedMatch) return;
    try {
      await api.post(endpoints.report(id, selectedMatch.id), { winner_email: selectedMatch.winner });
      setShowReportModal(false);
      loadTournament();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error);
      setShowReportModal(false);
      loadTournament(); 
    }
  };

  // --- RENDER ---

  if (loading || !tournament) return <div className="container">Loading tournament data...</div>;

  // Crash protection: default to empty array if backend sends nothing
  const participants = tournament.participants || [];

  return (
    <div className="container">
      
      {/* HEADER */}
      <div className="header">
        <h1>{tournament.name}</h1>
        <p>Organizer: <span style={{color: '#c8aa6e'}}>{tournament.organizer_email}</span></p>
        <p>Status: <b style={{color: tournament.status === 'open' ? '#0acbe6' : '#c8aa6e'}}>
            {tournament.status.toUpperCase()}
        </b></p>
        
        {tournament.location_url && (
            <div className="map-container">
                <iframe 
                    title="Tournament Location"
                    width="100%" 
                    height="300" 
                    frameBorder="0" 
                    scrolling="no" 
                    src={tournament.location_url}>
                </iframe>
            </div>
        )}
      </div>

      {/* LOBBY STATE (OPEN) */}
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
                
                {/* ORGANIZER ACTIONS: Start Button (Green) */}
                {user && user.email === tournament.organizer_email && (
                    <div style={{borderTop: '1px solid #444', marginTop: '20px', paddingTop: '10px'}}>
                        <button 
                            onClick={() => setShowStartModal(true)} 
                            className="btn-success" 
                            style={{width: '100%'}}
                        >
                            Start Tournament (Organizer)
                        </button>
                    </div>
                )}
            </div>

            {/* RIGHT: Current Roster */}
            <div className="roster-section card">
                <h3>Registered Teams ({participants.length} / {tournament.max_participants})</h3>
                
                {participants.length === 0 ? (
                    <p style={{color: '#a09b8c', fontStyle: 'italic', textAlign:'center', marginTop:'2rem'}}>
                        The lobby is empty. Be the first to join!
                    </p>
                ) : (
                    <div className="roster-list">
                    {participants.map((p) => (
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

      {/* BRACKET STATE (ONGOING / FINISHED) */}
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
                    {/* Player 1 Block */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>P1: {m.player1_email || 'BYE'}</span>
                      {m.player1_email && !m.winner_email && (
                        <button 
                            className="btn-link" 
                            style={{padding:'2px 8px', fontSize:'0.8rem'}}
                            onClick={() => initiateReport(m.id, m.player1_email)}
                        >
                            Vote
                        </button>
                      )}
                    </div>

                    {/* Player 2 Block */}
                    <div style={{marginTop: '5px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <span>P2: {m.player2_email || 'BYE'}</span>
                      {m.player2_email && !m.winner_email && (
                        <button 
                            className="btn-link"
                            style={{padding:'2px 8px', fontSize:'0.8rem'}}
                            onClick={() => initiateReport(m.id, m.player2_email)}
                        >
                            Vote
                        </button>
                      )}
                    </div>
                    
                    {/* Status / Conflicts */}
                    {m.winner_email && (
                        <div style={{marginTop:'10px', color:'#c8aa6e', borderTop:'1px solid #444', paddingTop:'5px'}}>
                            Winner: <strong>{m.winner_email}</strong>
                        </div>
                    )}
                    
                    {!m.winner_email && m.player1_vote && m.player2_vote && (
                      <span className="conflict-msg">CONFLICT! Re-vote required.</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Start Tournament Modal */}
      <HextechModal 
        isOpen={showStartModal}
        title="Start Tournament Protocol"
        type="success"
        confirmText="INITIATE"
        onClose={() => setShowStartModal(false)}
        onConfirm={confirmStart}
      >
        <p>You are about to lock registrations and generate the bracket tree.</p>
        <p>Ensure all teams are ready.</p>
        <p style={{color: '#e33d45', fontWeight:'bold'}}>This action cannot be undone.</p>
      </HextechModal>

      {/* Report Winner Modal */}
      <HextechModal 
        isOpen={showReportModal}
        title="Confirm Match Result"
        confirmText="Submit Result"
        onClose={() => setShowReportModal(false)}
        onConfirm={confirmReport}
      >
        <p>You are voting for:</p>
        <h3 style={{textAlign:'center', color:'#0acbe6'}}>{selectedMatch?.winner}</h3>
        <p style={{fontSize:'0.9rem'}}>If both players vote differently, a conflict will be flagged.</p>
      </HextechModal>

    </div>
  );
}

export default TournamentDetail;