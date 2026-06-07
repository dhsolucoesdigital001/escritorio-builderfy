"use client";

import { useEffect, useState } from "react";
import { Folder, Plus, ChevronRight, Trash2, Archive, Users, GitBranch, Clock, Palette } from "lucide-react";
import { useProjectsStore } from "@/features/projects/hooks/useProjectsStore";
import { ProjectCreateModal } from "@/features/projects/components/ProjectCreateModal";

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

export function ProjectsPanel() {
  const {
    projects,
    loading,
    error,
    selectedProjectId,
    analysis,
    analysisLoading,
    createModalOpen,
    loadProjects,
    selectProject,
    archiveProject,
    deleteProject,
    analyzeOpenClaw,
    setCreateModalOpen,
  } = useProjectsStore();

  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find((p) => p.project.id === selectedProjectId);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-cyan-500/15 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[10px] font-semibold tracking-[0.32em] text-cyan-300/80">
              PROJECTS
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-white/45">
              {projects.length} projeto{projects.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200 transition-colors hover:border-cyan-400/40 hover:text-cyan-100"
          >
            <Plus size={12} className="inline mr-1" />
            Novo
          </button>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="px-4 py-2 font-mono text-[11px] text-red-400">{error}</div>
      ) : null}

      {/* Analysis toggle */}
      <div className="border-b border-cyan-500/10 px-4 py-2">
        <button
          type="button"
          onClick={() => {
            if (!analysis && !analysisLoading) {
              void analyzeOpenClaw("");
            }
            setShowAnalysis(!showAnalysis);
          }}
          className="flex w-full items-center gap-2 rounded bg-cyan-500/5 px-2 py-1.5 font-mono text-[11px] text-cyan-300/70 hover:bg-cyan-500/10 hover:text-cyan-200"
        >
          <span className={`inline-block h-2 w-2 rounded-full ${analysisLoading ? "bg-yellow-400 animate-pulse" : analysis ? "bg-green-400" : "bg-white/20"}`} />
          OpenClaw Analyzer
          {analysis && !analysisLoading ? (
            <span className="ml-auto text-[10px] text-white/40">
              {analysis.totalAgents} agents | {analysis.totalSkills} skills | {analysis.totalCrons} crons
            </span>
          ) : null}
        </button>
      </div>

      {/* Analysis results */}
      {showAnalysis && analysis ? (
        <div className="border-b border-cyan-500/10 max-h-48 overflow-y-auto px-4 py-2">
          <div className="space-y-3">
            <div>
              <div className="font-mono text-[10px] text-cyan-400/60 uppercase tracking-wider mb-1">Agentes ({analysis.agents.length})</div>
              {analysis.agents.slice(0, 10).map((agent) => (
                <div key={agent.agentId} className="flex items-center gap-2 py-0.5 font-mono text-[11px] text-white/60">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: stringToColor(agent.agentId) }} />
                  <span>{agent.agentId}</span>
                  {agent.model ? <span className="text-cyan-400/40 ml-2">{agent.model}</span> : null}
                </div>
              ))}
              {analysis.agents.length > 10 && (
                <div className="font-mono text-[10px] text-white/30 py-0.5">... +{analysis.agents.length - 10} mais</div>
              )}
            </div>
            <div>
              <div className="font-mono text-[10px] text-fuchsia-400/60 uppercase tracking-wider mb-1">Skills ({analysis.skills.length})</div>
              <div className="flex flex-wrap gap-1">
                {analysis.skills.slice(0, 15).map((skill) => (
                  <span key={skill.name} className="rounded bg-fuchsia-500/10 px-1.5 py-0.5 font-mono text-[10px] text-fuchsia-300/70">
                    {skill.name}
                  </span>
                ))}
                {analysis.skills.length > 15 && (
                  <span className="font-mono text-[10px] text-white/30">+{analysis.skills.length - 15}</span>
                )}
              </div>
            </div>
            {analysis.crons.length > 0 && (
              <div>
                <div className="font-mono text-[10px] text-amber-400/60 uppercase tracking-wider mb-1">Crons ({analysis.crons.length})</div>
                {analysis.crons.slice(0, 5).map((cron) => (
                  <div key={cron.cronId} className="font-mono text-[11px] text-white/50 py-0.5">
                    <span className="text-amber-300/50">{cron.cronExpression}</span> → {cron.agentId}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Loading */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="font-mono text-[11px] text-white/30 animate-pulse">carregando...</div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
              <Folder size={32} className="text-white/20" />
              <div className="font-mono text-[11px] text-white/40 text-center">
                Nenhum projeto ainda.<br />Clique em &quot;Novo&quot; para criar.
              </div>
            </div>
          ) : (
            projects.map((full) => {
              const isSelected = full.project.id === selectedProjectId;
              return (
                <div
                  key={full.project.id}
                  onClick={() => selectProject(isSelected ? null : full.project.id)}
                  className={`cursor-pointer border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/5 ${
                    isSelected ? "bg-cyan-500/10 border-l-2 border-l-cyan-400" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-sm shrink-0"
                      style={{ backgroundColor: full.project.color }}
                    />
                    <span className="font-mono text-[12px] font-medium text-white/90 truncate flex-1">
                      {full.project.name}
                    </span>
                    <ChevronRight
                      size={12}
                      className={`text-white/30 transition-transform ${isSelected ? "rotate-90" : ""}`}
                    />
                  </div>
                  {full.project.description ? (
                    <div className="mt-1 font-mono text-[10px] text-white/40 line-clamp-1 pl-5">
                      {full.project.description}
                    </div>
                  ) : null}
                  {isSelected && (
                    <div className="mt-3 pl-5 space-y-1.5">
                      {/* Stats */}
                      <div className="flex flex-wrap gap-3 font-mono text-[10px] text-white/40">
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {full.agents.length} agentes
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch size={10} /> {full.repos.length} repos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} /> {full.crons.length} crons
                        </span>
                      </div>
                      {/* Agents list */}
                      {full.agents.length > 0 && (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider">Agentes</div>
                          {full.agents.map((agent) => (
                            <div key={agent.agentId} className="flex items-center gap-1.5 font-mono text-[11px] text-white/60">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                agent.role === "leader" ? "bg-cyan-400" : agent.role === "member" ? "bg-green-400" : "bg-white/30"
                              }`} />
                              <span className="truncate">{agent.agentId}</span>
                              <span className="text-[9px] text-white/30 ml-auto">{agent.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Repos list */}
                      {full.repos.length > 0 && (
                        <div className="space-y-0.5">
                          <div className="font-mono text-[9px] text-white/30 uppercase tracking-wider">Repos</div>
                          {full.repos.map((repo) => (
                            <div key={repo.repoUrl} className="font-mono text-[10px] text-white/50 truncate">
                              {repo.repoUrl.replace("https://github.com/", "")} <span className="text-cyan-400/50">({repo.branch})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void archiveProject(full.project.id); }}
                          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/40 hover:border-amber-500/30 hover:text-amber-300 transition-colors"
                        >
                          <Archive size={9} className="inline mr-1" /> Arquivar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void deleteProject(full.project.id); }}
                          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/40 hover:border-red-500/30 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={9} className="inline mr-1" /> Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && <ProjectCreateModal />}
    </div>
  );
}