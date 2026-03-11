import { Resend } from "resend";
import { getProcessMap } from "@/lib/store";

export async function POST(request: Request) {
  const { processMapId, stakeholders, senderName } = await request.json();

  if (!process.env.RESEND_API_KEY) {
    return Response.json(
      { error: "Email sending is not configured. Set RESEND_API_KEY to enable invitations." },
      { status: 503 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  if (!processMapId || !stakeholders || !Array.isArray(stakeholders)) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const processMap = getProcessMap(processMapId);
  if (!processMap) {
    return Response.json({ error: "Process map not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://ops-mapper.vercel.app";
  const results = [];

  for (const stakeholder of stakeholders) {
    const { name, email, role } = stakeholder;

    // Find steps relevant to this stakeholder's role
    const relevantSteps = processMap.steps.filter(
      (step) => step.role.toLowerCase() === role.toLowerCase()
    );

    const stepsHtml = relevantSteps
      .map(
        (step) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${step.order}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;"><strong>${step.title}</strong><br/><span style="color: #64748b; font-size: 14px;">${step.description}</span></td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${step.system}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${step.estimatedMinutes} min</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
            <span style="background: ${step.automationPotential === "full" ? "#dcfce7" : step.automationPotential === "partial" ? "#fef3c7" : "#fee2e2"}; padding: 2px 8px; border-radius: 4px; font-size: 13px;">
              ${step.automationPotential === "full" ? "Automatable" : step.automationPotential === "partial" ? "Partially" : "Human Required"}
            </span>
          </td>
        </tr>`
      )
      .join("");

    const totalMinutes = relevantSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
    const resultUrl = `${baseUrl}/result/${processMapId}?role=${encodeURIComponent(role)}`;

    try {
      await resend.emails.send({
        from: "SOP Creator by Duvo <onboarding@resend.dev>",
        to: email,
        subject: `${senderName || "Your colleague"} documented "${processMap.title}" — your input needed`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 640px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); padding: 32px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">SOP Creator</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">by Duvo.ai</p>
            </div>
            <div style="background: white; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hi ${name},</p>
              <p style="font-size: 16px; color: #334155;">
                ${senderName || "Your colleague"} has documented the <strong>"${processMap.title}"</strong> process and identified your role as <strong>${role}</strong>.
              </p>
              <p style="font-size: 16px; color: #334155;">
                Your part involves <strong>${relevantSteps.length} steps</strong> taking approximately <strong>${totalMinutes} minutes per cycle</strong>:
              </p>

              <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">#</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Step</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">System</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Time</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Automation</th>
                  </tr>
                </thead>
                <tbody>
                  ${stepsHtml}
                </tbody>
              </table>

              <p style="font-size: 16px; color: #334155;">
                <strong>Is this accurate?</strong> Your input will help refine the SOP and build the case for automation.
              </p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="${resultUrl}" style="background: #2563EB; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  Review & Refine Your Steps
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />

              <p style="font-size: 14px; color: #94a3b8; text-align: center;">
                Powered by <a href="https://duvo.ai" style="color: #2563EB;">Duvo.ai</a> — Automate your operational workflows
              </p>
            </div>
          </div>
        `,
      });
      results.push({ email, status: "sent" });
    } catch (error) {
      results.push({
        email,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return Response.json({ results });
}
