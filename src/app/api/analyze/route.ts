import Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_SYSTEM_PROMPT, ANALYSIS_USER_PROMPT } from "@/lib/prompts";
import { v4 as uuidv4 } from "uuid";
import { saveProcessMap } from "@/lib/store";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { description } = await request.json();

  if (!description || typeof description !== "string" || description.trim().length < 20) {
    return Response.json(
      { error: "Please provide a more detailed workflow description (at least 20 characters)." },
      { status: 400 }
    );
  }

  const id = uuidv4();

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: ANALYSIS_USER_PROMPT(description.trim()),
      },
    ],
  });

  // Collect the full response for storage while also streaming
  let fullResponse = "";

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const response = await stream;

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`)
            );
          }
        }

        // Parse and save the complete response
        try {
          const processMap = JSON.parse(fullResponse);
          processMap.id = id;
          processMap.createdAt = new Date().toISOString();

          // Add IDs to steps if not present
          processMap.steps = processMap.steps.map(
            (step: Record<string, unknown>, index: number) => ({
              ...step,
              id: step.id || `step-${index + 1}`,
              order: step.order || index + 1,
            })
          );

          saveProcessMap(processMap);

          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "complete", id, processMap })}\n\n`
            )
          );
        } catch {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ type: "error", message: "Failed to parse analysis. Please try again." })}\n\n`
            )
          );
        }

        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Analysis failed";
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
