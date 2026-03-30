import React, { useEffect, useState } from 'react';
import { getTasks, addTask, updateTask, deleteTask } from '../api/api';

interface Task {
  _id: string;
  title: string;
  completed: boolean;
}

const Tasks: React.FC<{ token: string }> = ({ token }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const res = await getTasks(token);
    setTasks(res.data);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddOrUpdate = async () => {
    if (!title) return;
    if (editingId) {
      const res = await updateTask(token, editingId, { title });
      setTasks(tasks.map(t => (t._id === editingId ? res.data : t)));
      setEditingId(null);
    } else {
      const res = await addTask(token, { title });
      setTasks([...tasks, res.data]);
    }
    setTitle('');
  };

  const handleDelete = async (id: string) => {
    await deleteTask(token, id);
    setTasks(tasks.filter(t => t._id !== id));
  };

  const handleToggleComplete = async (task: Task) => {
    const res = await updateTask(token, task._id, { completed: !task.completed });
    setTasks(tasks.map(t => (t._id === task._id ? res.data : t)));
  };

  const handleEdit = (task: Task) => {
    setTitle(task.title);
    setEditingId(task._id);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>

      {/* Input Section */}
      <div className="flex flex-col sm:flex-row mb-6 gap-2">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="border p-2 flex-1 rounded focus:ring-2 focus:ring-blue-400 outline-none"
          placeholder="Enter task title..."
        />
        <button
          onClick={handleAddOrUpdate}
          className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 py-2 rounded hover:from-blue-500 hover:to-blue-300 transition"
        >
          {editingId ? 'Update Task' : 'Add Task'}
        </button>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(t => (
          <div
            key={t._id}
            className={`p-4 rounded-lg shadow transition ${
              t.completed ? 'bg-green-100 line-through' : 'bg-white'
            }`}
          >
            <h3 className="font-semibold mb-2">{t.title}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleEdit(t)}
                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(t._id)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                Delete
              </button>
              <button
                onClick={() => handleToggleComplete(t)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                {t.completed ? 'Undo' : 'Complete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tasks;
