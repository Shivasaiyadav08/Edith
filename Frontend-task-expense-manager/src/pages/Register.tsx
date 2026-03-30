import { useState } from "react";
import { registerUser } from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Register({ setToken, setName }: any) {
  const [name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await registerUser({ name, email, password });

      if (res.status === 201) {
        const { token } = res.data; // make sure backend returns token after registration

        // ✅ Save token + name
        localStorage.setItem("token", token);
        localStorage.setItem("name", name);
        setToken(token);
        setName(name);

        // ✅ Redirect to dashboard
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800">
      {/* Left section - Branding */}
      <div className="hidden md:flex flex-col items-center text-center md:w-1/2 p-8 text-white">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-md">
          Join TaskExpensesManager
        </h1>
        <p className="text-lg opacity-90">
          Organize your tasks and track expenses like a pro 🚀
        </p>
      </div>

      {/* Right section - Form */}
      <div className="w-full md:w-1/2 max-w-md bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-white mx-4 relative">
        <h2 className="text-3xl font-bold mb-6 text-center">Create Account ✨</h2>

        {error && (
          <div className="mb-4 text-center bg-red-500/20 border border-red-400 text-red-200 p-3 rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full p-3 mb-3 rounded-lg bg-white/20 text-white placeholder-gray-200 focus:ring-2 focus:ring-blue-300 outline-none"
            required
          />

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
            Register
          </button>
        </form>

        <p className="text-sm text-gray-200 mt-4 text-center">
          Already have an account?{" "}
          <span
            className="text-blue-300 cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
