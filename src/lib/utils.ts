import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type Exercise = { name: string; minutes: number; mets: number };
export type DailyLog = { intakeKcal: number; exercises: Exercise[]; weightKg?: number };
export type Logs = Record<string, DailyLog>;
export type Settings = {
  bmr: number;
  activityFactor: number;
  startWeightKg: number;
  targetWeightKg: number;
  startDate: string;
  endDate: string;
};

export function formatDateToYMD(date: Date): string {
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
}

export function formatDateToMD(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return (date.getMonth() + 1) + '/' + date.getDate();
}

export function deriveChartData(logs: Logs, s: Settings) {
  const dates = Object.keys(logs).sort();
  let cumDef = 0;
  return dates.map(d => {
    const L = logs[d];
    const w = s.startWeightKg;
    const exerciseKcal = (L.exercises || []).reduce((sum, ex) =>
      sum + ex.mets * 3.5 * w / 200 * ex.minutes, 0);
    const tdee = s.bmr * s.activityFactor + exerciseKcal;
    const deficit = L.intakeKcal - tdee;
    cumDef += Math.max(0, -deficit);
    const fat = cumDef / 7200;
    return { date: formatDateToMD(d), deficit, cumDef, fat };
  });
}

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem("cute-fatloss:settings");
    return stored ? JSON.parse(stored) : {
      bmr: 1300,
      activityFactor: 1.40,
      startWeightKg: 71,
      targetWeightKg: 68,
      startDate: "2025-08-20",
      endDate: "2025-09-30"
    };
  } catch {
    return {
      bmr: 1300,
      activityFactor: 1.40,
      startWeightKg: 71,
      targetWeightKg: 68,
      startDate: "2025-08-20",
      endDate: "2025-09-30"
    };
  }
}

export function saveSettings(settings: Settings) {
  localStorage.setItem("cute-fatloss:settings", JSON.stringify(settings));
}

export function loadLogs(): Logs {
  try {
    const stored = localStorage.getItem("cute-fatloss:logs");
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveLogs(logs: Logs) {
  localStorage.setItem("cute-fatloss:logs", JSON.stringify(logs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}