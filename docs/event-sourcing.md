# Event Sourcing em `accounts`

## Princípio
O agregado `Account` não tem tabela de estado. O estado é derivado exclusivamente do replay dos eventos imutáveis gravados em `account_events` (ADR 0002 e ADR 0003).

## Eventos
`AccountCreated`, `BalanceCredited`, `BalanceDebited`, `AccountBlocked`, `AccountActivated`. Todos estendem o envelope comum (`eventId`, `eventType`, `aggregateId`, `version`, `occurredAt`) e têm payload imutável.

## Agregado
- Toda mutação passa por `raise`: o evento é aplicado ao estado (`apply`) e registrado como pendente.
- `Account.fromHistory(events)` reconstrói a conta reaplicando os eventos pelo mesmo `apply`; não gera eventos pendentes e restaura a `version` do último evento.
- Regras de negócio (saldo suficiente, conta ativa, valor positivo) são validadas antes de gerar o evento; o `apply` nunca falha por regra de negócio.

## Persistência
- `account_events`: append-only (`UPDATE`/`DELETE`/`TRUNCATE` bloqueados por trigger); `UNIQUE(aggregate_id, version)`.
- `account_cpf_registry`: índice de unicidade/busca por CPF, gravado na mesma transação do `AccountCreated`.
- Porta `AccountEventStore` (`append(aggregateId, events, expectedVersion)`, `load(aggregateId, fromVersion?)`, `findAggregateIdByCpf`).
- `EventStoreAccountsRepository`: `findById` = `load` + `fromHistory`; `save` = `append` com a versão que o agregado tinha ao ser carregado, seguido do despacho dos eventos de domínio.

## Concorrência otimista
O `append` confere a versão atual dentro da transação; divergência (ou violação de `UNIQUE(aggregate_id, version)` numa corrida) gera `ConcurrencyError`. Dois escritores que leram a mesma versão: só o primeiro grava.

## Serialização e evolução
`account-event-serializer` mantém o registro `eventType → deserializador` e grava `schemaVersion` em `metadata`. Novo evento = nova entrada no registro. Mudança de payload = tratar o `schemaVersion` na entrada correspondente (upcasting), sem alterar o histórico.

## Dados pessoais
CPF e e-mail ficam em claro no `AccountCreated` (necessários ao replay), restritos ao `accounts_db`; nunca vão ao Kafka nem a logs (ADR 0002, item 5).

---

# Explicação passo a passo da branch `feat/implements-event-store-for-accounts`

**Estado da branch:** ela ainda não tem commits próprios. O último commit é o merge do PR #12, e tudo abaixo está como alteração não commitada no working tree.

**Objetivo:** a conta (`Account`) passa a ser persistida por **Event Sourcing**. Em vez de guardar o saldo e o estado em uma tabela, o sistema guarda a lista de eventos (`AccountCreated`, `BalanceCredited` etc.). Para saber o estado atual, ele reaplica esses eventos em ordem.

## Passo 1: o agregado `Account` passa a derivar o estado dos eventos
Arquivo: `account.ts`

- `Account.create()` não monta mais o objeto direto. Ele dispara um evento `AccountCreated`, e o estado nasce desse evento.
- Todas as mutações (`credit`, `debit`, `block`, `activate`) passam por um método `raise`. Ele aplica o evento ao estado e o registra como pendente.
- Foi criado o `Account.fromHistory(events)`. Ele reconstrói a conta reaplicando os eventos pelo mesmo `apply` e não gera eventos pendentes.
- `fromHistory` valida que o histórico começa com `AccountCreated`.
- `debit` agora checa `InsufficientFundsError` antes de gerar o evento.
- Foram criados os eventos `AccountBlocked` e `AccountActivated`.
- O `AccountCreated` agora também carrega o `holderEmail`.

