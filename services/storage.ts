import { Task, ProgressEntry } from '../types';

const TASKS_KEY = 'pt_tasks';
const ENTRIES_KEY = 'pt_entries';

// Helper to simulate delay for better UX (optional, but nice)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getAllEntriesRaw = (): ProgressEntry[] => {
  const data = localStorage.getItem(ENTRIES_KEY);
  return data ? JSON.parse(data) : [];
};

// Deterministic comparator: Date ASC, then ID ASC
const compareEntriesAsc = (a: ProgressEntry, b: ProgressEntry) => {
  const timeA = new Date(a.dateAndTime).getTime();
  const timeB = new Date(b.dateAndTime).getTime();
  if (timeA !== timeB) return timeA - timeB;
  return a.entryId.localeCompare(b.entryId);
};

// Deterministic comparator: Date DESC, then ID DESC
const compareEntriesDesc = (a: ProgressEntry, b: ProgressEntry) => {
  const timeA = new Date(a.dateAndTime).getTime();
  const timeB = new Date(b.dateAndTime).getTime();
  if (timeA !== timeB) return timeB - timeA;
  return b.entryId.localeCompare(a.entryId);
};

// Helper to recalculate cumulative values for a task's entries
const recalculateEntries = (taskId: string) => {
  const tasks = getTasks();
  const task = tasks.find(t => t.taskId === taskId);
  if (!task) return;

  const allEntries = getAllEntriesRaw();
  const taskEntries = allEntries.filter(e => e.taskId === taskId);
  
  // Sort deterministic ASC for calculation
  taskEntries.sort(compareEntriesAsc);

  let runningTotal = task.startUnits;
  taskEntries.forEach(entry => {
    runningTotal += entry.unitsAdded;
    entry.cumulativeUnits = runningTotal;
  });

  // Save back: filter out old entries for this task and append updated ones
  const otherEntries = allEntries.filter(e => e.taskId !== taskId);
  const newAllEntries = [...otherEntries, ...taskEntries];
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(newAllEntries));
};

export const getTasks = (): Task[] => {
  const data = localStorage.getItem(TASKS_KEY);
  return data ? JSON.parse(data) : [];
};

export const getTaskById = (id: string): Task | undefined => {
  const tasks = getTasks();
  return tasks.find(t => t.taskId === id);
};

export const saveTask = (task: Task): void => {
  const tasks = getTasks();
  const existingIndex = tasks.findIndex(t => t.taskId === task.taskId);
  if (existingIndex >= 0) {
    tasks[existingIndex] = task;
  } else {
    tasks.push(task);
  }
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  // Recalculate entries because startUnits might have changed
  recalculateEntries(task.taskId);
};

export const deleteTask = (taskId: string): void => {
  const tasks = getTasks();
  const newTasks = tasks.filter(t => t.taskId !== taskId);
  localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));

  // Cascade delete entries
  const entries = getAllEntriesRaw();
  const newEntries = entries.filter(e => e.taskId !== taskId);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
};

export const getEntries = (taskId?: string): ProgressEntry[] => {
  const entries = getAllEntriesRaw();
  if (taskId) {
    const filtered = entries.filter(e => e.taskId === taskId);
    // Sort deterministic DESC for UI
    filtered.sort(compareEntriesDesc);
    return filtered;
  }
  return entries;
};

export const getEntryById = (id: string): ProgressEntry | undefined => {
  const entries = getAllEntriesRaw();
  return entries.find(e => e.entryId === id);
};

export const saveEntry = (entry: ProgressEntry): void => {
  const entries = getAllEntriesRaw();
  const existingIndex = entries.findIndex(e => e.entryId === entry.entryId);
  
  // Temporarily save (cumulativeUnits will be fixed in recalculate)
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  
  // Recalculate to ensure cumulativeUnits are correct relative to all history
  recalculateEntries(entry.taskId);
};

export const deleteEntry = (entryId: string): void => {
  const entries = getAllEntriesRaw();
  const entry = entries.find(e => e.entryId === entryId);
  if (!entry) return;
  
  const taskId = entry.taskId;
  const newEntries = entries.filter(e => e.entryId !== entryId);
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(newEntries));
  
  // Recalculate remaining entries for this task
  recalculateEntries(taskId);
};
