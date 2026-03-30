import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { loginUser } from "../api/api";

interface LoginProps {
  setToken: (t: string) => void;
  setName: (t: string) => void;
}

const Login: React.FC<LoginProps> = ({ setToken, setName }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await loginUser({ email, password });
      setToken(res.data.token);
      localStorage.setItem("token", res.data.token);

      setName(res.data.user.name);
      localStorage.setItem("name", res.data.user.name);

      navigate("/dashboard");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      } else {
        setError("Unexpected error occurred");
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800">
      {/* Left side - branding */}
      <div className="hidden md:flex flex-col items-center text-center md:w-1/2 p-8 text-white">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-md">
          TaskExpensesManager
        </h1>
        <p className="text-lg opacity-90">
          Manage your daily tasks and expenses seamlessly.
        </p>
      </div>

      {/* Right side - form */}
      <div className="w-full md:w-1/2 max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-white mx-4 relative">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Welcome Back 👋
        </h2>

        {/* Animated Error Message */}
        {error && (
          <div className="mb-4 text-center bg-red-500/20 border border-red-400 text-red-200 p-3 rounded-lg animate-fade-in">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 mb-4 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />

          <button
            type="submit"
            className="w-full p-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
          >
            Login
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/forgot-password" className="text-blue-200 hover:underline">
            Forgot Password?
          </Link>
        </div>

        <p className="text-sm text-gray-200 mt-4 text-center">
          Don&apos;t have an account?{" "}
          <span
            className="text-blue-300 cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
