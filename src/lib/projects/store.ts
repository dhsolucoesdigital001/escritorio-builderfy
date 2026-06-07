import fs from "node:fs";
import path from "node:path";
import { resolveStateDir } from "@/lib/clawdbot/paths";
import type {
  Project,
  ProjectAgent,
  ProjectRepo,
  ProjectCron,
  ProjectSkill,
  OpenClawAnalysisResult,
} from "./schema";
import { normalizeProject, normalizeProjectAgent, normalizeProjectRepo, normalizeProjectCron, normalizeProjectSkill } from "./schema";

// ============================================================
// Store Shape
// ============================================================

export type ProjectStoreShape = {
  schemaVersion: number;
  projects: Project[];
  projectAgents: ProjectAgent[];
  projectRepos: ProjectRepo[];
  projectCrons: ProjectCron[];
  projectSkills: ProjectSkill[];
};

// ============================================================
// Persistence
// ============================================================

const STORE_DIR = "escritorio-builderfy";
const STORE_FILE = "project-store.json";
const STORE_VERSION = 1;

const ensureDirectory = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const resolveStorePath = () => {
  const stateDir = resolveStateDir();
  const dir = path.join(stateDir, STORE_DIR);
  ensureDirectory(dir);
  return path.join(dir, STORE_FILE);
};

const defaultStore = (): ProjectStoreShape => ({
  schemaVersion: STORE_VERSION,
  projects: [],
  projectAgents: [],
  projectRepos: [],
  projectCrons: [],
  projectSkills: [],
});

const normalizeStore = (value: unknown): ProjectStoreShape => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultStore();
  const raw = value as Record<string, unknown>;
  return {
    schemaVersion: STORE_VERSION,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    projectAgents: Array.isArray(raw.projectAgents) ? raw.projectAgents : [],
    projectRepos: Array.isArray(raw.projectRepos) ? raw.projectRepos : [],
    projectCrons: Array.isArray(raw.projectCrons) ? raw.projectCrons : [],
    projectSkills: Array.isArray(raw.projectSkills) ? raw.projectSkills : [],
  };
};

const readStore = (): ProjectStoreShape => {
  const storePath = resolveStorePath();
  if (!fs.existsSync(storePath)) return defaultStore();
  const raw = fs.readFileSync(storePath, "utf8");
  return normalizeStore(JSON.parse(raw));
};

const writeStore = (store: ProjectStoreShape) => {
  const storePath = resolveStorePath();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
};

// ============================================================
// Projects CRUD
// ============================================================

