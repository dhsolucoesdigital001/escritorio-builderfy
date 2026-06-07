// ============================================================
// Escritorio Builderfy - Project Management Schema
// ============================================================

export type ProjectAgentRole = "leader" | "member" | "viewer";

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  officeId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};

export type ProjectAgent = {
  projectId: string;
  agentId: string;
  role: ProjectAgentRole;
  deskObjectId?: string;
  skills: string[];
};

export type ProjectRepo = {
  projectId: string;
  repoUrl: string;
  branch: string;
  webhookSecret?: string;
  autoDeploy: boolean;
};

export type ProjectCron = {
  projectId: string;
  cronId: string;
  cronExpression: string;
  agentId: string;
  command: string;
  enabled: boolean;
  lastRun?: string;
  lastError?: string;
};

export type ProjectSkill = {
  projectId: string;
  skillName: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

// OpenClaw Analyzer types
export type OpenClawAgentInfo = {
  agentId: string;
  name: string;
  model?: string;
  workspacePath?: string;
  memoryEnabled?: boolean;
  cronsCount?: number;
  skills?: string[];
};

export type OpenClawSkillInfo = {
  name: string;
  version?: string;
  path?: string;
};

export type OpenClawWorkspaceInfo = {
  agentId: string;
  path: string;
  hasAgentsMd?: boolean;
  hasSoulMd?: boolean;
  hasMemoryDir?: boolean;
};

export type OpenClawAnalysisResult = {
  agents: OpenClawAgentInfo[];
  skills: OpenClawSkillInfo[];
  workspaces: OpenClawWorkspaceInfo[];
  crons: ProjectCron[];
  totalAgents: number;
  totalSkills: number;
  totalCrons: number;
  analyzedAt: string;
  sourcePath: string;
};

// ============================================================
// Normalizers
// ============================================================

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

export const normalizeProject = (value: unknown, fallbackId: string): Project => {
  if (!isRecord(value)) {
    return {
      id: fallbackId,
      name: "Novo Projeto",
      description: "",
      color: "#00ffcc",
      officeId: "default",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    id: asString(value.id, fallbackId).trim() || fallbackId,
    name: asString(value.name, "Novo Projeto").trim() || "Novo Projeto",
    description: asString(value.description, "").trim(),
    color: asString(value.color, "#00ffcc").trim() || "#00ffcc",
    officeId: asString(value.officeId, "default").trim() || "default",
    createdAt: asString(value.createdAt, new Date().toISOString()).trim(),
    updatedAt: asString(value.updatedAt, new Date().toISOString()).trim(),
    archivedAt: value.archivedAt != null ? asString(value.archivedAt, null) : null,
  };
};

export const normalizeProjectAgent = (value: unknown, projectId: string): ProjectAgent | null => {
  if (!isRecord(value)) return null;
  const agentId = asString(value.agentId).trim();
  if (!agentId) return null;
  const role = asString(value.role) as ProjectAgentRole;
  if (!["leader", "member", "viewer"].includes(role)) return null;
  return {
    projectId,
    agentId,
    role,
    deskObjectId: asString(value.deskObjectId).trim() || undefined,
    skills: Array.isArray(value.skills)
      ? value.skills.filter((s): s is string => typeof s === "string")
      : [],
  };
};

export const normalizeProjectRepo = (value: unknown, projectId: string): ProjectRepo | null => {
  if (!isRecord(value)) return null;
  const repoUrl = asString(value.repoUrl).trim();
  if (!repoUrl) return null;
  return {
    projectId,
    repoUrl,
    branch: asString(value.branch, "main").trim() || "main",
    webhookSecret: asString(value.webhookSecret).trim() || undefined,
    autoDeploy: asBoolean(value.autoDeploy, false),
  };
};

export const normalizeProjectCron = (value: unknown, projectId: string): ProjectCron | null => {
  if (!isRecord(value)) return null;
  const cronId = asString(value.cronId).trim();
  const cronExpression = asString(value.cronExpression).trim();
  const agentId = asString(value.agentId).trim();
  const command = asString(value.command).trim();
  if (!cronId || !cronExpression || !agentId || !command) return null;
  return {
    projectId,
    cronId,
    cronExpression,
    agentId,
    command,
    enabled: asBoolean(value.enabled, true),
    lastRun: asString(value.lastRun).trim() || undefined,
    lastError: asString(value.lastError).trim() || undefined,
  };
};

export const normalizeProjectSkill = (value: unknown, projectId: string): ProjectSkill | null => {
  if (!isRecord(value)) return null;
  const skillName = asString(value.skillName).trim();
  if (!skillName) return null;
  return {
    projectId,
    skillName,
    enabled: asBoolean(value.enabled, true),
    config: isRecord(value.config) ? (value.config as Record<string, unknown>) : undefined,
  };
};

export const normalizeOpenClawAnalysisResult = (value: unknown): OpenClawAnalysisResult => {
  if (!isRecord(value)) {
    return {
      agents: [],
      skills: [],
      workspaces: [],
      crons: [],
      totalAgents: 0,
      totalSkills: 0,
      totalCrons: 0,
      analyzedAt: new Date().toISOString(),
      sourcePath: "",
    };
  }
  return {
    agents: Array.isArray(value.agents) ? value.agents : [],
    skills: Array.isArray(value.skills) ? value.skills : [],
    workspaces: Array.isArray(value.workspaces) ? value.workspaces : [],
    crons: Array.isArray(value.crons) ? value.crons : [],
    totalAgents: asNumber(value.totalAgents, 0),
    totalSkills: asNumber(value.totalSkills, 0),
    totalCrons: asNumber(value.totalCrons, 0),
    analyzedAt: asString(value.analyzedAt, new Date().toISOString()),
    sourcePath: asString(value.sourcePath, ""),
  };
};