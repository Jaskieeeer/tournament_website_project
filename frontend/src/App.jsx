import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext'; // <--- Import Context
import './App.css';

// Components
import Login from './components/Login';
import Register from './components/Register';
import TournamentList from './components/TournamentList';
import TournamentDetail from './components/TournamentDetail';
import CreateTournament from './components/CreateTournament';

function App() {
  // Use the global state instead of localStorage checks
  const { user, logoutUser } = useContext(AuthContext);

  return (
    <Router>
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="nav-link">Home</Link>
          {user && (
            <Link to="/create" className="nav-link" style={{color:'#c8aa6e'}}>
               Host Tournament
            </Link>
          )}
        </div>

        <div className="nav-right">
          {user ? (
            <div className="user-info">
              <span className="welcome-text">
                Summoner: <b style={{color: '#0acbe6'}}>{user.username || user.email}</b>
              </span>
              <button onClick={logoutUser} className="btn-logout">Logout</button>
            </div>
          ) : (
            <div className="auth-links">
               <Link to="/login" className="nav-link">Login</Link>
               <Link to="/register" className="nav-link">Register</Link>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/create" element={<CreateTournament />} />
        <Route path="/tournament/:id" element={<TournamentDetail />} />
        <Route path="/" element={<TournamentList />} />
      </Routes>
    </Router>
  );
}

export default App;