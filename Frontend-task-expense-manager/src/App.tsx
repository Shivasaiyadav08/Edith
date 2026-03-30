import React, { useState } from 'react';
// BrowserRouter → wraps the app for routing
// Routes & Route → define page paths
// Navigate → redirect programmatically
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components & Pages
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Expenses from './pages/Expense';
import ResetPassword from './pages/ResetPassword';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';

const App: React.FC = () => {
  // token state to track login
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [name, setName] = useState<string>(localStorage.getItem("name") || "");

  return (
    <Router>
      {/* Sidebar */}
      {token && <Sidebar token={token} setToken={setToken} />}

      {/* Page Content */}
      <div
        className={`min-h-screen bg-gray-50 transition-all duration-300 ${token ? 'lg:ml-64' : ''
          }`}
      >

        {/* Routes */}
        <Routes>
          {/* ✅ Landing Page */}
          <Route
            path="/"
            element={!token ? <Home /> : <Navigate to="/dashboard" />}
          />
          <Route path="/login" element={!token ? <Login setToken={setToken} setName={setName} /> : <Navigate to="/dashboard" />} />
          <Route
            path="/register"
            element={!token ? <Register setToken={setToken} setName={setName} /> : <Navigate to="/dashboard" />}
          />

          {/* Forgot Password page */}
          <Route path="/forgot-password" element={!token ? <ForgotPassword /> : <Navigate to="/dashboard" />} />

          {/* Reset Password page */}
          <Route path="/reset-password/:token" element={!token ? <ResetPassword /> : <Navigate to="/dashboard" />} />

          {/* Protected pages */}
          <Route path="/dashboard" element={token ? <Dashboard token={token} name={name} /> : <Navigate to="/login" />} />
          <Route path="/tasks" element={token ? <Tasks token={token} /> : <Navigate to="/login" />} />
          <Route path="/expenses" element={token ? <Expenses token={token} /> : <Navigate to="/login" />} />

          {/* Default route */}
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
