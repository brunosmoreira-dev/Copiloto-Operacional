# Checklist De Setup

## O que voce precisa fazer

1. Criar `.env` na raiz do projeto a partir de `.env.example`.
2. Definir um valor para `INTAKE_API_KEY`.
3. Criar um board no `Trello`.
4. Criar tres listas nesse board:
   - `Comercial`
   - `Financeiro`
   - `Operacoes`
5. Preencher no `.env`:
   - `TRELLO_API_KEY`
   - `TRELLO_TOKEN`
   - `TRELLO_BOARD_ID`
   - `TRELLO_COMMERCIAL_LIST_ID`
   - `TRELLO_FINANCIAL_LIST_ID`
   - `TRELLO_OPERATIONS_LIST_ID`

## Validacao local

Suba a API:

```powershell
pnpm dev
```

Rode um teste de intake:

```powershell
pnpm test:intake
```

Se tudo estiver configurado corretamente, a request deve retornar `201` e criar um card no `Trello`.

Se o `Trello` nao estiver configurado, a API deve retornar `502` e manter a falha visivel em `GET /requests`.
