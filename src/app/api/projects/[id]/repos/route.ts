import { NextResponse } from "next/server";
import { listProjectRepos, linkRepo, unlinkRepo } from "@/lib/projects/store";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const asBoolean = (value: unknown) => typeof value === "boolean" ? value : false;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const repos = listProjectRepos(id);
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load repos.";
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

    if (action === "linkRepo") {
      const repoUrl = asString(body.repoUrl);
      if (!repoUrl) return NextResponse.json({ error: "repoUrl is required." }, { status: 400 });

      const repo = linkRepo({
        projectId,
        repoUrl,
        branch: asString(body.branch) || "main",
        autoDeploy: asBoolean(body.autoDeploy, false),
      });
      return NextResponse.json({ repo });
    }

    if (action === "unlinkRepo") {
      const repoUrl = asString(body.repoUrl);
      if (!repoUrl) return NextResponse.json({ error: "repoUrl is required." }, { status: 400 });
      unlinkRepo(projectId, repoUrl);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process repo request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}