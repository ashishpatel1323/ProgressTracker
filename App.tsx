import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import TaskDetail from './components/TaskDetail';
import EntryForm from './components/EntryForm';
import HistoryList from './components/HistoryList';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-gray-800 font-sans">
        <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative">
            <div className="h-full overflow-y-auto p-4 sm:p-6 bg-slate-50 min-h-screen">
                <Routes>
                    <Route path="/" element={<TaskList />} />
                    <Route path="/create" element={<TaskForm />} />
                    <Route path="/task/:taskId" element={<TaskDetail />} />
                    <Route path="/task/:taskId/edit" element={<TaskForm />} />
                    <Route path="/task/:taskId/add" element={<EntryForm />} />
                    <Route path="/task/:taskId/history" element={<HistoryList />} />
                    <Route path="/task/:taskId/edit-entry/:entryId" element={<EntryForm />} />
                </Routes>
            </div>
        </div>
      </div>
    </Router>
  );
};

export default App;
