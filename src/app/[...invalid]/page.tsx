import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Office — escritorio-builderfy",
};

export async function generateStaticParams() {
  return [{ invalid: ["404"] }];
}

type PageProps = {
  params: Promise<{ invalid?: string[] }>;
};

export default async function InvalidRoutePage({ params }: PageProps) {
  // Only redirect non-API paths to the office. API paths that don't have a
  // matching route handler should fall through to Next.js' default 404
  // instead of being hijacked by the catch-all page.
  const { invalid } = await params;
  const path = Array.isArray(invalid) ? invalid.join("/") : "";
  if (path.startsWith("api/") || path === "api") {
    // Render a minimal not-found so Next.js returns a real 404 for unknown
    // API URLs without interfering with valid route handlers elsewhere.
    const { notFound } = await import("next/navigation");
    notFound();
  }
  redirect("/office");
}

