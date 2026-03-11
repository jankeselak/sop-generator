import { getProcessMap, saveProcessMap } from "@/lib/store";
import { ProcessMap } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const processMap = await getProcessMap(id);

  if (!processMap) {
    return Response.json({ error: "Process map not found" }, { status: 404 });
  }

  return Response.json(processMap);
}

export async function PUT(request: Request) {
  const body: ProcessMap = await request.json();

  if (!body.id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  await saveProcessMap(body);
  return Response.json({ success: true });
}
