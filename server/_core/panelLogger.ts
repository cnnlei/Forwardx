export type PanelLogLevel = "log" | "info" | "warn" | "error";
export type PanelLogFilterLevel = PanelLogLevel | "all";

export type PanelLogEntry = {
  id: number;
  level: PanelLogLevel;
  message: string;
  createdAt: string;
};

const MAX_LOGS = 5000;
const DAY_MS = 24 * 60 * 60 * 1000;
let nextLogId = 1;
let logs: PanelLogEntry[] = [];
let installed = false;

function stringifyArg(arg: unknown) {
  if (arg instanceof Error) return arg.stack || arg.message;
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function trimLogs() {
  const cutoff = Date.now() - DAY_MS;
  logs = logs.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff).slice(-MAX_LOGS);
}

export function appendPanelLog(level: PanelLogLevel, ...args: unknown[]) {
  const message = args.map(stringifyArg).join(" ").trim();
  if (!message) return;
  logs.push({
    id: nextLogId++,
    level,
    message,
    createdAt: new Date().toISOString(),
  });
  trimLogs();
}

export function getPanelLogs() {
  trimLogs();
  return logs;
}

export function getFilteredPanelLogs(level: PanelLogFilterLevel = "all") {
  const currentLogs = getPanelLogs();
  return level === "all" ? currentLogs : currentLogs.filter((entry) => entry.level === level);
}

export function getPanelLogSummary() {
  trimLogs();
  return logs.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.level] = (acc[entry.level] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, { all: 0, log: 0, info: 0, warn: 0, error: 0 });
}

export function clearPanelLogs() {
  logs = [];
}

export function formatPanelLogsForExport(level: PanelLogFilterLevel = "all", metadata: Record<string, unknown> = {}) {
  const selectedLogs = getFilteredPanelLogs(level);
  const summary = getPanelLogSummary();
  const generatedAt = new Date().toISOString();
  const header = [
    "ForwardX Panel Logs",
    `Generated At: ${generatedAt}`,
    `Level: ${level}`,
    `Exported Count: ${selectedLogs.length}`,
    `Summary: all=${summary.all || 0}, log=${summary.log || 0}, info=${summary.info || 0}, warn=${summary.warn || 0}, error=${summary.error || 0}`,
    ...Object.entries(metadata).map(([key, value]) => `${key}: ${String(value ?? "")}`),
    "",
    "---- Logs ----",
  ];
  const body = selectedLogs.map((entry) => {
    return `[${entry.createdAt}] [${entry.level.toUpperCase()}] ${entry.message}`;
  });
  return {
    content: [...header, ...body, ""].join("\n"),
    count: selectedLogs.length,
    generatedAt,
  };
}

export function installPanelLogger() {
  if (installed) return;
  installed = true;
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };
  (["log", "info", "warn", "error"] as PanelLogLevel[]).forEach((level) => {
    console[level] = (...args: unknown[]) => {
      appendPanelLog(level, ...args);
      original[level](...args);
    };
  });
}
