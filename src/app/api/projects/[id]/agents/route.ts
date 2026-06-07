import { NextResponse } from "next/server";
import { listProjectAgents, assignAgent, removeAgent } from "@/lib/projects/store";
import type { ProjectAgent } from "@/lib/projects/schema";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asBoolean = (value: unknown) => typeof value === "boolean" ? value : false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agents = listProjectAgents(id);
    return NextResponse.json({ agents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load agents.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = asString(body.action);

    if (action === "assignAgent") {
      const agentId = asString(body.agentId);
      const role = asString(body.role) as ProjectAgent["role"];
      const skills = Array.isArray(body.skills) ? body.skills.filter((s): s is string => typeof s === "string") : [];

      if (!agentId) return NextResponse.json({ error: "agentId is required." }, { status: 400 });
      if (!["leader", "member", "viewer"].includes(role)) return NextResponse.json({ error: "Invalid role." }, { status: 400 });

      const agent = assignAgent(projectId, agentId, role, skills);
      return NextResponse.json({ agent });
    }

    if (action === "removeAgent") {
      const agentId = asString(body.agentId);
      if (!agentId) return NextResponse.json({ error: "agentId is required." }, { status: 400 });
      removeAgent(projectId, agentId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process agent request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}