## Passo 2: ajustes na lib `@core`
- `BaseDomainEvent` aceita `eventId` e `occurredAt` originais ao reidratar um evento já salvo (parâmetro `restored`). Sem isso, o replay geraria ids e datas novos.
- `AggregateRoot` ganhou `restoreVersion`, para a conta voltar do replay com a versão correta e os novos eventos continuarem dela.
- `DomainEvents.discardEventsForAggregate` descarta os eventos pendentes quando a persistência falha.

## Passo 3: serialização dos eventos
Arquivo: `account-event-serializer.ts`

- Converte evento de domínio em `StoredAccountEvent` (formato da linha do banco) e vice-versa.
- Tem um registro `eventType → deserializador`. Evento novo vira uma entrada nova ali.
- Guarda `metadata.schemaVersion`, que prepara o terreno para o upcasting, ou seja, a evolução do formato dos eventos.

## Passo 4: contrato do Event Store (domínio)
Arquivo: `account-event-store.ts`

Uma classe abstrata com três operações:
- `append(aggregateId, events, expectedVersion)`: grava de forma atômica.
- `load(aggregateId, fromVersion)`: lê os eventos do agregado.
- `findAggregateIdByCpf(cpf)`: busca o id da conta pelo CPF.

O `ConcurrencyError` é um novo erro de domínio, lançado quando a versão esperada diverge da atual.

## Passo 5: persistência com Prisma + Postgres
- **Dependências:** `prisma`, `@prisma/client`, `@prisma/adapter-pg` e `pg`.
- **Scripts:** `prisma:accounts:generate`, `migrate:dev` e `migrate:deploy`. O `postinstall` roda o `generate`.
- **`schema.prisma`:** define duas tabelas.
  - `account_events` guarda os eventos. Tem `UNIQUE(aggregate_id, version)`, que é o controle otimista de concorrência.
  - `account_cpf_registry` é um índice de unicidade e busca por CPF. Não guarda saldo nem estado.
- **Migration:** cria as tabelas e adiciona *triggers* que bloqueiam `UPDATE`, `DELETE` e `TRUNCATE` em `account_events`. Assim a tabela é realmente append-only.
- **Infra:** `PrismaService`, `DatabaseModule` (importado no `AccountsModule`) e `env.ts` para a configuração.

## Passo 6: implementação do Event Store
Arquivo: `prisma-account-event-store.ts`

O `append` roda numa transação:
1. Lê a última versão e compara com `expectedVersion`. Se for diferente, lança `ConcurrencyError`.
2. Se há um `AccountCreated`, grava o CPF no registro. Se o CPF já existir, lança `CpfAlreadyRegisteredError`.
3. Insere os eventos. Se houver violação de unicidade por corrida, também lança `ConcurrencyError`.

## Passo 7: repositório event-sourced
Arquivo: `event-store-accounts.repository.ts`

- `findById` carrega os eventos, desserializa e chama `Account.fromHistory`.
- `findByCpf` acha o id pelo registro de CPF e carrega a conta.
- `save` calcula `expectedVersion = version - eventos pendentes` e faz o `append`.
  - Se falhar, descarta os eventos pendentes.
  - Se der certo, despacha os eventos de domínio.

## Passo 8: testes
- `account.spec.ts` foi reescrito com os testes do `fromHistory`: replay do estado exato, versão continuando de onde parou, estado bloqueado preservado e histórico inválido rejeitado.
- Há specs para o repositório e para o event store Prisma.
- Há um `InMemoryAccountEventStore` em `src/test/repositories`, para testes sem banco.

## Passo 9: documentação
- Foi criado o ADR 0003, sobre o Prisma como camada de persistência.
- `event-sourcing.md` e o ADR 0002 foram atualizados.
- O novo `next-steps.md` registra uma evolução adiada: proteger o CPF do registro com *blind index* HMAC, por causa da LGPD.

## Em resumo
O fluxo passou a ser: **comando → agregado gera evento → serializa → `append` atômico com controle de concorrência e unicidade de CPF → despacha eventos**. Para ler, o caminho é **`load` → desserializa → `fromHistory`**.
