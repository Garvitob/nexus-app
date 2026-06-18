import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCorsairMcpTool } from "@/lib/nexus-mcp";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const SYSTEM_INSTRUCTIONS = `You are Nexus AI — an autonomous workspace agent with real access to the user's connected tools through Corsair.

You can ACTUALLY perform real actions across Gmail, Google Calendar, GitHub, Jira, and Notion — sending emails, creating calendar events, creating issues, searching, and more.

HOW YOU WORK:
1. Use list_operations to discover what operations are available for the integration you need
2. Use get_schema to understand the exact parameters an operation requires
3. Use run_script to execute the operation with correct parameters

CRITICAL RULES:
- ALWAYS discover the correct operation path via list_operations — never assume a path
- ALWAYS check get_schema before calling an operation so you use the exact parameter names
- When sending emails, the user's request is authorization to send — execute it
- When you reference resources (channels, repos, issues), use their ID not their name
- Be concise and action-oriented. Confirm what you did after doing it.
- After using tools, ALWAYS write a final text summary of what you found or did — never end on a tool call
- If a tool needs auth the user hasn't connected, tell them clearly which integration to connect
- Use markdown formatting: **bold**, bullet lists, numbered steps

CONTEXT:
- Current date/time: ${new Date().toISOString()}
- You operate on behalf of the signed-in user via their isolated Corsair tenant`;

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;

  let body: {
    message: string;
    sessionId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const { message, sessionId } = body;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "No message" }), {
      status: 400,
    });
  }

  let session = sessionId
    ? await db.chatSession
        .findFirst({ where: { id: sessionId, userId: user.id } })
        .catch(() => null)
    : null;

  if (!session) {
    session = await db.chatSession.create({
      data: {
        userId: user.id,
        title: message.slice(0, 60),
      },
    });
  }

  const history = await db.chatMessage
    .findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    })
    .catch(() => []);

  await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "user",
      content: message,
    },
  });

  const encoder = new TextEncoder();
  const sessionIdFinal = session.id;

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      send({ type: "session", sessionId: sessionIdFinal });

      try {
        const historyText = history
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join("\n");

        const input = historyText
          ? `${historyText}\n\nUSER: ${message}`
          : message;

        // Runs one full MCP attempt with a FRESH key each time.
        async function runOnce(): Promise<string> {
          const mcpTool = await getCorsairMcpTool(tenantId);

          const response = await openai.responses.create({
            model: "gpt-4.1",
            instructions: SYSTEM_INSTRUCTIONS,
            tools: [
              {
                type: "mcp",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ...(mcpTool as any),
                require_approval: "never",
              },
            ],
            input,
          });

          // DEBUG — log every output item so we see exactly what happened
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const item of (response.output as any[]) ?? []) {
            console.log(
              "[nexus item]",
              item.type,
              item.type === "mcp_call"
                ? `name=${item.name} error=${JSON.stringify(
                    item.error
                  )} output=${JSON.stringify(item.output)?.slice(0, 600)}`
                : item.type === "mcp_list_tools"
                ? `server=${item.server_label} tools=${
                    item.tools?.length ?? 0
                  }`
                : ""
            );
          }

          // Extract final text — Responses API with MCP puts the final
          // message at the END of the output array, after mcp_list_tools
          // and mcp_call items.
          let text = response.output_text ?? "";
          if (!text && Array.isArray(response.output)) {
            const parts: string[] = [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const item of response.output as any[]) {
              if (item.type === "message" && Array.isArray(item.content)) {
                for (const c of item.content) {
                  if (
                    (c.type === "output_text" || c.type === "text") &&
                    c.text
                  ) {
                    parts.push(c.text);
                  }
                }
              }
            }
            text = parts.join("\n");
          }
          return text;
        }

        // 424 Failed Dependency = OpenAI couldn't reach the MCP server
        // (transient / stale key). Retry once with a fresh key.
        let finalText = "";
        try {
          finalText = await runOnce();
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (errMsg.includes("424") || errMsg.includes("Failed Dependency")) {
            await new Promise((r) => setTimeout(r, 1500));
            finalText = await runOnce();
          } else {
            throw e;
          }
        }

        if (!finalText) {
          finalText =
            "I completed the request but couldn't format a response.";
        }

        const words = finalText.split(" ");
        let acc = "";
        for (const word of words) {
          acc += (acc ? " " : "") + word;
          send({ type: "chunk", text: acc });
          await new Promise((r) => setTimeout(r, 8));
        }

        await db.chatMessage
          .create({
            data: {
              sessionId: sessionIdFinal,
              role: "assistant",
              content: finalText,
            },
          })
          .catch(() => null);

        await db.chatSession
          .update({
            where: { id: sessionIdFinal },
            data: { updatedAt: new Date() },
          })
          .catch(() => null);

        send({ type: "done", reply: finalText, sessionId: sessionIdFinal });
      } catch (err) {
        console.error("[nexus/chat]", err);
        const msg = err instanceof Error ? err.message : "Nexus agent failed";
        send({ type: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}