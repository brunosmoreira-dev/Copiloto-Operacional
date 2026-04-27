# Copiloto operacional

## Problema

Times operacionais recebem demandas repetitivas em canais dispersos e depois perdem tempo transformando isso em cards, tickets ou oportunidades em outro sistema.

## Proposta

Um intake operacional que recebe solicitacoes estruturadas via `Google Forms`, valida os dados, classifica a demanda e cria um card em um destino externo sem acoplar a logica a um CRM especifico.

## MVP

- entrada unica via `Google Forms`
- `Apps Script` como ponte para a API
- validacao por schema tolerante ao formulario real
- classificacao por tipo de solicitacao + regras simples
- payload canonico proprio
- exportacao para um destino gratuito agora e `Pipedrive` depois
- painel para listar requests, decisoes e falhas
- autenticacao por `x-api-key`
- exportacao real para `Trello`
- persistencia local em `data/requests-db.json`
- deduplicacao por `source_submission_id`

## Artefatos desta versao

- schema compartilhado do formulario
- endpoint `POST /intake/forms`
- endpoint `GET /intake/form-spec`
- endpoint `GET /requests/:id`
- exemplo de payload para `Apps Script`
- endpoint `GET /integrations/trello/status`
- script local `pnpm test:intake`

## Variaveis de ambiente

Use `.env` na raiz deste projeto, ao lado de `package.json`.

Veja `.env.example` para:

- `INTAKE_API_KEY`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`
- `TRELLO_BOARD_ID`
- `TRELLO_COMMERCIAL_LIST_ID`
- `TRELLO_FINANCIAL_LIST_ID`
- `TRELLO_OPERATIONS_LIST_ID`

## Teste local

Veja `docs/setup-checklist.md` para a ordem de setup e validacao local

## Google Forms

Veja `docs/google-forms-setup.md` e `apps-script/Code.gs` para conectar o formulario ao backend.

## Persistencia

As requests, decisoes e tentativas de exportacao ficam salvas em:

- `data/requests-db.json`

Isso evita perder o historico a cada restart da API e ja deixa o MVP mais apresentavel para portfolio.

## Evolucao natural

- adicionar importacao por `Google Sheets`
- persistir em PostgreSQL
- adicionar fila com BullMQ
- plugar `Trello`, `Notion` e `Pipedrive`
- enriquecer a classificacao com IA
