import { NextResponse } from "next/server";
import { analyzeOpenClawInstallation } from "@/lib/projects/store";
import { normalizeOpenClawAnalysisResult } from "@/lib/projects/schema";

export const runtime = "nodejs";

const asString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = asString(body.action);

    if (action === "analyzeLocal") {
      const basePath = asString(body.path);
      if (!basePath) {
        return NextResponse.json({ error: "path is required." }, { status: 400 });
      }

      const result = analyzeOpenClawInstallation(basePath);
      const normalized = normalizeOpenClawAnalysisResult(result);
      return NextResponse.json({ analysis: normalized });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze OpenClaw.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Analyze the local OpenClaw installation
    const possiblePaths = [
      process.env.OPENCLAW_LOCAL_PATH || "",
      "C:\\Users\\Usuario\\Downloads\\escritorio-builderfy-extracted",
      "/root/.openclaw",
      process.env.HOME ? `${process.env.HOME}/.openclaw` : "",
    ].filter(Boolean);

    let lastError = "";
    for (const basePath of possiblePaths) {
      try {
        const result = analyzeOpenClawInstallation(basePath);
        if (result.totalAgents > 0 || result.totalSkills > 0) {
          const normalized = normalizeOpenClawAnalysisResult(result);
          return NextResponse.json({ analysis: normalized });
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }

    // Return empty analysis if no valid path found
    const emptyResult = normalizeOpenClawAnalysisResult(null);
    return NextResponse.json({
      analysis: emptyResult,
      note: "No OpenClaw installation found at expected paths.",
      lastError,
      searchedPaths: possiblePaths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze OpenClaw.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}