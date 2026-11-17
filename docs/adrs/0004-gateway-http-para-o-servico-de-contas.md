# ADR 0004: Gateway/Adapter HTTP para o serviço de contas

- **Status:** Aceito
- **Data:** 2026-11-17

## Contexto
`transactions` precisa consultar saldo e aplicar crédito/débito em `accounts` de forma síncrona (REST). Pelo ADR 0002, `accounts` é dono do saldo e `transactions` não pode conhecer seu domínio, seu banco nem importar seu código. Precisamos de um ponto único e testável para essa integração, que isole o transporte e o formato de erro do outro serviço.

## Decisão
Adotei **Gateway (porta) + Adapter (implementação HTTP)**:

- **Porta** `AccountsGateway` em `application/gateways/`: `getBalance`, `credit`, `debit`, em centavos, com a linguagem de `transactions`. Os casos de uso dependem só dela.
- **Adapter** `HttpAccountsGateway` em `infra/gateways/`: único lugar que conhece URLs, JSON, `fetch` e os códigos HTTP de `accounts`.
- **Tradução de erros (anti-corruption):** o erro padronizado de `accounts` (`{ code, ... }`) é convertido em exceções de domínio de `transactions`: `ACCOUNT_NOT_FOUND` → `AccountNotFoundError` (404), `INSUFFICIENT_FUNDS` → `InsufficientFundsError`, `ACCOUNT_BLOCKED` → `AccountBlockedError`, demais rejeições 4xx → `AccountsRequestRejectedError` (mantém o código original). Timeout, falha de rede e 5xx → `AccountsServiceUnavailableError`, exposto como **503** padronizado.
- **Timeout** obrigatório por chamada (`ACCOUNTS_REQUEST_TIMEOUT_MS`, padrão 3000 ms) via `AbortSignal`; URL em `ACCOUNTS_SERVICE_URL`.
- **Contrato:** DTOs espelhados do OpenAPI de `accounts` (`accounts-api.types.ts`), duplicados de propósito para não acoplar os serviços; o spec do gateway protege o contrato.
- **Cliente:** `fetch` nativo do Node 22, sem nova dependência.

### Strategy: não adotado
Débito e crédito diferem só no endpoint chamado; não há algoritmos intercambiáveis nem regras que variem por tipo. Um `switch`/par de métodos é mais simples (KISS) que uma família de estratégias. Reavaliar se surgirem políticas distintas por tipo de operação (ex.: limites, taxas) ou por canal.

## Por que Gateway/Adapter
- **Inversão de dependência:** application define o contrato; a infra se adapta. Trocar HTTP por gRPC/mensageria, ou o fluxo síncrono pelas activities do Temporal, não altera os casos de uso.
- **Testabilidade:** casos de uso são testados com um gateway fake; o adapter é testado isoladamente com `fetch` injetado, sem subir `accounts`.
- **Isolamento de falhas e de contrato:** o formato de erro e os status de `accounts` ficam contidos em um arquivo; o domínio só vê erros de negócio de `transactions`.
- **Reuso na saga:** as activities do Temporal reutilizam o mesmo gateway.

## Alternativas consideradas
- **Chamar `fetch`/`HttpService` direto nos casos de uso:** menos arquivos, mas acopla a regra de aplicação ao transporte e dificulta os testes.
- **Gerar cliente a partir do OpenAPI:** contrato sempre sincronizado, mas adiciona ferramenta de geração e código gerado para três operações; os DTOs espelhados cobrem o caso com custo menor.
- **`@nestjs/axios`:** nova dependência sem ganho sobre `fetch` com timeout para este volume de chamadas.

## Consequências
- **Positivas:** integração isolada, testável e substituível; erros previsíveis e padronizados na API.
- **Negativas / Riscos:**
  - Contrato duplicado: mudanças em `accounts` exigem atualizar `accounts-api.types.ts` (mitigado pelos testes do gateway).
  - O gateway não faz retry: a política de repetição fica a cargo do chamador (casos de uso/saga), já que repetir um débito exige idempotência no lado de `accounts`.
  - Um erro 409 de concorrência de `accounts` chega como `AccountsRequestRejectedError`; o tratamento (retry) será decidido no caso de uso.
