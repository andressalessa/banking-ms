# ADR 0003: Prisma como camada de persistência do Event Store

- **Status:** Aceito
- **Data:** 2026-11-17

## Contexto
O serviço `accounts` precisa persistir o agregado `Account` no Postgres (`accounts_db`), com migrations versionadas. Pela decisão do ADR 0002, `accounts` é dono do Event Store: o estado da conta é derivado exclusivamente do replay de eventos imutáveis, então **não existe tabela de estado do agregado**. A escolha de ORM precisa servir a esse modelo (append-only, controle otimista de concorrência, transação entre tabelas) e ao princípio KISS: menos código de infraestrutura e menos conceitos, sem vazar persistência para o domínio.

## Decisão
Adotei o **Prisma (v7)** com o driver adapter `@prisma/adapter-pg`, usado para implementar o Event Store de `accounts`.

- Schema único em `apps/accounts/prisma/schema.prisma`; migrations SQL versionadas em `apps/accounts/prisma/migrations/` (`prisma migrate deploy`; nada de `synchronize`).
- Tabelas:
  - `account_events` — append-only; `event_id` (PK), `aggregate_id`, `aggregate_type`, `version`, `event_type`, `payload` (`jsonb`), `occurred_at`, `metadata` (`jsonb`); `UNIQUE(aggregate_id, version)` garante o controle otimista de concorrência. `UPDATE`, `DELETE` e `TRUNCATE` são bloqueados por trigger.
  - `account_cpf_registry` — `cpf` único → `account_id`; é apenas um índice de unicidade/busca (um event store não consulta por campo), gravado na mesma transação do evento de criação da conta. Não guarda saldo nem estado.
- O domínio expõe a porta `AccountEventStore` (`append` com versão esperada, `load` a partir de uma versão e busca de conta por CPF); a implementação com Prisma fica só em `infra/database/`. O `AccountsRepository` é implementado sobre essa porta (`EventStoreAccountsRepository`): carrega por replay (`Account.fromHistory`) e salva por `append`, e uma implementação in-memory da porta serve aos testes. Domínio e casos de uso não conhecem o Prisma.
- O `append` usa `$transaction` (eventos + registry). A versão atual é conferida dentro da transação e, como proteção contra corrida, a violação de unicidade em `(aggregate_id, version)` também vira `ConcurrencyError`; violação do CPF vira o erro de CPF já cadastrado.
- Client tipado gerado em `prisma/generated` de cada serviço (fora do git; gerado no `postinstall`). A conexão lê `ACCOUNTS_DATABASE_URL`.
- Database-per-service: cada serviço terá seu próprio schema, config e client; só `accounts` conhece `accounts_db`.

## Por que o Prisma ajuda no KISS
- **Sem classes de entidade de persistência.** Não há decorators duplicando o modelo: o agregado continua puro e a (de)serialização dos eventos é uma função simples.
- **Um arquivo declarativo** gera client, tipos e migration — menos configuração do que `DataSource` + entities + migrations.
- **Queries tipadas**: erros de coluna/tipo aparecem em compilação.
- **`$transaction` e `createMany`** cobrem o `append` atômico sem código extra, e `jsonb` mapeia direto para o payload do evento.
- O Event Store é tabela simples e o Prisma não impõe um modelo de entidade que brigue com o replay.

## Alternativas consideradas
- **TypeORM:** boa integração com Nest, mas exige entities decoradas (tentação de usá-las como domínio) e tem configuração de migrations mais manual; seu modelo de entidade com estado não agrega nada a um event store.
- **SQL puro / `pg` + query builder (Kysely):** máximo controle, mas mais código de mapeamento e migrations manuais. Continua sendo opção pontual (`$queryRaw`) caso o `append` com versão esperada fique desajeitado em alguma parte, mantendo o Prisma no restante.

## Consequências
- **Positivas:** menos boilerplate, tipagem ponta a ponta, migrations simples, repositório pequeno e fácil de testar (snapshots entram como acréscimo, pois `load` já aceita versão inicial).
- **Negativas / Riscos:**
  - Passo extra de build: `prisma generate` (automatizado em `postinstall`; o Dockerfile deve executá-lo).
  - O Prisma não é DDD-aware: a (de)serialização dos eventos é responsabilidade nossa (registro `tipo de evento → deserializador`, com `schemaVersion` no `metadata` para permitir novos eventos e *upcasting*).
  - O bloqueio de `UPDATE`/`DELETE`/`TRUNCATE` depende de SQL manual na migration (trigger), pois não é expressável no schema Prisma. Consequência: testes de integração não limpam a tabela; cada teste usa ids e CPFs novos.
  - O CPF fica em claro no payload do evento de criação (ADR 0002) e no registry, junto com o e-mail (necessário para reconstruir o titular); ambos restritos ao `accounts_db`.
  - O client gerado é específico por serviço; `transactions` terá schema e client próprios.
