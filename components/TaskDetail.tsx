import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Edit, Trash2, ChevronDown, Plus, Info } from 'lucide-react';
import { 
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { getTaskById, getEntries, deleteTask, deleteEntry } from '../services/storage';
import { Task, ProgressEntry } from '../types';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  
  // Data State
  const [task, setTask] = useState<Task | null>(null);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'all'>('all');
  const [showTrends, setShowTrends] = useState(true);
  const [showHistory, setShowHistory] = useState(true);

  // Load Data
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

  const handleDeleteTask = () => {
    if (window.confirm('Are you sure you want to delete this task and all its history?')) {
      if (taskId) {
        deleteTask(taskId);
        navigate('/');
      }
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    if (window.confirm('Delete this entry?')) {
        deleteEntry(entryId);
        // Refresh data
        if (taskId) {
            setEntries(getEntries(taskId));
        }
    }
  };

  // --- Calculations & Memoization ---

  // Prepare full dataset
  const fullChartData = useMemo(() => {
    if (!task) return [];
    
    // Sort entries ASC by time
    const sortedEntries = [...entries].sort((a, b) => 
        new Date(a.dateAndTime).getTime() - new Date(b.dateAndTime).getTime()
    );

    return sortedEntries.map(entry => ({
        date: new Date(entry.dateAndTime).getTime(),
        cumulative: entry.cumulativeUnits,
        delta: entry.unitsAdded,
        tooltipDate: new Date(entry.dateAndTime)
    }));
  }, [task, entries]);

  // Filter Data based on Time Range
  const { filteredData, xDomain, xTickFormatter, xTicks } = useMemo(() => {
      const now = Date.now();
      let data = fullChartData;
      let domain: [number | string, number | string] = ['dataMin', 'dataMax'];
      let formatter = (tick: number) => new Date(tick).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
      let ticks: number[] | undefined = undefined;

      // Helper to generate ticks
      const generateTicks = (start: number, end: number, intervalMs: number) => {
          const t = [];
          for (let time = start; time <= end; time += intervalMs) {
              t.push(time);
          }
          return t;
      };

      if (timeRange === 'day') {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          data = fullChartData.filter(d => d.date >= oneDayAgo);
          domain = [oneDayAgo, now];
          formatter = (tick: number) => new Date(tick).toLocaleTimeString([], { hour: 'numeric', hour12: true }); // 12 AM
          // Generate ticks every 6 hours
          ticks = generateTicks(oneDayAgo, now, 6 * 60 * 60 * 1000);
      } 
      else if (timeRange === 'week') {
          const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
          data = fullChartData.filter(d => d.date >= oneWeekAgo);
          domain = [oneWeekAgo, now];
          formatter = (tick: number) => new Date(tick).toLocaleDateString(undefined, { weekday: 'short' }); // Mon
          // Ticks every day
          ticks = generateTicks(oneWeekAgo, now, 24 * 60 * 60 * 1000);
      }
      else if (timeRange === 'month') {
          const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
          data = fullChartData.filter(d => d.date >= oneMonthAgo);
          domain = [oneMonthAgo, now];
          formatter = (tick: number) => new Date(tick).getDate().toString(); // 15
          // Ticks every 5 days
          ticks = generateTicks(oneMonthAgo, now, 5 * 24 * 60 * 60 * 1000);
      }
      else {
          // All Time
          data = fullChartData;
          domain = ['dataMin', 'dataMax'];
          formatter = (tick: number) => new Date(tick).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }); // Nov 25
      }

      // If no data in range, still return the domain so the axis scales correctly
      return { filteredData: data, xDomain: domain, xTickFormatter: formatter, xTicks: ticks };
  }, [fullChartData, timeRange]);

  // Stats & Projection (Calculated on ALL data regardless of view)
  const stats = useMemo(() => {
    if (!task) return { projectedDate: null, daysRemaining: null };
    
    const currentUnits = entries.length > 0 ? entries[0].cumulativeUnits : task.startUnits;
    const remaining = task.totalUnits - currentUnits;
    
    if (remaining <= 0) return { projectedDate: 'Completed', daysRemaining: 0 };

    const createdTime = new Date(task.createdOn).getTime();
    const nowTime = new Date().getTime();
    const daysElapsed = Math.max(1, (nowTime - createdTime) / (1000 * 60 * 60 * 24));
    const unitsGained = currentUnits - task.startUnits;
    
    const velocity = unitsGained / daysElapsed; 

    if (velocity <= 0) return { projectedDate: 'N/A', daysRemaining: null };

    const daysNeeded = remaining / velocity;
    const projDate = new Date(nowTime + (daysNeeded * 1000 * 60 * 60 * 24));
    
    return { 
        projectedDate: projDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        daysRemaining: Math.ceil(daysNeeded)
    };
  }, [task, entries]);

  if (loading || !task) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-24 font-sans">
      
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronLeft className="text-gray-600" size={24} />
            </button>
            <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight truncate max-w-[150px]">{task.title}</h1>
            </div>
        </div>
        <div className="flex gap-1">
             <Link to={`/task/${taskId}/edit`} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                <Edit size={20} />
            </Link>
            <button onClick={handleDeleteTask} className="p-2 rounded-full hover:bg-red-50 text-red-500">
                <Trash2 size={20} />
            </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-4 pt-4 pb-2">
        <div className="flex p-1 bg-gray-100 rounded-lg">
            {(['day', 'week', 'month', 'all'] as const).map(range => (
                <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                        timeRange === range 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    {range === 'all' ? 'All-Time' : range}
                </button>
            ))}
        </div>
      </div>

      {/* Graph Section */}
      <div className="bg-white px-4 pb-6 mb-2 border-b border-gray-100">
        <div className="flex justify-center items-center py-4">
            <h2 className="text-base font-semibold text-gray-900">
                {timeRange === 'day' && 'Last 24 Hours'}
                {timeRange === 'week' && 'Last 7 Days'}
                {timeRange === 'month' && 'Last 30 Days'}
                {timeRange === 'all' && 'Lifetime Progress'}
            </h2>
            <Info size={14} className="ml-1.5 text-brand-400" />
        </div>
        
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="date" 
                        type="number"
                        domain={xDomain}
                        scale="time"
                        tickFormatter={xTickFormatter}
                        ticks={xTicks}
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    
                    {/* Only Right Y Axis for Cumulative */}
                    <YAxis 
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: '#3b82f6', fontWeight: 600 }}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'auto']}
                        allowDecimals={false}
                    />
                    
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            padding: '8px 12px'
                        }}
                        labelFormatter={(label) => new Date(label).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    
                    {/* Dotted Drop Lines (Simulated using Bar with custom shape or just using Area)
                        Since the user asked to replace bar with dotted line, 
                        Chart libraries usually do this via 'cursor' in Tooltip or ReferenceLine.
                        But to show a persistent drop line for each point is complex in Recharts.
                        
                        Instead, I will rely on the Area Chart dots and the grid. 
                        Re-adding the Bar as a very thin "stick" or removing it if strictly requested.
                        User said "Replace that with a dotted line which from the point in graph to x axis."
                        Ideally this is done via a custom Shape in <Bar> or <Scatter>. 
                        
                        For simplicity and robustness, I will use a Bar with a very narrow width and dashed stroke style
                        to simulate the drop line.
                     */}
                     <Bar 
                        yAxisId="right"
                        dataKey="cumulative" 
                        barSize={1}
                        fill="transparent"
                        stroke="#cbd5e1"
                        strokeDasharray="3 3"
                        isAnimationActive={false}
                     />

                    {/* Cumulative Line */}
                    <Area 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cumulative" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        fill="url(#areaGradient)" 
                        dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        name="Total"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Trends Section */}
      <div className="px-4 mt-4">
        <button 
            onClick={() => setShowTrends(!showTrends)}
            className="flex items-center justify-between w-full mb-2"
        >
            <h3 className="text-base font-bold text-gray-900">Trends</h3>
            {showTrends ? <ChevronDown size={20} className="text-brand-500" /> : <ChevronLeft size={20} className="text-gray-400 rotate-180" />}
        </button>
        
        {showTrends && (
            <div className="bg-gray-200 rounded-xl p-4 flex justify-between items-center transition-all">
                <span className="text-gray-700 font-medium">Projected Completion</span>
                <span className="text-gray-900 font-bold">{stats.projectedDate || 'Calculating...'}</span>
            </div>
        )}
      </div>

      {/* History Section */}
      <div className="px-4 mt-6">
        <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full mb-3"
        >
            <h3 className="text-base font-bold text-gray-900">History</h3>
            {showHistory ? <ChevronDown size={20} className="text-brand-500" /> : <ChevronLeft size={20} className="text-gray-400 rotate-180" />}
        </button>

        {showHistory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {entries.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm italic col-span-full bg-white rounded-xl">
                        No history yet. Start tracking!
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.entryId} className="bg-gray-200 rounded-xl p-4 relative group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 leading-none mb-2">
                                        {entry.cumulativeUnits}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {new Date(entry.dateAndTime).toLocaleDateString(undefined, {
                                            month: 'short', 
                                            day: 'numeric', 
                                            year: 'numeric'
                                        })} at {new Date(entry.dateAndTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                    {entry.unitsAdded !== 0 && (
                                        <div className="text-xs text-brand-600 mt-1 font-medium">
                                            {entry.unitsAdded > 0 ? '+' : ''}{entry.unitsAdded} added
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Link to={`/task/${taskId}/edit-entry/${entry.entryId}`} className="text-gray-400 hover:text-brand-600">
                                        <Edit size={16} />
                                    </Link>
                                    <button onClick={() => handleDeleteEntry(entry.entryId)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        )}
      </div>

      {/* Floating Add Button */}
      <Link
        to={`/task/${taskId}/add`}
        className="fixed bottom-6 right-6 bg-brand-600 text-white p-4 rounded-full shadow-lg shadow-brand-500/30 hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all z-20 flex items-center justify-center"
      >
        <Plus size={28} />
      </Link>

    </div>
  );
};

export default TaskDetail;