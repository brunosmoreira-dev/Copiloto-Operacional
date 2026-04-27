import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import { config as loadEnv } from "dotenv";
import {
  createHealthStatus,
  formFieldSpec,
  googleFormsIntakeSchema,
  type GoogleFormsIntake,
  type RequestType,
  toSlug
} from "./shared.js";
import { createJsonStore } from "./store.js";

type IntakeStatus =
  | "received"
  | "validated"
  | "invalid"
  | "classified"
  | "exported"
  | "export_failed";

type CardDestination = "trello";

type IntakeRequest = {
  id: string;
  source: GoogleFormsIntake["source"];
  sourceSubmissionId: string;
  submittedAt: string;
  requestType: RequestType;
  requesterName: string;
  requesterEmail: string;
  companyName: string;
  title: string;
  description: string;
  priority: GoogleFormsIntake["request"]["priority"];
  requestedDueDate?: string | undefined;
  attachmentLink?: string | undefined;
  status: IntakeStatus;
  createdAt: string;
  updatedAt: string;
};

type IntakeDecision = {
  requestId: string;
  queue: "commercial" | "financial" | "operations";
  labels: string[];
  destination: CardDestination;
  destinationList: "Comercial" | "Financeiro" | "Operacoes";
  cardTitle: string;
  cardDescription: string;
  requiresManualReview: boolean;
};

type ExportAttempt = {
  id: string;
  requestId: string;
  provider: CardDestination;
  status: "success" | "failed";
  externalId?: string | undefined;
  externalUrl?: string | undefined;
  error?: string | undefined;
  createdAt: string;
};

type TrelloConfig = {
  apiKey: string;
  token: string;
  boardId: string;
  commercialListId: string;
  financialListId: string;
  operationsListId: string;
};

const currentFilePath = fileURLToPath(import.meta.url);
const appRoot = resolve(dirname(currentFilePath), "..");

for (const envFileName of [".env.local", ".env"]) {
  const envPath = resolve(appRoot, envFileName);

  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: envFileName === ".env.local" });
  }
}

const app = Fastify({ logger: true });
const store = createJsonStore<IntakeRequest, IntakeDecision, ExportAttempt>(resolve(appRoot, "data", "requests-db.json"));
const persistedState = store.load();
const requests: IntakeRequest[] = persistedState.requests;
const decisions: IntakeDecision[] = persistedState.decisions;
const exportAttempts: ExportAttempt[] = persistedState.exportAttempts;

const runtimeConfig = {
  intakeApiKey: process.env.INTAKE_API_KEY ?? "",
  trello: {
    apiKey: process.env.TRELLO_API_KEY ?? "",
    token: process.env.TRELLO_TOKEN ?? "",
    boardId: process.env.TRELLO_BOARD_ID ?? "",
    commercialListId: process.env.TRELLO_COMMERCIAL_LIST_ID ?? "",
    financialListId: process.env.TRELLO_FINANCIAL_LIST_ID ?? "",
    operationsListId: process.env.TRELLO_OPERATIONS_LIST_ID ?? ""
  }
};

function normalizeOptional(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function persistState() {
  store.save({
    requests,
    decisions,
    exportAttempts
  });
}

function validateBusinessRules(payload: GoogleFormsIntake) {
  const issues: string[] = [];

  if (payload.request.request_type === "financial_request" && payload.request.company_name.trim().length === 0) {
    issues.push("company_name is required for financial_request");
  }

  return issues;
}

function authenticateApiKey(receivedApiKey: string | undefined) {
  if (!runtimeConfig.intakeApiKey) {
    return {
      ok: false as const,
      statusCode: 500,
      message: "server_missing_intake_api_key"
    };
  }

  if (!receivedApiKey || receivedApiKey !== runtimeConfig.intakeApiKey) {
    return {
      ok: false as const,
      statusCode: 401,
      message: "invalid_api_key"
    };
  }

  return {
    ok: true as const
  };
}

function classify(requestType: RequestType) {
  if (requestType === "commercial_request") {
    return {
      queue: "commercial" as const,
      destinationList: "Comercial" as const
    };
  }

  if (requestType === "financial_request") {
    return {
      queue: "financial" as const,
      destinationList: "Financeiro" as const
    };
  }

  return {
    queue: "operations" as const,
    destinationList: "Operacoes" as const
  };
}

function buildLabels(payload: GoogleFormsIntake) {
  return [
    payload.request.request_type,
    payload.request.priority,
    payload.request.company_name.trim().length > 0 ? "has_company" : "no_company"
  ];
}

function buildCardDescription(payload: GoogleFormsIntake) {
  const dueDate = normalizeOptional(payload.request.requested_due_date) ?? "not_informed";
  const companyName = normalizeOptional(payload.request.company_name) ?? "not_informed";
  const attachmentLink = normalizeOptional(payload.request.attachment_link) ?? "not_informed";
  const requesterEmail = normalizeOptional(payload.request.requester_email) ?? "not_informed";

  return [
    `Requester: ${payload.request.requester_name}`,
    `E-mail: ${requesterEmail}`,
    `Company: ${companyName}`,
    `Request type: ${payload.request.request_type}`,
    `Priority: ${payload.request.priority}`,
    `Desired due date: ${dueDate}`,
    `Attachment link: ${attachmentLink}`,
    "",
    "Description:",
    payload.request.description
  ].join("\n");
}

function buildDecision(intakeRequest: IntakeRequest, payload: GoogleFormsIntake): IntakeDecision {
  const route = classify(payload.request.request_type);

  return {
    requestId: intakeRequest.id,
    queue: route.queue,
    labels: buildLabels(payload),
    destination: "trello",
    destinationList: route.destinationList,
    cardTitle: `[${payload.request.priority.toUpperCase()}] ${payload.request.title}`,
    cardDescription: buildCardDescription(payload),
    requiresManualReview: false
  };
}

function findExistingRequest(source: GoogleFormsIntake["source"], sourceSubmissionId: string) {
  return requests.find(
    (request) => request.source === source && request.sourceSubmissionId === sourceSubmissionId
  );
}

function getTrelloConfig(): TrelloConfig | null {
  const config = runtimeConfig.trello;

  if (
    !config.apiKey ||
    !config.token ||
    !config.boardId ||
    !config.commercialListId ||
    !config.financialListId ||
    !config.operationsListId
  ) {
    return null;
  }

  return config;
}

function resolveTrelloListId(decision: IntakeDecision, config: TrelloConfig) {
  if (decision.queue === "commercial") {
    return config.commercialListId;
  }

  if (decision.queue === "financial") {
    return config.financialListId;
  }

  return config.operationsListId;
}

async function createTrelloCard(decision: IntakeDecision) {
  const config = getTrelloConfig();

  if (!config) {
    throw new Error("trello_not_configured");
  }

  const url = new URL("https://api.trello.com/1/cards");
  url.searchParams.set("key", config.apiKey);
  url.searchParams.set("token", config.token);
  url.searchParams.set("idList", resolveTrelloListId(decision, config));
  url.searchParams.set("name", decision.cardTitle);
  url.searchParams.set("desc", decision.cardDescription);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`trello_export_failed:${response.status}:${body}`);
  }

  const data = (await response.json()) as { id: string; shortUrl?: string };

  return {
    externalId: data.id,
    externalUrl: data.shortUrl
  };
}

