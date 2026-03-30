'use-client'
import { useState } from "react";
import {forgotPassword} from '../api/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await forgotPassword(email);
      setMessage(res.data.message);
    } catch (err:any) {
      setMessage(err.response.data.message || "Error sending email");
    }
  };

  return (
   <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow-md sm:p-8">
  <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center sm:text-3xl">
    Forgot Password
  </h2>
  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
    <input
      type="email"
      placeholder="Enter your registered email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      required
      className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-base"
    />
    <button
      type="submit"
      className="bg-blue-600 text-white font-medium py-3 rounded-md hover:bg-blue-700 transition-colors sm:text-lg"
    >
      Send Reset Link
    </button>
  </form>
  {message && (
    <p className="mt-4 text-center text-green-600 font-medium">{message}</p>
  )}
</div>

  );
};

export default ForgotPassword;
