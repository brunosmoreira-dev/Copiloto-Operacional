import { z } from "zod";

export type HealthStatus = {
  service: string;
  status: "ok";
  timestamp: string;
};

export function createHealthStatus(service: string): HealthStatus {
  return {
    service,
    status: "ok",
    timestamp: new Date().toISOString()
  };
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const requestTypeSchema = z.enum([
  "commercial_request",
  "financial_request",
  "internal_ops_request"
]);

export const prioritySchema = z.enum(["low", "medium", "high"]);

export const formFieldSpec = [
  {
    key: "request_type",
    label: "Tipo de solicitacao",
    required: true,
    component: "multiple_choice",
    options: requestTypeSchema.options
  },
  {
    key: "requester_name",
    label: "Seu nome",
    required: true,
    component: "short_text"
  },
  {
    key: "requester_email",
    label: "Seu e-mail (opcional)",
    required: false,
    component: "short_text"
  },
  {
    key: "company_name",
    label: "Empresa",
    required: false,
    component: "short_text"
  },
  {
    key: "title",
    label: "Titulo da solicitacao",
    required: true,
    component: "short_text"
  },
  {
    key: "description",
    label: "Descricao detalhada",
    required: true,
    component: "paragraph"
  },
  {
    key: "priority",
    label: "Prioridade",
    required: true,
    component: "multiple_choice",
    options: prioritySchema.options
  },
  {
    key: "requested_due_date",
    label: "Prazo desejado",
    required: false,
    component: "short_text"
  },
  {
    key: "attachment_link",
    label: "Link de apoio",
    required: false,
    component: "short_text"
  }
] as const;

export const googleFormsRequestSchema = z.object({
  request_type: requestTypeSchema,
  requester_name: z.string().trim().min(2).max(120),
  requester_email: z.string().trim().max(200).optional().default(""),
  company_name: z.string().trim().max(160).optional().default(""),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(4000),
  priority: prioritySchema,
  requested_due_date: z.string().trim().max(120).optional().default(""),
  attachment_link: z.string().trim().max(500).optional().default("")
});

export const googleFormsIntakeSchema = z.object({
  source: z.literal("google_forms"),
  source_submission_id: z.string().trim().min(1),
  submitted_at: z.iso.datetime(),
  request: googleFormsRequestSchema
});

export type RequestType = z.infer<typeof requestTypeSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type GoogleFormsRequest = z.infer<typeof googleFormsRequestSchema>;
export type GoogleFormsIntake = z.infer<typeof googleFormsIntakeSchema>;
