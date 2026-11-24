# ADR 0005: Delegação da Validação de Saldo ao Serviço `accounts` em Operações de Débito (Eliminação de *Check-Then-Act*)

**Status:** Aceito  
**Data:** 2026-11-23  
**Contexto:** Microsserviço `transactions` (Casos de Uso de Transação Síncrona)

---

## Contexto

Durante o desenho do fluxo síncrono de execução de transações (`ExecuteTransactionUseCase`), avaliou-se a necessidade de realizar uma consulta prévia de saldo (`GET /accounts/:id/balance`) via `AccountsGateway` antes de efetivamente solicitar o débito (`POST /internal/accounts/:id/debit`) no microsserviço `accounts`.

Em uma abordagem inicial (*check-then-act*), o serviço `transactions` buscaria o saldo atual da conta, compararia `balance >= amount` localmente e, somente após essa verificação, dispararia a requisição de débito.

---

## Decisão

Optou-se por **não realizar a consulta prévia de saldo (`getBalance`)** antes do débito no `ExecuteTransactionUseCase`, delegando a verificação de suficiência de fundos diretamente à operação atômica de débito (`POST /internal/accounts/:id/debit`) no microsserviço `accounts`.

O `HttpAccountsGateway` (atuando como *Anti-Corruption Layer*) intercepta a resposta HTTP `422 Unprocessable Entity` (`code: "INSUFFICIENT_FUNDS"`) retornada por `accounts` e a traduz para a exceção de domínio `InsufficientFundsError` dentro de `transactions`.

---

## Justificativas

1. **Eliminação de *Race Condition* (*Check-Then-Act*):**
   Em cenários de alta concorrência (como múltiplas requisições simultâneas para a mesma conta), existe uma janela temporal entre a leitura do saldo (`GET /balance`) e a efetivação do débito (`POST /debit`). Outra transação concorrente pode consumir o saldo nesse intervalo, tornando a leitura prévia obsoleta e não garantindo a integridade da operação.
2. **Respeito às Fronteiras de Domínio (*Bounded Contexts*):**
   No desenho DDD do sistema, o saldo e suas invariantes (ex.: não permitir saldo negativo) pertencem exclusivamente ao agregado `Account` no contexto delimitado de `accounts`. Duplicar a regra `saldo >= valor` dentro de `transactions` vazaria lógica de negócio entre microsserviços.
3. **Single Source of Truth e Atomicidade:**
   O microsserviço `accounts` já realiza a validação de saldo e o registro do evento de débito de forma atômica no seu Event Store (com controle de concorrência otimista por versão do agregado), atuando como a única fonte da verdade.
4. **Redução de Latência e Carga de Rede:**
   Eliminar o `GET /balance` prévio reduz em 50% o número de chamadas HTTP síncronas entre `transactions` e `accounts` em operações de débito, melhorando o *throughput* e a latência de ponta a ponta (p95/p99).

---

## Consequências

### Positivas
* **Consistência sob concorrência:** Nenhuma decisão de negócio é tomada com base em estado potencialmente defasado (*stale read*).
* **Menor acoplamento:** O serviço `transactions` não precisa conhecer regras de cálculo de saldo disponível, limites ou bloqueios de conta; apenas reage ao contrato de erro padronizado de `accounts`.
* **Melhor desempenho no fluxo síncrono:** Menos *round-trips* de rede por transação.

### Negativas / Trade-offs
* **Custo de rede em falhas esperadas:** Em requisições de débito sem saldo suficiente, o tráfego chega até o endpoint de escrita de `accounts` antes de ser rejeitado, em vez de ser barrado em uma leitura prévia. Como o `accounts` rejeita a operação em memória logo após hidratar o agregado (antes de qualquer escrita no Event Store), o impacto no banco de dados permanece mínimo.
