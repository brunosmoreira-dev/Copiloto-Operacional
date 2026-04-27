# Especificacao Do Intake Via Google Forms

## Campos canonicos

Use um `Google Form` que alimente este payload canonico:

1. `request_type`
2. `requester_name`
3. `requester_email` opcional
4. `company_name`
5. `title`
6. `description`
7. `priority`
8. `requested_due_date` pode ser texto livre
9. `attachment_link`

## Regras de negocio

- `request_type`, `requester_name`, `title`, `description` e `priority` sao obrigatorios.
- `company_name` passa a ser obrigatorio quando `request_type` for `financial_request`.
- `requested_due_date` e opcional.
- `requester_email` e opcional.
- `attachment_link` e opcional.

## Payload da API

```json
{
  "source": "google_forms",
  "source_submission_id": "form-response-001",
  "submitted_at": "2026-04-27T15:00:00.000Z",
  "request": {
    "request_type": "financial_request",
    "requester_name": "Bruno Moreira",
    "requester_email": "bruno@example.com",
    "company_name": "ACME",
    "title": "Reemissao de boleto",
    "description": "Cliente pediu segunda via do boleto do contrato de abril.",
    "priority": "high",
    "requested_due_date": "2026-04-30",
    "attachment_link": "https://drive.google.com/file/d/abc123/view"
  }
}
```

## Exemplo de Apps Script

```javascript
const API_URL = "https://replace-with-your-public-url/intake/forms";
const API_KEY = "replace-with-your-intake-api-key";
const SPREADSHEET_ID = "replace-with-your-google-sheet-id";

function installSpreadsheetTrigger() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const triggers = ScriptApp.getProjectTriggers();

  triggers
    .filter((trigger) => trigger.getHandlerFunction() === "onFormSubmit")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(spreadsheet).onFormSubmit().create();
}

function onFormSubmit(e) {
  const values = e.namedValues;
  const payload = {
    source: "google_forms",
    source_submission_id: e.range.getRow().toString(),
    submitted_at: new Date().toISOString(),
    request: {
      request_type: mapRequestType(firstValue(values["Tipo de solicitacao"])),
      requester_name: firstValue(values["Seu nome"]),
      requester_email: firstNonEmpty([
        values["Seu e-mail"],
        values["Endereco de e-mail"],
        values["Email"],
        values["E-mail"]
      ]),
      company_name: firstValue(values["Empresa"]),
      title: firstValue(values["Titulo da solicitacao"]),
      description: firstValue(values["Descricao detalhada"]),
      priority: mapPriority(firstValue(values["Prioridade"])),
      requested_due_date: firstValue(values["Prazo desejado"]),
      attachment_link: firstValue(values["Link de apoio"])
    }
  };

  UrlFetchApp.fetch(API_URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": API_KEY,
      "bypass-tunnel-reminder": "1"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

function firstValue(field) {
  return Array.isArray(field) && field.length > 0 ? String(field[0]).trim() : "";
}

function firstNonEmpty(fields) {
  for (let i = 0; i < fields.length; i += 1) {
    const value = firstValue(fields[i]);

    if (value) {
      return value;
    }
  }

  return "";
}

function mapRequestType(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "comercial") {
    return "commercial_request";
  }

  if (normalized === "financeiro") {
    return "financial_request";
  }

  if (normalized === "operacoes internas") {
    return "internal_ops_request";
  }

  return normalized;
}

function mapPriority(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "baixa") {
    return "low";
  }

  if (normalized === "media" || normalized === "média") {
    return "medium";
  }

  if (normalized === "alta") {
    return "high";
  }

  return normalized;
}
```

## Variaveis de ambiente

O backend espera:

- `INTAKE_API_KEY`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`
- `TRELLO_BOARD_ID`
- `TRELLO_COMMERCIAL_LIST_ID`
- `TRELLO_FINANCIAL_LIST_ID`
- `TRELLO_OPERATIONS_LIST_ID`
