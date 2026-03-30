import React, { useEffect, useState } from "react";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "../api/api";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: string;
}

const Expenses: React.FC<{ token: string }> = ({ token }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    const res = await getExpenses(token);
    setExpenses(res.data);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddOrUpdate = async () => {
    if (!title || !amount || !category) return;
    if (editingId) {
      const res = await updateExpense(token, editingId, {
        title,
        amount: parseFloat(amount),
        category
      });
      setExpenses(expenses.map((e) => (e._id === editingId ? res.data : e)));
      setEditingId(null);
    } else {
      const res = await addExpense(token, { title, amount: parseFloat(amount), category });
      setExpenses([...expenses, res.data]);
    }
    setTitle("");
    setAmount("");
    setCategory("");
  };

  const handleEdit = (e: Expense) => {
    setTitle(e.title);
    setAmount(e.amount.toString());
    setCategory(e.category);
    setEditingId(e._id);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(token, id);
    setExpenses(expenses.filter((e) => e._id !== id));
  };

  // Chart
  const categories = Array.from(new Set(expenses.map((e) => e.category)));
  const amountsByCategory = categories.map((cat) =>
    expenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
  );
  const data = {
    labels: categories,
    datasets: [
      {
        label: "Expenses by Category",
        data: amountsByCategory,
        backgroundColor: "rgba(59, 130, 246, 0.7)"
      }
    ]
  };

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Expenses</h1>

      {/* Input + Chart Responsive */}
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        {/* Input Form */}
        <div className="bg-white p-6 rounded-xl shadow w-full lg:w-80">
          <h2 className="text-xl font-semibold mb-4">Add Expense</h2>
          <div className="flex gap-2 mb-2">
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 border-b-2 border-gray-300 focus:border-blue-500 outline-none px-2 py-1 rounded"
            />
            <input
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-24 border-b-2 border-gray-300 focus:border-blue-500 outline-none px-2 py-1 rounded"
            />
          </div>
          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border-b-2 border-gray-300 focus:border-blue-500 outline-none px-2 py-1 rounded mb-4"
          />
          <button
            onClick={handleAddOrUpdate}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white py-2 rounded-lg transition-all font-semibold"
          >
            {editingId ? "Update Expense" : "Add Expense"}
          </button>
        </div>

        {/* Chart */}
        <div className="bg-white p-4 rounded-xl shadow w-full lg:w-[480px] h-64">
          <Bar
            data={data}
            options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }}
          />
        </div>
      </div>

      {/* Expense List */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.map((e) => (
          <li
            key={e._id}
            className="flex justify-between items-center p-3 rounded-xl shadow bg-white"
          >
            <div>
              <p className="font-medium">{e.title}</p>
              <p className="text-sm text-gray-600">
                ${e.amount} — {e.category}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(e)}
                className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(e._id)}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Expenses;