export const listProjects = () => {
  const store = readStore();
  return store.projects
    .filter((p) => !p.archivedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const getProject = (projectId: string) => {
  const store = readStore();
  return store.projects.find((p) => p.id === projectId) ?? null;
};

export const createProject = (params: {
  id: string;
  name: string;
  description: string;
  color: string;
  officeId?: string;
}) => {
  const store = readStore();
  const now = new Date().toISOString();
  const project: Project = {
    id: params.id,
    name: params.name.trim(),
    description: params.description.trim(),
    color: params.color || "#00ffcc",
    officeId: params.officeId || "default",
    createdAt: now,
    updatedAt: now,
  };
  store.projects.push(project);
  writeStore(store);
  return project;
};

export const updateProject = (params: {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  officeId?: string;
}) => {
  const store = readStore();
  const idx = store.projects.findIndex((p) => p.id === params.id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const project = store.projects[idx];
  if (params.name !== undefined) project.name = params.name.trim();
  if (params.description !== undefined) project.description = params.description.trim();
  if (params.color !== undefined) project.color = params.color;
  if (params.officeId !== undefined) project.officeId = params.officeId;
  project.updatedAt = now;
  writeStore(store);
  return project;
};

export const archiveProject = (projectId: string) => {
  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return null;
  project.archivedAt = new Date().toISOString();
  project.updatedAt = project.archivedAt;
  writeStore(store);
  return project;
};

export const deleteProject = (projectId: string) => {
  const store = readStore();
  store.projects = store.projects.filter((p) => p.id !== projectId);
  store.projectAgents = store.projectAgents.filter((a) => a.projectId !== projectId);
  store.projectRepos = store.projectRepos.filter((r) => r.projectId !== projectId);
  store.projectCrons = store.projectCrons.filter((c) => c.projectId !== projectId);
  store.projectSkills = store.projectSkills.filter((s) => s.projectId !== projectId);
  writeStore(store);
  return true;
};

// ============================================================
// Project Agents
// ============================================================

export const listProjectAgents = (projectId: string) => {
  const store = readStore();
  return store.projectAgents.filter((a) => a.projectId === projectId);
};

export const assignAgent = (projectId: string, agentId: string, role: ProjectAgent["role"], skills?: string[]) => {
  const store = readStore();
  const existing = store.projectAgents.find((a) => a.projectId === projectId && a.agentId === agentId);
  if (existing) {
    existing.role = role;
    if (skills !== undefined) existing.skills = skills;
    writeStore(store);
    return existing;
  }
  const agent: ProjectAgent = { projectId, agentId, role, skills: skills || [] };
  store.projectAgents.push(agent);
  writeStore(store);
  return agent;
};

export const removeAgent = (projectId: string, agentId: string) => {
  const store = readStore();
  store.projectAgents = store.projectAgents.filter((a) => !(a.projectId === projectId && a.agentId === agentId));
  writeStore(store);
  return true;
};

// ============================================================
// Project Repos
// ============================================================

export const listProjectRepos = (projectId: string) => {
  const store = readStore();
  return store.projectRepos.filter((r) => r.projectId === projectId);
};

export const linkRepo = (params: { projectId: string; repoUrl: string; branch?: string; autoDeploy?: boolean }) => {
  const store = readStore();
  const existing = store.projectRepos.find((r) => r.projectId === params.projectId && r.repoUrl === params.repoUrl);
  if (existing) return existing;
  const repo: ProjectRepo = {
    projectId: params.projectId,
    repoUrl: params.repoUrl,
    branch: params.branch || "main",
    autoDeploy: params.autoDeploy ?? false,
  };
  store.projectRepos.push(repo);
  writeStore(store);
  return repo;
};

export const unlinkRepo = (projectId: string, repoUrl: string) => {
  const store = readStore();
  store.projectRepos = store.projectRepos.filter((r) => !(r.projectId === projectId && r.repoUrl === repoUrl));
  writeStore(store);
  return true;
};

// ============================================================
// Project Crons
// ============================================================

export const listProjectCrons = (projectId: string) => {
  const store = readStore();
  return store.projectCrons.filter((c) => c.projectId === projectId);
};

export const createProjectCron = (params: {
  projectId: string;
  cronId: string;
  cronExpression: string;
  agentId: string;
  command: string;
}) => {
  const store = readStore();
  const existing = store.projectCrons.find((c) => c.cronId === params.cronId);
  if (existing) return existing;
  const cron: ProjectCron = {
    projectId: params.projectId,
    cronId: params.cronId,
    cronExpression: params.cronExpression,
    agentId: params.agentId,
    command: params.command,
    enabled: true,
  };
  store.projectCrons.push(cron);
  writeStore(store);
  return cron;
};

export const updateProjectCron = (params: {
  cronId: string;
  cronExpression?: string;
  agentId?: string;
  command?: string;
  enabled?: boolean;
  lastRun?: string;
  lastError?: string;
}) => {
  const store = readStore();
  const cron = store.projectCrons.find((c) => c.cronId === params.cronId);
  if (!cron) return null;
  if (params.cronExpression !== undefined) cron.cronExpression = params.cronExpression;
  if (params.agentId !== undefined) cron.agentId = params.agentId;
  if (params.command !== undefined) cron.command = params.command;
  if (params.enabled !== undefined) cron.enabled = params.enabled;
  if (params.lastRun !== undefined) cron.lastRun = params.lastRun;
  if (params.lastError !== undefined) cron.lastError = params.lastError;
  writeStore(store);
  return cron;
};

export const deleteProjectCron = (cronId: string) => {
  const store = readStore();
  store.projectCrons = store.projectCrons.filter((c) => c.cronId !== cronId);
  writeStore(store);
  return true;
};

// ============================================================
// Project Skills
// ============================================================

export const listProjectSkills = (projectId: string) => {
  const store = readStore();
  return store.projectSkills.filter((s) => s.projectId === projectId);
};

export const setProjectSkill = (projectId: string, skillName: string, enabled: boolean) => {
  const store = readStore();
  const existing = store.projectSkills.find((s) => s.projectId === projectId && s.skillName === skillName);
  if (existing) {
    existing.enabled = enabled;
    writeStore(store);
    return existing;
  }
  const skill: ProjectSkill = { projectId, skillName, enabled };
  store.projectSkills.push(skill);
  writeStore(store);
  return skill;
};

// ============================================================
// OpenClaw Analyzer (local filesystem)
// ============================================================

export const analyzeOpenClawInstallation = (basePath: string): OpenClawAnalysisResult => {
  const agents: OpenClawAnalysisResult["agents"] = [];
  const skills: OpenClawAnalysisResult["skills"] = [];
  const workspaces: OpenClawAnalysisResult["workspaces"] = [];
  const crons: ProjectCron[] = [];

  try {
    // Read openclaw.json
    const configPath = path.join(basePath, ".openclaw", "openclaw.json");
    if (fs.existsSync(configPath)) {
      const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const agentsSection = raw?.agents;
      if (agentsSection && typeof agentsSection === "object") {
        for (const [agentId, agentConfig] of Object.entries(agentsSection)) {
          if (!isRecord(agentConfig)) continue;
          const config = agentConfig as Record<string, unknown>;
          const workspacePath = asString(config.workspace);
          const model = config.model as string | undefined;
          agents.push({
            agentId,
            name: agentId.replace(/_/g, " ").replace(/workspace-/g, ""),
            model,
            workspacePath: workspacePath || undefined,
            memoryEnabled: true,
            cronsCount: 0,
          });

          // Check for workspace files
          if (workspacePath && fs.existsSync(workspacePath)) {
            workspaces.push({
              agentId,
              path: workspacePath,
              hasAgentsMd: fs.existsSync(path.join(workspacePath, "AGENTS.md")),
              hasSoulMd: fs.existsSync(path.join(workspacePath, "SOUL.md")),
              hasMemoryDir: fs.existsSync(path.join(workspacePath, "memory")),
            });
          }
        }
      }
    }

    // Read skills
    const skillsPath = path.join(basePath, ".openclaw", "skills");
    if (fs.existsSync(skillsPath)) {
      const skillEntries = fs.readdirSync(skillsPath);
      for (const skillName of skillEntries) {
        const skillDir = path.join(skillsPath, skillName);
        if (fs.statSync(skillDir).isDirectory()) {
          skills.push({
            name: skillName,
            path: skillDir,
          });
        }
      }
    }

    // Read crons
    const cronsPath = path.join(basePath, ".openclaw", "crons");
    if (fs.existsSync(cronsPath)) {
      const cronFiles = fs.readdirSync(cronsPath).filter((f) => f.endsWith(".json"));
      for (const cronFile of cronFiles) {
        try {
          const cronData = JSON.parse(fs.readFileSync(path.join(cronsPath, cronFile), "utf8"));
          if (isRecord(cronData)) {
            crons.push({
              projectId: "",
              cronId: asString(cronData.id || cronFile.replace(".json", "")),
              cronExpression: asString(cronData.schedule || cronData.expression || "* * * * *"),
              agentId: asString(cronData.agentId || cronData.agent || "main"),
              command: asString(cronData.command || cronData.action || ""),
              enabled: asBoolean(cronData.enabled, true),
              lastRun: asString(cronData.lastRun).trim() || undefined,
              lastError: asString(cronData.lastError).trim() || undefined,
            });
          }
        } catch {
          // skip malformed cron files
        }
      }
    }
  } catch {
    // Return empty result on error
  }

  return {
    agents,
    skills,
    workspaces,
    crons,
    totalAgents: agents.length,
    totalSkills: skills.length,
    totalCrons: crons.length,
    analyzedAt: new Date().toISOString(),
    sourcePath: basePath,
  };
};

// ============================================================
// Full Project with Relations
// ============================================================

export type FullProject = {
  project: Project;
  agents: ProjectAgent[];
  repos: ProjectRepo[];
  crons: ProjectCron[];
  skills: ProjectSkill[];
};

export const getFullProject = (projectId: string): FullProject | null => {
  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return null;
  return {
    project,
    agents: store.projectAgents.filter((a) => a.projectId === projectId),
    repos: store.projectRepos.filter((r) => r.projectId === projectId),
    crons: store.projectCrons.filter((c) => c.projectId === projectId),
    skills: store.projectSkills.filter((s) => s.projectId === projectId),
  };
};

export const listFullProjects = (): FullProject[] => {
  const store = readStore();
  return store.projects
    .filter((p) => !p.archivedAt)
    .map((project) => ({
      project,
      agents: store.projectAgents.filter((a) => a.projectId === project.id),
      repos: store.projectRepos.filter((r) => r.projectId === project.id),
      crons: store.projectCrons.filter((c) => c.projectId === project.id),
      skills: store.projectSkills.filter((s) => s.projectId === project.id),
    }))
    .sort((a, b) => b.project.updatedAt.localeCompare(a.project.updatedAt));
};

// Helper
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
const asString = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const asBoolean = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : fallback;