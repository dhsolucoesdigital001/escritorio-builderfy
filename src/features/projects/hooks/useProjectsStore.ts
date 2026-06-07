"use client";

import { create } from "zustand";
import type { Project, ProjectAgent, ProjectRepo, ProjectCron, ProjectSkill, OpenClawAnalysisResult } from "@/lib/projects/schema";

export type FullProjectData = {
  project: Project;
  agents: ProjectAgent[];
  repos: ProjectRepo[];
  crons: ProjectCron[];
  skills: ProjectSkill[];
};

type ProjectsState = {
  projects: FullProjectData[];
  loading: boolean;
  error: string | null;
  selectedProjectId: string | null;
  analysis: OpenClawAnalysisResult | null;
  analysisLoading: boolean;
  createModalOpen: boolean;
  createStep: number;

  // Actions
  loadProjects: () => Promise<void>;
  selectProject: (id: string | null) => void;
  createProject: (data: { name: string; description: string; color: string }) => Promise<void>;
  updateProject: (id: string, data: { name?: string; description?: string; color?: string }) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  assignAgent: (projectId: string, agentId: string, role: ProjectAgent["role"], skills?: string[]) => Promise<void>;
  removeAgent: (projectId: string, agentId: string) => Promise<void>;
  linkRepo: (projectId: string, repoUrl: string, branch?: string, autoDeploy?: boolean) => Promise<void>;
  unlinkRepo: (projectId: string, repoUrl: string) => Promise<void>;
  createCron: (projectId: string, data: { cronExpression: string; agentId: string; command: string }) => Promise<void>;
  updateCron: (cronId: string, data: { enabled?: boolean; cronExpression?: string; command?: string }) => Promise<void>;
  deleteCron: (cronId: string) => Promise<void>;
  analyzeOpenClaw: (path: string) => Promise<void>;
  setCreateModalOpen: (open: boolean) => void;
  setCreateStep: (step: number) => void;
};

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  selectedProjectId: null,
  analysis: null,
  analysisLoading: false,
  createModalOpen: false,
  createStep: 0,

  loadProjects: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/projects", { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ projects: data.projects || [], loading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load projects", loading: false });
    }
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  createProject: async (data) => {
    const id = `proj_${Date.now()}`;
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createProject", id, ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create project" });
    }
  },

  updateProject: async (id, data) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateProject", ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update project" });
    }
  },

  archiveProject: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archiveProject" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to archive project" });
    }
  },

  deleteProject: async (id) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      set({ selectedProjectId: get().selectedProjectId === id ? null : get().selectedProjectId });
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete project" });
    }
  },

  assignAgent: async (projectId, agentId, role, skills) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assignAgent", agentId, role, skills }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to assign agent" });
    }
  },

  removeAgent: async (projectId, agentId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeAgent", agentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to remove agent" });
    }
  },

  linkRepo: async (projectId, repoUrl, branch, autoDeploy) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "linkRepo", repoUrl, branch, autoDeploy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to link repo" });
    }
  },

  unlinkRepo: async (projectId, repoUrl) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlinkRepo", repoUrl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to unlink repo" });
    }
  },

  createCron: async (projectId, data) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/crons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createCron", cronId: `cron_${Date.now()}`, ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create cron" });
    }
  },

  updateCron: async (cronId, data) => {
    try {
      const res = await fetch(`/api/projects/${get().selectedProjectId}/crons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateCron", cronId, ...data }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to update cron" });
    }
  },

  deleteCron: async (cronId) => {
    try {
      const res = await fetch(`/api/projects/${get().selectedProjectId}/crons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteCron", cronId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await get().loadProjects();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete cron" });
    }
  },

  analyzeOpenClaw: async (path) => {
    set({ analysisLoading: true, error: null });
    try {
      const res = await fetch("/api/projects/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyzeLocal", path }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ analysis: data.analysis, analysisLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to analyze OpenClaw", analysisLoading: false });
    }
  },

  setCreateModalOpen: (open) => set({ createModalOpen: open, createStep: open ? 0 : get().createStep }),
  setCreateStep: (step) => set({ createStep: step }),
}));