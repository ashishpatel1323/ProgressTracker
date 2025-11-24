import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, ArrowRightLeft } from 'lucide-react';
import { getTaskById, saveEntry, getEntryById, getEntries } from '../services/storage';
import { ProgressEntry } from '../types';

const EntryForm: React.FC = () => {
  const { taskId, entryId } = useParams<{ taskId: string, entryId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(entryId);
  
  // Format current date-time for datetime-local input (YYYY-MM-DDTHH:mm)
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [mode, setMode] = useState<'add' | 'update'>('add');
  const [formData, setFormData] = useState({
    value: '', // This represents unitsAdded OR totalCumulative based on mode
    dateAndTime: getCurrentDateTime()
  });
  const [taskTitle, setTaskTitle] = useState('');
  const [currentCumulative, setCurrentCumulative] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
        const task = getTaskById(taskId);
        if (task) {
            setTaskTitle(task.title);
            
            // Calculate current cumulative from latest entry
            const entries = getEntries(taskId);
            // Entries are sorted desc by default from storage
            const latestEntry = entries.length > 0 ? entries[0] : null;
            const current = latestEntry ? latestEntry.cumulativeUnits : task.startUnits;
            setCurrentCumulative(current);
        } else {
            navigate('/');
        }
    }

    if (isEdit && entryId) {
        const entry = getEntryById(entryId);
        if (entry) {
            setFormData({
                value: entry.unitsAdded.toString(),
                dateAndTime: entry.dateAndTime
            });
            // In edit mode, we are editing a specific delta, so 'add' mode makes most sense conceptually
            setMode('add'); 
        }
    }
    setLoading(false);
  }, [taskId, entryId, isEdit, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = parseFloat(formData.value);

    if (isNaN(inputVal)) {
        alert('Please enter a valid number.');
        return;
    }

    let unitsAdded = 0;
    if (mode === 'add') {
        unitsAdded = inputVal;
        if (unitsAdded === 0) {
            alert('Please enter a valid amount of units (non-zero).');
            return;
        }
    } else {
        // Update mode: unitsAdded = newTotal - currentCumulative
        unitsAdded = inputVal - currentCumulative;
        if (unitsAdded === 0) {
            alert('The new total is the same as the current progress. No changes made.');
            return;
        }
    }

    if (!taskId) return;

    const entry: ProgressEntry = {
        entryId: entryId || crypto.randomUUID(),
        taskId: taskId,
        dateAndTime: formData.dateAndTime,
        unitsAdded: unitsAdded,
        cumulativeUnits: 0 // Will be calculated by storage service
    };

    saveEntry(entry);
    navigate(`/task/${taskId}`);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto pb-12">
      <header className="mb-6 flex items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="mr-3 p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Entry' : 'Add Progress'}</h1>
            <p className="text-sm text-gray-500 truncate max-w-[200px]">{taskTitle}</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Mode Toggles */}
            {!isEdit && (
                <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                    <button
                        type="button"
                        onClick={() => { setMode('add'); setFormData(prev => ({ ...prev, value: '' })); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'add' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Add to Progress
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMode('update'); setFormData(prev => ({ ...prev, value: currentCumulative.toString() })); }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'update' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Update Status
                    </button>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                  {mode === 'add' ? 'Units Completed Today' : 'Current Total Units'}
              </label>
              <div className="relative">
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder={mode === 'add' ? "e.g. 15" : "e.g. 150"}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full p-4 text-2xl font-semibold text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                  {mode === 'update' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                          Current: {currentCumulative}
                      </div>
                  )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {mode === 'add' 
                    ? "Enter the amount of work you finished recently." 
                    : "Enter the new total amount completed so far."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date and Time</label>
              <input
                type="datetime-local"
                required
                value={formData.dateAndTime}
                onChange={(e) => setFormData(prev => ({ ...prev, dateAndTime: e.target.value }))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 shadow-md flex justify-center items-center gap-2 transition-all mt-4"
            >
              <Save size={18} />
              Save Entry
            </button>
        </form>
      </div>
    </div>
  );
};

export default EntryForm;
