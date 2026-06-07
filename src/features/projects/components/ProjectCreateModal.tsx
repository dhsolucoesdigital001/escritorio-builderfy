"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useProjectsStore } from "@/features/projects/hooks/useProjectsStore";

const COLORS = [
  "#00ffcc", "#00bfff", "#7b68ee", "#ff6b6b",
  "#ffd93d", "#6bcb77", "#ff8c42", "#c77dff",
  "#f72585", "#4cc9f0", "#fca311", "#06d6a0",
];

const STEPS = [
  { label: "Info", desc: "Nome e descricao" },
  { label: "Cor", desc: "Identidade visual" },
  { label: "Revisar", desc: "Confirmar criacao" },
];

export function ProjectCreateModal() {
  const { createProject, setCreateModalOpen, setCreateStep, createStep } = useProjectsStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Nome e obrigatorio.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createProject({ name: name.trim(), description: description.trim(), color });
      setCreateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[min(90vw,480px)] rounded-lg border border-cyan-500/20 bg-[#0a0f14] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/15 px-5 py-4">
          <div>
            <div className="font-mono text-[12px] font-semibold tracking-wider text-cyan-200">
              Novo Projeto
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-white/40">
              Passo {createStep + 1} de {STEPS.length} — {STEPS[createStep].desc}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(false)}
            className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white/80 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-cyan-500/10 px-5 py-2">
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-1.5">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                  i < createStep
                    ? "bg-cyan-500/30 text-cyan-300"
                    : i === createStep
                      ? "bg-cyan-500 text-cyan-100"
                      : "border border-white/20 text-white/30"
                }`}
              >
                {i < createStep ? <Check size={10} /> : i + 1}
              </div>
              <span className={`font-mono text-[10px] ${i === createStep ? "text-cyan-300" : "text-white/30"}`}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-white/10" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-5">
          {createStep === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-white/50 mb-1.5">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Arruda Imobi, Builderfy, TechAtende"
                  className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-[13px] text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-white/50 mb-1.5">
                  Descricao
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva brevemente o projeto..."
                  rows={3}
                  className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 font-mono text-[13px] text-white placeholder:text-white/20 focus:border-cyan-500/50 focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {createStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-white/50 mb-3">
                  Cor do Projeto
                </label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        color === c ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-white/50 mb-2">
                  Preview
                </label>
                <div className="flex items-center gap-3 rounded border border-white/10 bg-white/5 px-4 py-3">
                  <span
                    className="inline-block h-5 w-5 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-mono text-[13px] text-white/80">
                    {name || "Nome do Projeto"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4">
              <div className="rounded border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="font-mono text-[14px] font-semibold text-white">{name || "—"}</span>
                </div>
                {description && (
                  <div className="font-mono text-[12px] text-white/50">{description}</div>
                )}
                <div className="font-mono text-[11px] text-cyan-400/50">
                  Cor: <span style={{ color }}>{color}</span>
                </div>
              </div>
              {error && (
                <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 font-mono text-[11px] text-red-400">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-cyan-500/15 px-5 py-4">
          <button
            type="button"
            onClick={() => setCreateStep(createStep > 0 ? createStep - 1 : 0)}
            className={`rounded border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] text-white/50 transition-colors hover:bg-white/10 hover:text-white/80 ${createStep === 0 ? "invisible" : ""}`}
          >
            <ChevronLeft size={12} className="inline mr-1" /> Voltar
          </button>

          {createStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setCreateStep(createStep + 1)}
              disabled={createStep === 0 && !name.trim()}
              className="rounded border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 font-mono text-[11px] text-cyan-200 transition-colors hover:bg-cyan-500/20 hover:text-cyan-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continuar <ChevronRight size={12} className="inline ml-1" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { void handleCreate(); }}
              disabled={creating || !name.trim()}
              className="rounded border border-cyan-500/40 bg-cyan-500/20 px-4 py-1.5 font-mono text-[11px] text-cyan-100 transition-colors hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {creating ? "Criando..." : "Criar Projeto"} <Check size={12} className="inline ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}