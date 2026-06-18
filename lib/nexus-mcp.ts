import { createClient, getOpenAiMcpConfig } from "@corsair-dev/app";

const corsairClient = createClient({ apiKey: process.env.CORSAIR_DEV_KEY! });

export async function getCorsairMcpTool(tenantId: string) {
  console.log("[nexus] minting MCP key for tenant:", tenantId);

  const key = await corsairClient
    .instance(process.env.CORSAIR_INSTANCE_ID!)
    .tenant(tenantId)
    .mcpKeys.create("nexus-agent");

  return getOpenAiMcpConfig({
    url: key.mcpHttpUrl,
    apiKey: key.secret,
  });
}