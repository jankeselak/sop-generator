import { ProcessStep } from "./types";

/**
 * Extract completed step objects from a partial JSON stream.
 * Tracks balanced braces to find complete {...} objects within the "steps" array.
 */
export function extractStepsFromPartialJSON(
  partial: string
): ProcessStep[] {
  const steps: ProcessStep[] = [];

  // Find the steps array start
  const stepsKey = '"steps"';
  const stepsIdx = partial.indexOf(stepsKey);
  if (stepsIdx === -1) return steps;

  const arrayStart = partial.indexOf("[", stepsIdx);
  if (arrayStart === -1) return steps;

  // Walk through and find complete objects
  let depth = 0;
  let inString = false;
  let escaped = false;
  let objectStart = -1;

  for (let i = arrayStart + 1; i < partial.length; i++) {
    const char = partial[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      if (depth === 0) objectStart = i;
      depth++;
    }

    if (char === "}") {
      depth--;
      if (depth === 0 && objectStart !== -1) {
        try {
          const stepStr = partial.slice(objectStart, i + 1);
          const step = JSON.parse(stepStr) as ProcessStep;
          if (step.title && step.role) {
            steps.push(step);
          }
        } catch {
          // Incomplete or invalid — skip
        }
        objectStart = -1;
      }
    }

    // Stop if we hit the array end
    if (char === "]" && depth === 0) break;
  }

  return steps;
}

/**
 * Extract the title from partial JSON if available.
 */
export function extractTitleFromPartialJSON(partial: string): string | null {
  const match = partial.match(/"title"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

/**
 * Extract category from partial JSON if available.
 */
export function extractCategoryFromPartialJSON(
  partial: string
): string | null {
  const match = partial.match(/"category"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}
