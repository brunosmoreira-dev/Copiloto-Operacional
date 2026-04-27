import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const currentFilePath = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(currentFilePath), "..");

for (const envFileName of [".env.local", ".env"]) {
  const envPath = resolve(appRoot, envFileName);

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: envFileName === ".env.local" });
  }
}

const intakeApiKey = process.env.INTAKE_API_KEY;

if (!intakeApiKey) {
  throw new Error("Missing INTAKE_API_KEY in C:\\Pessoal\\Projetos\\Copiloto operacional\\.env");
}

const response = await fetch("http://localhost:3001/intake/forms", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": intakeApiKey
  },
  body: JSON.stringify({
    source: "google_forms",
    source_submission_id: `manual-test-${Date.now()}`,
    submitted_at: new Date().toISOString(),
    request: {
      request_type: "financial_request",
      requester_name: "Bruno Moreira",
      requester_email: "bruno@example.com",
      company_name: "ACME",
      title: "Reemissao de boleto",
      description: "Cliente pediu segunda via do boleto do contrato de abril.",
      priority: "high",
      requested_due_date: "2026-05-02",
      attachment_link: ""
    }
  })
});

const body = await response.text();

console.log(`Status: ${response.status}`);
console.log(body);
