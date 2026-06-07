import { NextResponse } from "next/server";
import { getProject, updateProject, archiveProject, deleteProject, getFullProject, listProjectAgents, listProjectRepos, listProjectCrons, listProjectSkills } from "@/lib/projects/store";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const full = getFullProject(id);
    if (!full) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project: full.project, agents: full.agents, repos: full.repos, crons: full.crons, skills: full.skills });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = asString(body.action);

    if (action === "updateProject") {
      const updated = updateProject({
        id,
        name: asString(body.name) || undefined,
        description: asString(body.description) || undefined,
        color: asString(body.color) || undefined,
        officeId: asString(body.officeId) || undefined,
      });
      if (!updated) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      return NextResponse.json({ project: updated });
    }

    if (action === "archiveProject") {
      const archived = archiveProject(id);
      if (!archived) return NextResponse.json({ error: "Project not found." }, { status: 404 });
      return NextResponse.json({ project: archived });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}