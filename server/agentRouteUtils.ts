import crypto from "crypto";
import { isSelfTestMeta, type SelfTestMeta } from "../shared/agentDtos";
import {
  LEGACY_PANEL_VERSIONED_AGENT_MAX,
  LEGACY_PANEL_VERSIONED_AGENT_MIN,
} from "../shared/versions";

export function normalizeVersion(version: string | null | undefined) {
  return String(version || "").trim().replace(/^v/i, "");
}

export function compareVersions(a: string | null | undefined, b: string | null | undefined) {
  const pa = normalizeVersion(a).split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = normalizeVersion(b).split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function isLegacyPanelVersionedAgent(version: string | null | undefined) {
  const normalized = normalizeVersion(version);
  return !!normalized
    && compareVersions(normalized, LEGACY_PANEL_VERSIONED_AGENT_MIN) >= 0
    && compareVersions(normalized, LEGACY_PANEL_VERSIONED_AGENT_MAX) <= 0;
}

export function isAgentVersionAtLeast(version: string | null | undefined, target: string | null | undefined) {
  if (!version || !target) return false;
  if (isLegacyPanelVersionedAgent(version)) return false;
  return compareVersions(version, target) >= 0;
}

export function isAgentVersionBehind(version: string | null | undefined, target: string | null | undefined) {
  if (!version || !target) return false;
  if (isLegacyPanelVersionedAgent(version)) return true;
  return compareVersions(version, target) < 0;
}

export function tunnelSecretSeed(tunnel: any) {
  if (tunnel?.secret) return String(tunnel.secret);
  return crypto
    .createHash("sha256")
    .update(`forwardx-tunnel:${tunnel?.id}:${tunnel?.entryHostId}:${tunnel?.exitHostId}`)
    .digest("hex");
}

export function parseSelfTestMeta(message: unknown): SelfTestMeta | null {
  if (typeof message !== "string" || !message.trim().startsWith("{")) return null;
  try {
    const parsed = JSON.parse(message);
    return isSelfTestMeta(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
