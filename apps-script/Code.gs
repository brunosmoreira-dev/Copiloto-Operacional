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
        values["Endereço de e-mail"],
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

  const response = UrlFetchApp.fetch(API_URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": API_KEY,
      "bypass-tunnel-reminder": "1"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log("Status: " + response.getResponseCode());
  Logger.log(response.getContentText());
}

function testWebhook() {
  const payload = {
    source: "google_forms",
    source_submission_id: "apps-script-manual-test",
    submitted_at: new Date().toISOString(),
    request: {
      request_type: "financial_request",
      requester_name: "Bruno Moreira",
      requester_email: "bruno@example.com",
      company_name: "ACME",
      title: "Teste via Apps Script",
      description: "Teste manual do Apps Script para a API.",
      priority: "high",
      requested_due_date: "",
      attachment_link: ""
    }
  };

  const response = UrlFetchApp.fetch(API_URL, {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-api-key": API_KEY,
      "bypass-tunnel-reminder": "1"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log("Status: " + response.getResponseCode());
  Logger.log(response.getContentText());
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
