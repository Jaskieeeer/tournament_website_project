import "./TournamentDetail.css";
import { useState, useEffect, useContext, useRef } from 'react'; 
import api, { endpoints } from '../api';
import AuthContext from '../context/AuthContext';
import HextechModal from './HextechModal';

function groupBy(xs, key) {
  if (!xs) return {}; 
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
  const prevTournamentRef = useRef(null);

  // Join Form State
  const [teamName, setTeamName] = useState('');
  const [summonerName, setSummonerName] = useState('');
  const [rank, setRank] = useState(0);
  const [teammates, setTeammates] = useState('');

  // --- NEW: EDIT FORM STATE ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    deadline: '',
    location_url: ''
  });

  // Modal States
  const [showStartModal, setShowStartModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [infoModal, setInfoModal] = useState({ 
    isOpen: false, title: '', message: '', type: 'default' 
  });

  const showInfo = (title, message, type='default') => {
    setInfoModal({ isOpen: true, title, message, type });
  };
  const closeInfo = () => setInfoModal({ ...infoModal, isOpen: false });

  // --- LOAD DATA ---
  useEffect(() => {
    loadTournament(); 
    const interval = setInterval(() => loadTournament(true), 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadTournament = async (silent = false) => {
    try {
      const res = await api.get(endpoints.tournamentDetail(id));
      const newData = res.data;
      
      // Sync Edit Form with loaded data (only once or if not editing)
      if (!showEditModal) {
          setEditFormData({
              name: newData.name,
              description: newData.description,
              start_time: newData.start_time ? newData.start_time.slice(0, 16) : '',
              deadline: newData.deadline ? newData.deadline.slice(0, 16) : '', // <--- Added
              location_url: newData.location_url || ''
          });
      }
      // Conflict Detection (Passive)
      if (prevTournamentRef.current && user) {
        const oldMatches = prevTournamentRef.current.matches || [];
        const newMatches = newData.matches || [];
        newMatches.forEach(newMatch => {
          const oldMatch = oldMatches.find(m => m.id === newMatch.id);
          if (!oldMatch) return;
          const wasMyVote = (newMatch.player1_email === user.email && oldMatch.player1_vote) || 
                            (newMatch.player2_email === user.email && oldMatch.player2_vote);
          const isMyVoteGone = (newMatch.player1_email === user.email && !newMatch.player1_vote) || 
                               (newMatch.player2_email === user.email && !newMatch.player2_vote);
          if (wasMyVote && isMyVoteGone && !newMatch.winner_email) {
             showInfo("Update", "Conflict detected! Votes have been reset.", "danger");
          }
        });
      }
      setTournament(newData);
      prevTournamentRef.current = newData;
      return newData;
    } catch (err) {
      if (!silent) showInfo("Error", "Failed to load tournament data.", "danger");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --- EDIT HANDLERS ---
  const handleEditChange = (e) => {
      setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
      try {
          await api.patch(endpoints.tournamentDetail(id), editFormData);
          setShowEditModal(false);
          showInfo("Success", "Tournament updated successfully!", "success");
          loadTournament();
      } catch (err) {
          showInfo("Update Failed", err.response?.data?.error || "Failed to update.", "danger");
      }
  };

  // --- OTHER ACTIONS (Join, Start, Report) ---
  const handleJoin = async (e) => {
    e.preventDefault();
    const riotIdRegex = /^.+#\w{3,5}$/; 
    if (!riotIdRegex.test(summonerName)) {
        showInfo("Invalid ID", "Captain ID must be Name#Tag", "danger");
        return;
    }
    if (rank < 0 || rank > 5000) {
        showInfo("Invalid MMR", "Rank must be 0-5000.", "danger");
        return;
    }
    if (tournament.discipline === '5v5_summoners_rift') {
        const teamList = teammates.split(',').map(t => t.trim()).filter(t => t !== '');
        if (teamList.length !== 4) {
            showInfo("Invalid Roster", `For 5v5, list exactly 4 teammates.`, "danger");
            return;
        }
    }
    try {
      await api.post(endpoints.join(id), {
        team_name: teamName,
        license_number: summonerName,
        ranking_points: rank,
        teammates_names: teammates
      });
      showInfo("Success", "Joined successfully!", "success");
      loadTournament(); 
      setTeamName(''); setSummonerName(''); setRank(0); setTeammates('');
    } catch (err) {
      showInfo("Join Failed", err.response?.data?.error || "Failed to join.", "danger");
    }
  };

  const confirmStart = async () => {
    try {
      await api.post(endpoints.start(id));
      setShowStartModal(false);
      loadTournament();
    } catch (err) {
      setShowStartModal(false);
      showInfo("Error", err.response?.data?.error || "Failed to start.", "danger");
    }
  };

  const initiateReport = (matchId, winnerEmail) => {
    setSelectedMatch({ id: matchId, winner: winnerEmail });
    setShowReportModal(true);
  };

  const confirmReport = async () => {
    if (!selectedMatch) return;
    try {
      const res = await api.post(endpoints.report(id, selectedMatch.id), { winner_email: selectedMatch.winner });
      setShowReportModal(false);
      if (res.data.status === 'conflict') {
         showInfo("Conflict Detected", "Both captains voted differently. Votes reset.", "danger");
      } else if (res.data.status === 'finished') {
         showInfo("Match Complete", "Winner confirmed!", "success");
      } else {
         showInfo("Vote Cast", "Waiting for opponent...", "success");
      }
      loadTournament(); 
    } catch (err) {
      setShowReportModal(false);
      showInfo("Error", err.response?.data?.message || "Failed to report.", "danger");
      loadTournament(); 
    }
  };

  if (loading) return <div className="container">Loading tournament data...</div>;
  if (!tournament) return <div className="container"><h2>Unable to Load Tournament</h2></div>;

  const participants = tournament.participants || [];
  const matches = tournament.matches || [];
  const isOrganizer = user && user.email === tournament.organizer_email;

  return (
    <div className="container">
      
      {/* HEADER */}
      <div className="header">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <h1>{tournament.name}</h1>
            
            {/* EDIT BUTTON (Only for Organizer) */}
            {isOrganizer && (
                <button 
                    onClick={() => setShowEditModal(true)} 
                    className="btn-link"
                    style={{fontSize: '0.8rem', padding: '5px 10px', marginTop:'10px'}}
                >
                    Edit Details
                </button>
            )}
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem'}}>
            <div>
                <p>Organizer: <span style={{color: '#c8aa6e'}}>{tournament.organizer_email}</span></p>
                <p>Mode: <span style={{color: '#c8aa6e'}}>
                    {tournament.discipline === '5v5_summoners_rift' ? '5v5 Summoner\'s Rift' : '1v1 Howling Abyss'}
                </span></p>
                <p>Registered: <span style={{color: '#f0e6d2'}}>{participants.length} / {tournament.max_participants} Teams</span></p>
            </div>
            <div style={{textAlign: 'right'}}>
                <p>Start Time: <span style={{color: '#f0e6d2'}}>{new Date(tournament.start_time).toLocaleString()}</span></p>
                <p>Deadline: <span style={{color: '#e33d45'}}>{new Date(tournament.deadline).toLocaleString()}</span></p>
                <p>Status: <b style={{color: tournament.status === 'open' ? '#0acbe6' : '#c8aa6e'}}>{tournament.status.toUpperCase()}</b></p>
            </div>
        </div>

        {tournament.location_url && (
            <div className="map-container">
                <iframe title="loc" width="100%" height="300" frameBorder="0" scrolling="no" src={tournament.location_url}></iframe>
            </div>
        )}
      </div>

      {/* LOBBY STATE */}
      {tournament.status === 'open' ? (
        <div className="lobby-container">
            <div className="join-section card">
                <h3>Register Team</h3>
                <form onSubmit={handleJoin} className="join-form-grid">
                    <div className="form-group"><label>Team Name</label><input placeholder="e.g. T1 Rookies" value={teamName} onChange={e => setTeamName(e.target.value)} required /></div>
                    <div className="form-row">
                        <div className="form-group"><label>Captain ID</label><input placeholder="Name#Tag" value={summonerName} onChange={e => setSummonerName(e.target.value)} required /></div>
                        <div className="form-group"><label>Team MMR</label><input type="number" placeholder="0-5000" value={rank} onChange={e => setRank(parseInt(e.target.value))} required /></div>
                    </div>
                    {tournament.discipline === '5v5_summoners_rift' && (
                        <div className="form-group">
                            <label>Teammates</label>
                            <input placeholder="A, B, C, D" value={teammates} onChange={e => setTeammates(e.target.value)} required />
                            <span className="form-help">Enter exactly 4 names separated by commas.</span>
                        </div>
                    )}
                    <button type="submit" className="btn-join">Join Tournament</button>
                </form>
                {isOrganizer && (
                    <div style={{marginTop: '25px', paddingTop: '15px', borderTop: '1px solid #444'}}>
                        <button onClick={() => setShowStartModal(true)} className="btn-success" style={{width: '100%'}}>Start Tournament (Organizer)</button>
                    </div>
                )}
            </div>
            <div className="roster-section card">
                <h3>Registered Teams ({participants.length} / {tournament.max_participants})</h3>
                <div className="roster-list">
                    {participants.map(p => (
                        <div key={p.id} className="roster-item">
                            <div className="roster-name"><strong>{p.team_name}</strong><span className="roster-captain">{p.license_number}</span></div>
                            <div className="roster-rank">{p.ranking_points} MMR</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      ) : (
        /* BRACKET STATE */
        <div className="bracket">
          <h2>Tournament Bracket</h2>
          <div className="bracket-container">
            {Object.values(groupBy(matches, 'round_number')).map((roundMatches, idx) => (
              <div key={idx} className="round-column">
                <h3>Round {idx + 1}</h3>
                {roundMatches.map((m) => {
                  const isPlayer1 = user?.email === m.player1_email;
                  const isPlayer2 = user?.email === m.player2_email;
                  const isParticipant = isPlayer1 || isPlayer2;
                  const myVote = isPlayer1 ? m.player1_vote : (isPlayer2 ? m.player2_vote : null);
                  const hasVoted = !!myVote;
                  const isConflict = !m.winner_email && m.player1_vote && m.player2_vote;
                  const showButtons = isParticipant && !m.winner_email && (!hasVoted || isConflict);
                  return (
                    <div key={m.id} className={`match-card ${m.winner_email ? 'winner-declared' : ''}`}>
                      <div style={{display:'flex', justifyContent:'space-between'}}><span>P1: {m.player1_email || 'BYE'}</span>{showButtons && <button className="btn-link" style={{padding:'2px 8px'}} onClick={() => initiateReport(m.id, m.player1_email)}>Vote</button>}</div>
                      <div style={{marginTop:'5px', display:'flex', justifyContent:'space-between'}}><span>P2: {m.player2_email || 'BYE'}</span>{showButtons && <button className="btn-link" style={{padding:'2px 8px'}} onClick={() => initiateReport(m.id, m.player2_email)}>Vote</button>}</div>
                      {m.winner_email && <div style={{marginTop:'10px', color:'#c8aa6e'}}>Winner: <strong>{m.winner_email}</strong></div>}
                      {!m.winner_email && hasVoted && !isConflict && <div style={{marginTop:'8px', color:'#a09b8c', fontSize:'0.9rem', fontStyle:'italic'}}>Vote Cast. Waiting...</div>}
                      {isConflict && <div style={{marginTop:'8px', color:'#e33d45', fontWeight:'bold', fontSize:'0.9rem'}}>⚠ CONFLICT! Re-vote required.</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* 1. EDIT MODAL */}
      <HextechModal 
        isOpen={showEditModal} 
        title="Edit Tournament" 
        confirmText="Save Changes" 
        onClose={() => setShowEditModal(false)} 
        onConfirm={saveEdit}
      >
        <div className="form-group" style={{marginBottom:'1rem'}}>
            <label style={{color:'#a09b8c', fontSize:'0.8rem'}}>Tournament Name</label>
            <input 
                name="name" 
                value={editFormData.name} 
                onChange={handleEditChange} 
                style={{width:'100%', padding:'10px', background:'#010a13', border:'1px solid #3c3c41', color:'#f0e6d2'}}
            />
        </div>

        {/* --- START TIME (Locked if not Open) --- */}
        <div className="form-group" style={{marginBottom:'1rem'}}>
            <label style={{color:'#a09b8c', fontSize:'0.8rem'}}>Start Time</label>
            <input 
                type="datetime-local" 
                name="start_time" 
                value={editFormData.start_time} 
                onChange={handleEditChange} 
                disabled={tournament.status !== 'open'}  // <--- LOCK
                style={{
                    width:'100%', padding:'10px', 
                    background: tournament.status !== 'open' ? '#1a1a1d' : '#010a13', // Gray out
                    border:'1px solid #3c3c41', color: tournament.status !== 'open' ? '#555' : '#f0e6d2'
                }}
            />
            {tournament.status !== 'open' && <small style={{color:'#e33d45'}}>Locked (Tournament Started)</small>}
        </div>

        {/* --- DEADLINE (Locked if not Open) --- */}
        <div className="form-group" style={{marginBottom:'1rem'}}>
            <label style={{color:'#a09b8c', fontSize:'0.8rem'}}>Registration Deadline</label>
            <input 
                type="datetime-local" 
                name="deadline" 
                value={editFormData.deadline} 
                onChange={handleEditChange} 
                disabled={tournament.status !== 'open'} // <--- LOCK
                style={{
                    width:'100%', padding:'10px', 
                    background: tournament.status !== 'open' ? '#1a1a1d' : '#010a13', 
                    border:'1px solid #3c3c41', color: tournament.status !== 'open' ? '#555' : '#f0e6d2'
                }}
            />
        </div>

        <div className="form-group" style={{marginBottom:'1rem'}}>
            <label style={{color:'#a09b8c', fontSize:'0.8rem'}}>Google Maps URL</label>
            <textarea 
                name="location_url" 
                value={editFormData.location_url} 
                onChange={handleEditChange} 
                rows="3"
                style={{width:'100%', padding:'10px', background:'#010a13', border:'1px solid #3c3c41', color:'#f0e6d2'}}
            />
        </div>
        <div className="form-group">
            <label style={{color:'#a09b8c', fontSize:'0.8rem'}}>Description</label>
            <textarea 
                name="description" 
                value={editFormData.description} 
                onChange={handleEditChange} 
                rows="3"
                style={{width:'100%', padding:'10px', background:'#010a13', border:'1px solid #3c3c41', color:'#f0e6d2'}}
            />
        </div>
      </HextechModal>

      {/* 2. EXISTING MODALS */}
      <HextechModal isOpen={showStartModal} title="Start Protocol" type="success" confirmText="INITIATE" onClose={() => setShowStartModal(false)} onConfirm={confirmStart}>
        <p>Lock registrations and generate bracket?</p>
      </HextechModal>

      <HextechModal isOpen={showReportModal} title="Confirm Result" confirmText="Submit" onClose={() => setShowReportModal(false)} onConfirm={confirmReport}>
        <p>Voting for: <strong style={{color:'#0acbe6'}}>{selectedMatch?.winner}</strong></p>
      </HextechModal>

      <HextechModal isOpen={infoModal.isOpen} title={infoModal.title} type={infoModal.type} showCancel={false} confirmText="OK" onClose={closeInfo} onConfirm={closeInfo}>
        <p style={{whiteSpace: 'pre-line'}}>{infoModal.message}</p>
      </HextechModal>
    </div>
  );
}

export default TournamentDetail;