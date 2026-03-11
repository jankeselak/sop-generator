import Anthropic from "@anthropic-ai/sdk";
import { REFINE_SYSTEM_PROMPT, REFINE_USER_PROMPT } from "@/lib/prompts";
import { saveProcessMap } from "@/lib/store";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { processMap, feedback } = await request.json();

  if (!processMap || !feedback) {
    return Response.json(
      { error: "Missing processMap or feedback" },
      { status: 400 }
    );
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: REFINE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: REFINE_USER_PROMPT(
            JSON.stringify(processMap),
            feedback
          ),
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const updatedMap = JSON.parse(text);

    // Preserve the original ID and creation date
    updatedMap.id = processMap.id;
    updatedMap.createdAt = processMap.createdAt;

    // Ensure step IDs and orders
    updatedMap.steps = updatedMap.steps.map(
      (step: Record<string, unknown>, index: number) => ({
        ...step,
        id: step.id || `step-${index + 1}`,
        order: index + 1,
      })
    );

    await saveProcessMap(updatedMap);
    return Response.json(updatedMap);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Refinement failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
