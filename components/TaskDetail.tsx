import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, History, Edit, Trash2, Target, CheckCircle, Activity } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { getTaskById, getEntries, deleteTask } from '../services/storage';
import { Task, ProgressEntry } from '../types';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      const loadedTask = getTaskById(taskId);
      if (loadedTask) {
        setTask(loadedTask);
        setEntries(getEntries(taskId));
      } else {
        navigate('/');
      }
      setLoading(false);
    }
  }, [taskId, navigate]);

  const stats = useMemo(() => {
    if (!task) return { current: 0, percentage: 0, remaining: 0 };
    
    // Entries are sorted DESC by storage service (Latest first)
    const latestEntry = entries.length > 0 ? entries[0] : null;
    const current = latestEntry ? latestEntry.cumulativeUnits : task.startUnits;
    
    const percentage = Math.min(100, Math.max(0, (current / task.totalUnits) * 100));
    const remaining = Math.max(0, task.totalUnits - current);
    return { current, percentage, remaining };
  }, [task, entries]);

  const chartData = useMemo(() => {
    if (!task) return [];
    
    // Create a time series
    const dataPoints = [{
        date: new Date(task.createdOn).getTime(),
        displayDate: new Date(task.createdOn).toLocaleDateString(),
        fullDate: new Date(task.createdOn).toLocaleString(),
        cumulative: task.startUnits
    }];

    // Sort entries ASC for the graph to ensure correct step progression
    // Need to reverse the default DESC entries or re-sort
    const sortedEntries = [...entries].sort((a, b) => {
        const timeA = new Date(a.dateAndTime).getTime();
        const timeB = new Date(b.dateAndTime).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.entryId.localeCompare(b.entryId);
    });

    sortedEntries.forEach(entry => {
        dataPoints.push({
            date: new Date(entry.dateAndTime).getTime(),
            displayDate: new Date(entry.dateAndTime).toLocaleDateString(),
            fullDate: new Date(entry.dateAndTime).toLocaleString(),
            cumulative: entry.cumulativeUnits
        });
    });

    // Add "Now" point to extend the graph line to the present moment
    const now = new Date();
    const lastVal = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].cumulative : task.startUnits;
    
    // Always add 'Now' so the graph fills the width
    dataPoints.push({
        date: now.getTime(),
        displayDate: now.toLocaleDateString(),
        fullDate: now.toLocaleString(),
        cumulative: lastVal
    });

    return dataPoints;
  }, [task, entries]);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this task and all its history?')) {
      if (taskId) {
        deleteTask(taskId);
        navigate('/');
      }
    }
  };

  if (loading || !task) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="pb-20">
      <header className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')} 
          className="p-2 -ml-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2">
            <Link to={`/task/${taskId}/edit`} className="p-2 rounded-full hover:bg-gray-200 text-gray-600">
                <Edit size={20} />
            </Link>
            <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-100 text-red-500">
                <Trash2 size={20} />
            </button>
        </div>
      </header>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{task.title}</h1>
        {task.targetDate && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
                <Target size={14} /> Target: {new Date(task.targetDate).toLocaleDateString()}
            </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><CheckCircle size={14}/> Completed</div>
            <div className="text-2xl font-bold text-brand-600">{stats.current}</div>
            <div className="text-xs text-gray-400">of {task.totalUnits} units</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1 flex items-center gap-1"><Activity size={14}/> Progress</div>
            <div className="text-2xl font-bold text-gray-900">{stats.percentage.toFixed(1)}%</div>
            <div className="text-xs text-gray-400">{stats.remaining} remaining</div>
        </div>
      </div>

      {/* Graph */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Cumulative Progress</h3>
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="date" 
                        type="number"
                        domain={['dataMin', 'dataMax']}
                        stroke="#9ca3af" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        minTickGap={30}
                    />
                    <YAxis 
                        stroke="#9ca3af" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false} 
                        domain={[0, 'auto']}
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ color: '#1e40af' }}
                        labelStyle={{ color: '#6b7280', marginBottom: '0.25rem' }}
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [value, "Units"]}
                    />
                    <Area 
                        type="stepAfter" 
                        dataKey="cumulative" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorCumulative)" 
                        animationDuration={500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link 
            to={`/task/${taskId}/add`}
            className="w-full py-4 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-200 flex items-center justify-center gap-2 hover:bg-brand-700 transition-all active:scale-[0.98]"
        >
            <Plus size={20} />
            Add Progress Entry
        </Link>
        <Link 
            to={`/task/${taskId}/history`}
            className="w-full py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
            <History size={20} />
            View Progress History
        </Link>
      </div>
    </div>
  );
};

export default TaskDetail;
