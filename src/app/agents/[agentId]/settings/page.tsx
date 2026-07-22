import { redirect } from "next/navigation";

export async function generateStaticParams() {
  return [{ agentId: "default" }];
}

export default async function AgentSettingsPage({
  params,
}: {
  params: Promise<{ agentId?: string }> | { agentId?: string };
}) {
  await params;
  redirect("/office");
}
