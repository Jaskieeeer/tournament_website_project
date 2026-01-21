import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useContext } from 'react';
import AuthContext from './context/AuthContext';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import TournamentList from './components/TournamentList';
import TournamentDetail from './components/TournamentDetail';
import CreateTournament from './components/CreateTournament';
import PlayerProfile from './components/PlayerProfile'; 
import ActivateAccount from './components/ActivateAccount';
import ResetPassword from './components/ResetPassword';
import ResetPasswordConfirm from './components/ResetPasswordConfirm';


function App() {
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
              <Link to={`/profile/${user.username}`} className="profile-link">
                {user.username}
              </Link>
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
        <Route path="/profile/:username" element={<PlayerProfile />} />
        <Route path="/activate/:uid/:token" element={<ActivateAccount />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/password/reset/confirm/:uid/:token" element={<ResetPasswordConfirm />} />
        <Route path="/" element={<TournamentList />} />
      </Routes>
    </Router>
  );
}

export default App;