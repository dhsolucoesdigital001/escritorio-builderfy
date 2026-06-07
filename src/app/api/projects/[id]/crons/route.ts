import { NextResponse } from "next/server";
import { listProjectCrons, createProjectCron, updateProjectCron, deleteProjectCron } from "@/lib/projects/store";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const crons = listProjectCrons(id);
    return NextResponse.json({ crons });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load crons.";
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

    if (action === "createCron") {
      const cronId = asString(body.cronId) || `cron_${Date.now()}`;
      const cronExpression = asString(body.cronExpression);
      const agentId = asString(body.agentId);
      const command = asString(body.command);

      if (!cronExpression || !agentId || !command) {
        return NextResponse.json({ error: "cronExpression, agentId, and command are required." }, { status: 400 });
      }

      const cron = createProjectCron({ projectId, cronId, cronExpression, agentId, command });
      return NextResponse.json({ cron });
    }

    if (action === "updateCron") {
      const cronId = asString(body.cronId);
      if (!cronId) return NextResponse.json({ error: "cronId is required." }, { status: 400 });

      const cron = updateProjectCron({
        cronId,
        cronExpression: asString(body.cronExpression) || undefined,
        agentId: asString(body.agentId) || undefined,
        command: asString(body.command) || undefined,
        enabled: body.enabled != null ? (typeof body.enabled === "boolean" ? body.enabled : undefined) : undefined,
        lastRun: asString(body.lastRun) || undefined,
        lastError: asString(body.lastError) || undefined,
      });
      if (!cron) return NextResponse.json({ error: "Cron not found." }, { status: 404 });
      return NextResponse.json({ cron });
    }

    if (action === "deleteCron") {
      const cronId = asString(body.cronId);
      if (!cronId) return NextResponse.json({ error: "cronId is required." }, { status: 400 });
      deleteProjectCron(cronId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process cron request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}