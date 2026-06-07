import { NextResponse } from "next/server";
import { listProjects, createProject, listFullProjects } from "@/lib/projects/store";
import type { FullProject } from "@/lib/projects/store";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function GET() {
  try {
    const projects = listFullProjects() as FullProject[];
    return NextResponse.json({ projects });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load projects.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = asString(body.action);

    if (action === "createProject") {
      const id = asString(body.id) || `proj_${Date.now()}`;
      const name = asString(body.name);
      const description = asString(body.description);
      const color = asString(body.color) || "#00ffcc";
      const officeId = asString(body.officeId) || "default";

      if (!name) {
        return NextResponse.json({ error: "name is required." }, { status: 400 });
      }

      const project = createProject({ id, name, description, color, officeId });
      return NextResponse.json({ project });
    }

    if (action === "listProjects") {
      const projects = listFullProjects() as FullProject[];
      return NextResponse.json({ projects });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}