# ADR 0002: Controle dos eventos — `accounts` como dono do Event Store e `transactions` como dono dos eventos de integração e do extrato

- **Status:** Aceito
- **Data:** 2026-11-12

## Contexto
O teste prático exige que a conta seja um agregado reconstruído por replay de eventos imutáveis (`ContaCriada`, `CreditoRealizado`, `DebitoRealizado`) persistidos em um event store com snapshotting. Ao mesmo tempo, exige serviços desacoplados com banco isolado, em que `accounts` cuida do cadastro e do saldo e `transactions` registra débitos/créditos e expõe o extrato (CQRS, via Kafka).

Há uma tensão entre esses requisitos: os eventos de débito/crédito pertencem ao ciclo de vida da conta (Event Sourcing) ou à transação (extrato/mensageria)? Sem definir isso, o event store, o produtor Kafka e a projeção do extrato ficam ambíguos, e as regras de domínio correm o risco de vazar entre serviços.

## Decisão
Separei dois tipos de evento, cada um com um dono:

1. **Eventos de agregado (Event Sourcing) — dono: `accounts`.**
   - `accounts` é o único serviço com acesso ao Event Store (`account_events`, tabela append-only no `accounts_db`) e aos snapshots.
   - Eventos: `AccountCreated`, `BalanceCredited`, `BalanceDebited`. O estado de `Account` é derivado exclusivamente do replay (com snapshot) desses eventos.
   - `Account` apenas aplica `+/-` ao saldo e protege invariantes (saldo não negativo, conta ativa). Não conhece o conceito de transação, tipo, motivo ou saga.

2. **Eventos de integração (Kafka) — dono: `transactions`.**
   - Após `accounts` confirmar a mutação do saldo, `transactions` registra a transação e publica `DebitPerformed`/`CreditPerformed` no Kafka (padrão Transactional Outbox, chave de partição = `accountId`).
   - `transactions` mantém o read model do extrato, projetado de forma assíncrona a partir desses eventos (CQRS), com consumo idempotente por `eventId`.
   - O payload é mínimo (ids, valor, tipo, saldo resultante, timestamps) e não inclui dados cadastrais como CPF.

3. **Os dois contratos são independentes.** Eventos de agregado não são publicados diretamente no Kafka, e eventos de integração não são gravados no event store. Cada um tem seu próprio versionamento.

4. **Nomenclatura.** Todo o código é em inglês (padrão de mercado), incluindo os eventos de integração; apenas a documentação é em português. Eventos de agregado: `AccountCreated`, `BalanceCredited`, `BalanceDebited`. Eventos de integração: `DebitPerformed` e `CreditPerformed`, equivalentes em inglês de `DebitoRealizado`/`CreditoRealizado` do enunciado (a equivalência fica registrada aqui para manter a rastreabilidade com os requisitos).

Fluxo resumido do débito:
`transactions` → (REST/Temporal) → `accounts` (valida invariantes, grava `BalanceDebited` no event store) → resposta com saldo resultante → `transactions` (registra a transação + outbox) → Kafka (`DebitPerformed`) → consumidor de extrato (read model).

5. **Dado sensível (CPF) no evento de agregado.** O `AccountCreated` mantém o CPF em claro porque o estado de `Account` é derivado só dos eventos (mascarar ou hashear impediria reconstruir o `Cpf` no replay e quebraria `findByCpf`/unicidade). O risco é contido assim:
   - o evento de agregado vive apenas no `accounts_db` e nunca é publicado no Kafka nem acessado por outro serviço;
   - os eventos de integração (`DebitPerformed`/`CreditPerformed`) não incluem CPF nem outros dados cadastrais;
   - logs não devem imprimir o payload de `AccountCreated`.
   - **Limitação conhecida:** como o event store é imutável, o CPF não pode ser apagado (direito à exclusão da LGPD). A evolução prevista é *crypto-shredding* (criptografar o dado pessoal com uma chave por conta e descartar a chave para "apagar"), fora do escopo deste PDI.

## Alternativas Consideradas
- **`transactions` como dono do Event Store (eventos `DebitPerformed`/`CreditPerformed` como fonte da verdade do saldo).** Aproxima o evento da operação de negócio, mas `accounts` deixaria de ser dono do saldo (viola "contas mantém o saldo atual"), ou precisaria reconstruí-lo a partir de eventos de outro serviço, criando acoplamento e acesso cruzado a dados.
- **Publicar no Kafka diretamente os eventos do event store de `accounts`.** Reduz um passo, mas expõe o modelo interno do agregado como contrato público, acopla consumidores ao schema do event store e mistura o extrato (responsabilidade de `transactions`) com `accounts`.
- **Um único conjunto de eventos para as duas finalidades.** Mais simples no papel, porém força um único contrato a servir persistência (precisa de `version`, estado completo do agregado) e integração (precisa ser estável, mínimo e sem dados sensíveis).

## Consequências
- **Positivas:** responsabilidades claras (KISS/SRP) e banco isolado por serviço; replay e snapshot restritos ao agregado `Account`; contrato público estável e evolutivo; `transactions` não precisa conhecer a estrutura interna da conta.
- **Negativas / Riscos:**
  - Existem dois modelos de evento e é preciso manter o mapeamento entre eles, o que gera mais código e documentação.
  - **Falha parcial:** `accounts` pode debitar e `transactions` cair antes de registrar/publicar. Mitigação: saga Temporal com activities idempotentes e compensação (RES-02) e Transactional Outbox (ES-04).
  - **Consistência eventual:** o extrato só reflete o débito depois da projeção assíncrona (a documentar no ADR de consistência eventual).
  - O saldo resultante precisa ser devolvido por `accounts` para compor o evento de integração, o que cria uma dependência de contrato REST.