app.get("/health", async () => createHealthStatus("operational-ai-copilot"));

app.get("/intake/form-spec", async () => ({
  source: "google_forms",
  fields: formFieldSpec
}));

app.get("/requests", async () => ({
  requests,
  decisions,
  exportAttempts
}));

app.get("/requests/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const intakeRequest = requests.find((item) => item.id === id);

  if (!intakeRequest) {
    return reply.status(404).send({
      error: "request_not_found"
    });
  }

  return {
    request: intakeRequest,
    decision: decisions.find((item) => item.requestId === id) ?? null,
    exportAttempts: exportAttempts.filter((item) => item.requestId === id)
  };
});

app.get("/integrations/trello/status", async () => ({
  configured: Boolean(getTrelloConfig()),
  boardId: runtimeConfig.trello.boardId || null
}));

app.post("/intake/forms", async (request, reply) => {
  const auth = authenticateApiKey(request.headers["x-api-key"] as string | undefined);

  if (!auth.ok) {
    return reply.status(auth.statusCode).send({
      error: auth.message
    });
  }

  const parsed = googleFormsIntakeSchema.safeParse(request.body);

  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const issues = validateBusinessRules(payload);

  if (issues.length > 0) {
    return reply.status(422).send({
      error: "business_rule_validation_failed",
      issues
    });
  }

  const existingRequest = findExistingRequest(payload.source, payload.source_submission_id);

  if (existingRequest) {
    return reply.status(200).send({
      request: existingRequest,
      decision: decisions.find((item) => item.requestId === existingRequest.id) ?? null,
      exportAttempt:
        exportAttempts
          .filter((item) => item.requestId === existingRequest.id)
          .at(-1) ?? null,
      duplicate: true
    });
  }

  const now = new Date().toISOString();

  const intakeRequest: IntakeRequest = {
    id: `req_${toSlug(payload.request.requester_name)}_${Date.now()}`,
    source: payload.source,
    sourceSubmissionId: payload.source_submission_id,
    submittedAt: payload.submitted_at,
    requestType: payload.request.request_type,
    requesterName: payload.request.requester_name,
    requesterEmail: payload.request.requester_email,
    companyName: payload.request.company_name.trim(),
    title: payload.request.title,
    description: payload.request.description,
    priority: payload.request.priority,
    requestedDueDate: normalizeOptional(payload.request.requested_due_date),
    attachmentLink: normalizeOptional(payload.request.attachment_link),
    status: "classified",
    createdAt: now,
    updatedAt: now
  };

  const decision = buildDecision(intakeRequest, payload);

  try {
    const exportResult = await createTrelloCard(decision);

    intakeRequest.status = "exported";
    exportAttempts.push({
      id: `exp_${Date.now()}`,
      requestId: intakeRequest.id,
      provider: "trello",
      status: "success",
      externalId: exportResult.externalId,
      externalUrl: exportResult.externalUrl,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    intakeRequest.status = "export_failed";
    exportAttempts.push({
      id: `exp_${Date.now()}`,
      requestId: intakeRequest.id,
      provider: "trello",
      status: "failed",
      error: error instanceof Error ? error.message : "unknown_export_error",
      createdAt: new Date().toISOString()
    });
  }

  intakeRequest.updatedAt = new Date().toISOString();

  requests.push(intakeRequest);
  decisions.push(decision);
  persistState();

  return reply.status(intakeRequest.status === "exported" ? 201 : 502).send({
    request: intakeRequest,
    decision,
    exportAttempt: exportAttempts[exportAttempts.length - 1]
  });
});

const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: "0.0.0.0" }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
