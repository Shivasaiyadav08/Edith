import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { resetPassword } from "../api/api"; // adjust path if needed

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("Invalid or missing reset token");
      return;
    }

    try {
      await resetPassword(token, password);
      setMessage("✅ Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setMessage(err.response?.data?.message || "Failed to reset password");
      } else {
        setMessage("Unexpected error occurred");
      }
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700">
          Reset Password
        </h2>

        {message && (
          <p
            className={`mb-4 text-center ${
              message.includes("successful")
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}

        <input
          type="password"
          placeholder="Enter New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
          required
        />

        <button
          type="submit"
          className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Update Password
        </button>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Remember your password?{" "}
          <span
            className="text-blue-600 cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default ResetPassword;
