import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard"); // redirect if token exists
    }
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-blue-700 mb-4">
        TaskExpensesManager
      </h1>

      <p className="text-lg md:text-xl text-gray-700 mb-8">
        Manage your daily tasks and expenses effortlessly
      </p>

      <Link to="/Register">
        <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-2xl shadow-md hover:bg-blue-700 transition duration-300">
          Sign Up
        </button>
      </Link>
    </div>
  );
}
