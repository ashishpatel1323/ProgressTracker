import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Edit2, Trash2, Calendar, Clock } from 'lucide-react';
import { getEntries, getTaskById, deleteEntry } from '../services/storage';
import { ProgressEntry, Task } from '../types';

const HistoryList: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (taskId) {
        setTask(getTaskById(taskId) || null);
        loadEntries();
    }
  }, [taskId]);

  const loadEntries = () => {
    if (taskId) {
        setEntries(getEntries(taskId));
    }
  };

  const handleDelete = (entryId: string) => {
    if (window.confirm('Delete this entry?')) {
        deleteEntry(entryId);
        loadEntries();
    }
  };

  return (
    <div className="pb-20">
      <header className="mb-6 flex items-center">
        <button 
          onClick={() => navigate(`/task/${taskId}`)} 
          className="mr-3 p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-gray-900">History</h1>
            <p className="text-sm text-gray-500">{task?.title}</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-500">No progress history found.</p>
        </div>
      ) : (
        <div className="space-y-3">
            {entries.map((entry) => (
                <div key={entry.entryId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                            <Calendar size={14} />
                            {new Date(entry.dateAndTime).toLocaleDateString()}
                            <Clock size={14} className="ml-1" />
                            {new Date(entry.dateAndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                        <div className="font-semibold text-gray-900">
                            {entry.unitsAdded > 0 ? '+' : ''}{entry.unitsAdded} units
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Cumulative: {entry.cumulativeUnits}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link 
                            to={`/task/${taskId}/edit-entry/${entry.entryId}`}
                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                            <Edit2 size={18} />
                        </Link>
                        <button 
                            onClick={() => handleDelete(entry.entryId)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;