import React, { useEffect, useState, useMemo } from "react";
import { getTasks, getExpenses } from "../api/api";

interface Task {
  _id: string;
  title: string;
  completed: boolean;
}
interface Expense {
  _id: string;
  title: string;
  amount: number;
  category: string;
}
interface DashboardProps{
  token:string,
  name:string
}

const Dashboard: React.FC<DashboardProps> = ({ token ,name}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
 

  useEffect(() => {
    const fetchData = async () => {
      const tasksRes = await getTasks(token);
      setTasks(tasksRes.data);
      const expensesRes = await getExpenses(token);
      setExpenses(expensesRes.data);
      // setName(localStorage.)
    };
    fetchData();
  }, [token]);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Welcome to Your Dashboard {name}
      </h1>

      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-blue-500 text-white p-6 rounded-xl shadow hover:scale-105 transform transition">
          <h3 className="text-lg font-medium">Total Tasks</h3>
          <p className="text-3xl font-bold mt-2">{tasks.length}</p>
        </div>

        <div className="bg-green-500 text-white p-6 rounded-xl shadow hover:scale-105 transform transition">
          <h3 className="text-lg font-medium">Completed Tasks</h3>
          <p className="text-3xl font-bold mt-2">
            {tasks.filter((t) => t.completed).length}
          </p>
        </div>

        <div className="bg-red-500 text-white p-6 rounded-xl shadow hover:scale-105 transform transition">
          <h3 className="text-lg font-medium">Total Expenses</h3>
          <p className="text-3xl font-bold mt-2">${totalExpenses}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
