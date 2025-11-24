import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save } from 'lucide-react';
import { getTaskById, saveTask } from '../services/storage';
import { Task } from '../types';

const TaskForm: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(taskId);

  const [formData, setFormData] = useState({
    title: '',
    totalUnits: '',
    startUnits: '0',
    targetDate: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && taskId) {
      const task = getTaskById(taskId);
      if (task) {
        setFormData({
          title: task.title,
          totalUnits: task.totalUnits.toString(),
          startUnits: task.startUnits.toString(),
          targetDate: task.targetDate || ''
        });
      } else {
        navigate('/');
      }
    }
  }, [isEdit, taskId, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    const total = parseFloat(formData.totalUnits);
    const start = parseFloat(formData.startUnits);

    if (isNaN(total) || total <= 0) {
      setError('Total units must be a positive number');
      return;
    }
    if (isNaN(start) || start < 0) {
      setError('Starting units cannot be negative');
      return;
    }

    const newTask: Task = {
      taskId: taskId || crypto.randomUUID(),
      title: formData.title.trim(),
      totalUnits: total,
      startUnits: start,
      createdOn: isEdit && taskId ? getTaskById(taskId)!.createdOn : new Date().toISOString(),
      targetDate: formData.targetDate || null
    };

    saveTask(newTask);
    navigate(isEdit ? `/task/${newTask.taskId}` : '/');
  };

  return (
    <div className="max-w-xl mx-auto">
      <header className="mb-6 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-3 p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Task' : 'Create New Task'}</h1>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Read 'War and Peace'"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Units</label>
              <input
                type="number"
                name="totalUnits"
                value={formData.totalUnits}
                onChange={handleChange}
                placeholder="1000"
                min="1"
                step="any"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Starting Units</label>
              <input
                type="number"
                name="startUnits"
                value={formData.startUnits}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="any"
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Completion Date (Optional)</label>
            <input
              type="date"
              name="targetDate"
              value={formData.targetDate}
              onChange={handleChange}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-md flex justify-center items-center gap-2 transition-all"
            >
              <Save size={18} />
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;