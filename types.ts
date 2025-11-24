export interface Task {
  taskId: string;
  title: string;
  totalUnits: number;
  startUnits: number;
  createdOn: string; // ISO Date string
  targetDate: string | null; // ISO Date string
}

export interface ProgressEntry {
  entryId: string;
  taskId: string;
  dateAndTime: string; // ISO Date Time string
  unitsAdded: number;
  cumulativeUnits: number;
}

export interface TaskStats {
  currentUnits: number;
  percentage: number;
  remainingUnits: number;
}