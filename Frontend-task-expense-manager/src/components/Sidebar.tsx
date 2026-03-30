import React, { useState } from 'react';
//Link → used to create navigation links (like <a>, but without page reload).
//useNavigate → a hook to redirect programmatically. Example: after login, send user to dashboard.
import { Link, useNavigate } from 'react-router-dom';
//These are Font Awesome icons provided by the react-icons package
import { 
  FaHome, 
  FaTasks, 
  FaMoneyBillWave, 
  FaSignOutAlt, 
  FaBars, 
  FaTimes 
} from 'react-icons/fa';

//an interface is used to describe the shape of an object.
//This defines what props your Sidebar component should accept.
interface SidebarProps { 
  token: string | null; 
  // This describes a function that updates the token.
  //It takes one argument t which can be either a string or null.
  //It returns nothing (void), just updates state.
  setToken: (t: string | null) => void; 
}

//Sidebar: React.FC<SidebarProps> → means Sidebar is a React Function Component that expects SidebarProps.
const Sidebar: React.FC<SidebarProps> = ({ token, setToken }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // state for mobile menu toggle

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('name')
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="lg:hidden flex justify-between items-center bg-blue-700 text-white p-4">
        <h2 className="text-2xl font-bold">TaskExpensesManager</h2>
        <button onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* Sidebar */ }
      {/* for large screen the side bar is always open and for small screen it is toggled based on it open or not */ }
      <div
        className={`
          fixed top-0 left-0 h-screen bg-gradient-to-b from-blue-700 to-blue-900 text-white p-6
          w-64 transform lg:translate-x-0 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 z-50
        `}
      >
        <h2 className="text-3xl font-bold mb-8 text-center hidden lg:block">TaskExpenses</h2>

        {token && (
          <>
            {/* Dashboard, Tasks & Expenses links */}
            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-3 hover:bg-blue-600 px-3 rounded"
            >
              <FaHome /> Dashboard
            </Link>
            <Link
              to="/tasks"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-3 hover:bg-blue-600 px-3 rounded"
            >
              <FaTasks /> Tasks
            </Link>
            <Link
              to="/expenses"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 py-3 hover:bg-blue-600 px-3 rounded"
            >
              <FaMoneyBillWave /> Expenses
            </Link>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 mt-6 bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
            >
              <FaSignOutAlt /> Logout
            </button>
          </>
        )}

      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black opacity-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
