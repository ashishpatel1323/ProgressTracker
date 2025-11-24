import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronRight, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis } from 'recharts';
import { getTasks, getEntries } from '../services/storage';
import { Task, ProgressEntry } from '../types';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entriesMap, setEntriesMap] = useState<Record<string, ProgressEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      const allTasks = getTasks();
      // Sort tasks by creation date desc
      setTasks(allTasks.sort((a, b) => new Date(b.createdOn).getTime() - new Date(a.createdOn).getTime()));
      
      const map: Record<string, ProgressEntry[]> = {};
      allTasks.forEach(task => {
        map[task.taskId] = getEntries(task.taskId);
      });
      setEntriesMap(map);
      
      setLoading(false);
    };
    loadData();
  }, []);

  const getTaskStats = (task: Task) => {
    const taskEntries = entriesMap[task.taskId] || [];
    // Entries are sorted desc by default from getEntries
    const latestEntry = taskEntries[0];
    const current = latestEntry ? latestEntry.cumulativeUnits : task.startUnits;
    
    const percentage = Math.min(100, Math.max(0, (current / task.totalUnits) * 100));
    return { current, percentage, taskEntries };
  };

  const getChartData = (task: Task, taskEntries: ProgressEntry[]) => {
    // Sort asc for graph using stable sort logic
    const sorted = [...taskEntries].sort((a, b) => {
        const timeA = new Date(a.dateAndTime).getTime();
        const timeB = new Date(b.dateAndTime).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.entryId.localeCompare(b.entryId);
    });
    
    // Only use actual entries
    const data = sorted.map(e => ({
      date: new Date(e.dateAndTime).getTime(),
      val: e.cumulativeUnits
    }));

    return data;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading tasks...</div>;
  }

  return (
    <div className="pb-20">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-500 text-sm">Track your progress over time</p>
        </div>
        <Link 
          to="/create" 
          className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-full shadow-lg transition-all"
          aria-label="Create New Task"
        >
          <Plus size={24} />
        </Link>
      </header>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
            <Activity size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No tasks yet</h3>
          <p className="text-gray-500 mb-6">Create your first task to start tracking.</p>
          <Link
            to="/create"
            className="inline-flex items-center text-brand-600 font-medium hover:text-brand-700"
          >
            Create Task <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => {
            const { current, percentage, taskEntries } = getTaskStats(task);
            const chartData = getChartData(task, taskEntries);

            return (
              <Link 
                key={task.taskId} 
                to={`/task/${task.taskId}`}
                className="block bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">{task.title}</h3>
                  <span className="text-sm font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-md">
                    {Math.round(percentage)}%
                  </span>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500 mb-3">
                  <span>{current} / {task.totalUnits} units</span>
                  {task.targetDate && (
                    <span className="text-xs text-gray-400">
                      Due {new Date(task.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-4">
                  <div 
                    className="bg-brand-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {/* Small Progress Graph */}
                <div className="h-16 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`gradient-${task.taskId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                type="number" 
                                domain={['dataMin', 'dataMax']} 
                                hide 
                            />
                            <YAxis domain={[0, 'auto']} hide />
                            <Area 
                                type="monotone" 
                                dataKey="val" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill={`url(#gradient-${task.taskId})`} 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskList;