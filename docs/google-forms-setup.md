# Configuracao do Google Forms

## Importante

O `Google Apps Script` roda nos servidores do Google. Ele nao consegue chamar `http://localhost:3001` diretamente.

Antes de testar uma submissao real do formulario, exponha sua API local com uma URL publica usando um tunel como:

- `cloudflared`
- `ngrok`

## Campos do formulario

Crie um `Google Form` com estes rotulos exatos:

1. `Tipo de solicitacao`
2. `Seu nome`
3. `Empresa`
4. `Titulo da solicitacao`
5. `Descricao detalhada`
6. `Prioridade`
7. `Prazo desejado`
8. `Link de apoio`

Campos opcionais aceitos:

- `Seu e-mail`
- `Endereco de e-mail`
- `Email`
- `E-mail`

## Opcoes esperadas

Para `Tipo de solicitacao`, use estas opcoes visiveis:

- `Comercial`
- `Financeiro`
- `Operacoes internas`

Para `Prioridade`, use estas opcoes visiveis:

- `Baixa`
- `Media`
- `Alta`

## Subir a API

Na raiz do projeto, rode:

```powershell
pnpm dev
```

## Exemplo com tunel

Se usar `cloudflared`, exponha a API local com:

```powershell
cloudflared tunnel --url http://localhost:3001
```

Voce recebera uma URL HTTPS publica como:

```text
https://example-subdomain.trycloudflare.com
```

Use essa URL em `apps-script/Code.gs`:

```javascript
const API_URL = "https://example-subdomain.trycloudflare.com/intake/forms";
```

## Configuracao do Apps Script

Se abrir o Apps Script pelo Form ou pela Sheet falhar, use um projeto standalone:

1. Abra `https://script.new` na mesma conta Google do formulario.
2. Substitua o conteudo padrao pelo arquivo `apps-script/Code.gs`.
3. Preencha:
   - `API_URL`
   - `API_KEY`
   - `SPREADSHEET_ID`
4. Salve o script.

## Trigger

1. No projeto standalone do Apps Script, rode `installSpreadsheetTrigger`.
2. Autorize o script quando o Google pedir.
3. Isso conecta automaticamente o trigger `onFormSubmit` na planilha de respostas.

## Teste real

1. Mantenha `pnpm dev` rodando.
2. Mantenha o tunel rodando.
3. Envie uma resposta no formulario.
4. Verifique se o card apareceu no Trello.
5. Se precisar, abra `Execucoes` no Apps Script para inspecionar os logs.
