import "./TournamentDetail.css";
import { useState, useEffect, useContext, useRef } from 'react'; // Added useRef
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
  
  // Keep track of previous data to detect changes (like conflicts)
  const prevTournamentRef = useRef(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [summonerName, setSummonerName] = useState('');
  const [rank, setRank] = useState(0);
  const [teammates, setTeammates] = useState('');

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

  // --- 1. INITIAL LOAD & POLLING ---
  useEffect(() => {
    loadTournament(); // Initial load

    // Poll every 3 seconds to keep clients in sync
    const interval = setInterval(() => {
        loadTournament(true); // true = silent mode (no loading spinner)
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const loadTournament = async (silent = false) => {
    try {
      const res = await api.get(endpoints.tournamentDetail(id));
      const newData = res.data;
      
      // --- SMART CONFLICT DETECTION (For the passive player) ---
      // If we have old data, compare it to new data
      if (prevTournamentRef.current && user) {
        const oldMatches = prevTournamentRef.current.matches || [];
        const newMatches = newData.matches || [];

        newMatches.forEach(newMatch => {
          const oldMatch = oldMatches.find(m => m.id === newMatch.id);
          if (!oldMatch) return;

          // Did I have a vote before?
          const wasMyVote = (newMatch.player1_email === user.email && oldMatch.player1_vote) || 
                            (newMatch.player2_email === user.email && oldMatch.player2_vote);
          
          // Is my vote gone now? (And no winner declared)
          const isMyVoteGone = (newMatch.player1_email === user.email && !newMatch.player1_vote) || 
                               (newMatch.player2_email === user.email && !newMatch.player2_vote);
          
          // If my vote disappeared and there is no winner, it means a CONFLICT reset occurred.
          if (wasMyVote && isMyVoteGone && !newMatch.winner_email) {
             showInfo("Update", "Conflict detected! Votes have been reset. Please vote again.", "danger");
          }
        });
      }

      // Update state and Ref
      setTournament(newData);
      prevTournamentRef.current = newData;
      
      return newData;
    } catch (err) {
      if (!silent) showInfo("Error", "Failed to load tournament data.", "danger");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // --- ACTIONS ---

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await api.post(endpoints.join(id), {
        team_name: teamName,
        license_number: summonerName,
        ranking_points: rank,
        teammates_names: teammates
      });
      showInfo("Success", "Team registered successfully!", "success");
      loadTournament();
      setTeamName(''); setSummonerName(''); setRank(0); setTeammates('');
    } catch (err) {
      showInfo("Registration Failed", err.response?.data?.error || "Failed to join.", "danger");
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

      // Check immediate response for Active Player
      if (res.data.status === 'conflict') {
         showInfo("Conflict Detected", "Both captains voted differently. Votes reset.", "danger");
      } else if (res.data.status === 'finished') {
         showInfo("Match Complete", "Winner confirmed!", "success");
      } else {
         showInfo("Vote Cast", "Waiting for opponent...", "success");
      }
      
      loadTournament(); // Refresh UI
    } catch (err) {
      setShowReportModal(false);
      showInfo("Error", err.response?.data?.message || "Failed to report.", "danger");
      loadTournament(); 
    }
  };

  if (loading || !tournament) return <div className="container">Loading...</div>;

  const participants = tournament.participants || [];
  const matches = tournament.matches || [];

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
                <iframe title="loc" width="100%" height="300" frameBorder="0" scrolling="no" src={tournament.location_url}></iframe>
            </div>
        )}
      </div>

      {/* LOBBY */}
      {tournament.status === 'open' ? (
        <div className="lobby-container">
            <div className="join-section card">
                <h3>Register Team</h3>
                <form onSubmit={handleJoin}>
                    <input placeholder="Team Name" value={teamName} onChange={e => setTeamName(e.target.value)} required />
                    <input placeholder="Captain Summoner Name" value={summonerName} onChange={e => setSummonerName(e.target.value)} required />
                    <input type="number" placeholder="Team MMR" value={rank} onChange={e => setRank(parseInt(e.target.value))} required />
                    <input placeholder="Teammates" value={teammates} onChange={e => setTeammates(e.target.value)} />
                    <button type="submit">Join Tournament</button>
                </form>
                {user && user.email === tournament.organizer_email && (
                    <div style={{marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #444'}}>
                        <button onClick={() => setShowStartModal(true)} className="btn-success" style={{width: '100%'}}>
                            Start Tournament
                        </button>
                    </div>
                )}
            </div>
            <div className="roster-section card">
                <h3>Registered Teams ({participants.length} / {tournament.max_participants})</h3>
                <div className="roster-list">
                    {participants.map(p => (
                        <div key={p.id} className="roster-item">
                            <strong>{p.team_name}</strong> <span>{p.ranking_points} MMR</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      ) : (
        /* BRACKET */
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
                      <div style={{display:'flex', justifyContent:'space-between'}}>
                        <span>P1: {m.player1_email || 'BYE'}</span>
                        {showButtons && <button className="btn-link" style={{fontSize:'0.8rem', padding:'2px 8px'}} onClick={() => initiateReport(m.id, m.player1_email)}>Vote</button>}
                      </div>
                      <div style={{display:'flex', justifyContent:'space-between', marginTop:'5px'}}>
                        <span>P2: {m.player2_email || 'BYE'}</span>
                        {showButtons && <button className="btn-link" style={{fontSize:'0.8rem', padding:'2px 8px'}} onClick={() => initiateReport(m.id, m.player2_email)}>Vote</button>}
                      </div>
                      
                      {m.winner_email && <div style={{marginTop:'10px', color:'#c8aa6e', borderTop:'1px solid #444'}}>Winner: <strong>{m.winner_email}</strong></div>}
                      
                      {!m.winner_email && hasVoted && !isConflict && (
                        <div style={{marginTop:'8px', color:'#a09b8c', fontSize:'0.9rem', fontStyle:'italic'}}>Vote Cast. Waiting for opponent...</div>
                      )}
                      {isConflict && (
                        <div style={{marginTop:'8px', color:'#e33d45', fontWeight:'bold', fontSize:'0.9rem'}}>⚠ CONFLICT! Re-vote required.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <HextechModal isOpen={showStartModal} title="Start Tournament" type="success" confirmText="INITIATE" onClose={() => setShowStartModal(false)} onConfirm={confirmStart}>
        <p>This will lock registration and generate the bracket. Irreversible.</p>
      </HextechModal>

      <HextechModal isOpen={showReportModal} title="Confirm Match Result" confirmText="Submit" onClose={() => setShowReportModal(false)} onConfirm={confirmReport}>
        <p>Voting for: <strong style={{color:'#0acbe6'}}>{selectedMatch?.winner}</strong></p>
      </HextechModal>

      <HextechModal isOpen={infoModal.isOpen} title={infoModal.title} type={infoModal.type} showCancel={false} confirmText="OK" onClose={() => setInfoModal({ ...infoModal, isOpen: false })}>
        <p>{infoModal.message}</p>
      </HextechModal>

    </div>
  );
}

export default TournamentDetail;