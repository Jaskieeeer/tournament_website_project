import { createContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
    let [user, setUser] = useState(null);
    let [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const res = await api.get('/auth/users/me/');
                setUser(res.data);
            } catch (error) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    const loginUser = (access, refresh) => {
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        checkUserLoggedIn(); 
    };

    const logoutUser = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        window.location.href = '/login';
    };

    const contextData = {
        user,
        setUser,
        loginUser,
        logoutUser,
        loading
    };

    return (
        <AuthContext.Provider value={contextData}>
            {loading ? <div>Loading...</div> : children}
        </AuthContext.Provider>
    );
};