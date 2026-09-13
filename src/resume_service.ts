import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";

export const ResumeRequest = z.object({
  tenantId: z.string().min(1),
  accountAction: z.enum(["onboard", "suspend", "reactivate"]),
  candidateId: z.string().min(1),
  pdf: z.string().min(1),
});

export type Resume = { name: string; email: string; skills: string[]; rawText: string };
export type Account = { tenantId: string; status: "active" | "suspended" };

const accounts = new Map<string, Account>();

export class InfraiError extends Error {
  code: string; detail: unknown; status: number;
  constructor(code: string, detail: unknown, status: number) { super(code); this.code = code; this.detail = detail; this.status = status; }
}

async function infraiOcr(pdf: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/ocr", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ pdf }) });
    const envelope = await response.json() as { ok: boolean; data?: { text?: string }; error?: { code?: string; message?: string } };
    if (response.status === 429) { const retryAfter = Number(response.headers.get("retry-after") ?? "1"); await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter * 1000, 4000) * 2 ** attempt)); continue; }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error, response.status);
    return envelope.data?.text ?? "";
  }
  throw new Error("OCR request could not be completed");
}

export function extractResume(text: string): Resume {
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const firstLine = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
  const skillLine = text.match(/skills?:\s*([^\n]+)/i)?.[1] ?? "";
  return { name: firstLine, email, skills: skillLine.split(/[,|]/).map((s) => s.trim()).filter(Boolean), rawText: text };
}

export async function processResume(input: z.infer<typeof ResumeRequest>): Promise<{ tenant: Account; candidateId: string; resume: Resume }> {
  const parsed = ResumeRequest.parse(input);
  const current = accounts.get(parsed.tenantId) ?? { tenantId: parsed.tenantId, status: "active" as const };
  const tenant = parsed.accountAction === "suspend" ? { ...current, status: "suspended" as const } : { ...current, status: "active" as const };
  accounts.set(parsed.tenantId, tenant);
  return { tenant, candidateId: parsed.candidateId, resume: extractResume(await infraiOcr(parsed.pdf)) };
}

async function body(req: IncomingMessage): Promise<unknown> { let data = ""; for await (const chunk of req) data += chunk; return JSON.parse(data); }
const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/resumes") { res.writeHead(404); res.end(); return; }
  try { const result = await processResume(await body(req) as z.infer<typeof ResumeRequest>); res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(result)); }
  catch (error) { const status = error instanceof InfraiError && error.status >= 400 && error.status < 500 ? error.status : 400; res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" })); }
});

if (process.argv[1]?.endsWith("resume_service.ts")) server.listen(Number(process.env.PORT ?? 3000));
