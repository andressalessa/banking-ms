# DDD 

## Agregattes/Services

- Accounts
- Transactions


## Bounded contexts

### Account (AggregateRoot)
```
holder: AccountHolder <name, cpf: Cpf, email: Email>
balance: Money ?
createdAt: Date
updatedAt: Date | null
```

#### Se der tempo:
```
address: Address
```


#### Value-Objects
```
AccountHolder {
  name: string, 
  cpf: Cpf, 
  email: Email, 
}
```

### Transactions


meu-monorepo/
├── apps/
│   ├── accounts/          # Microsserviço de contas (API NestJS)
│   │   └── src/
│   └── transactions/      # Microsserviço de transações (API NestJS)
│       └── src/
├── libs/                  # (ou packages/)
│   └── core/              # O núcleo compartilhado
│       ├── src/
│       │   ├── domain/    # Blocos fundamentais de DDD
│       │   │   ├── aggregate-root.base.ts
│       │   │   ├── entity.base.ts
│       │   │   ├── value-object.base.ts
│       │   │   └── domain-event.base.ts
│       │   ├── errors/    # Tratamento e tipagem de erros padronizados
│       │   │   ├── domain.error.ts
│       │   │   └── not-found.error.ts
│       │   └── index.ts   # Ponto de exportação (barrel file)
│       ├── tsconfig.lib.json
│       └── package.json
├── package.json
└── tsconfig.json          # Paths configurados para importar @core ou @shared

Maior detalhe:

apps/accounts/src/
├── domain/                   <-- 1. Camada Mais Interna (Regras de Negócio Puras)
│   ├── entities/             # Account (Aggregate Root)
│   ├── enums/                # AccountStatus (ACTIVE, BLOCKED...)
│   ├── errors/               # InvalidCpfError, InsufficientBalanceError
│   ├── events/               # AccountCreatedEvent, BalanceDebitedEvent...
│   ├── repositories/         # Contratos/Interfaces (ex: AccountsRepository)
│   └── value-objects/        # Cpf, AccountHolder
│
├── application/              <-- 2. Camada de Casos de Uso (Orquestração)
│   └── use-cases/            # CreateAccountUseCase, GetAccountBalanceUseCase...
│
├── infra/                    <-- 3. Camada Mais Externa (Frameworks, Banco, HTTP, Kafka)
│   ├── database/             # Implementação real do repositório (TypeORM/Prisma), Event Store
│   ├── http/                 # Controllers, DTOs, Exception Filters, Health Check
│   └── messaging/            # Producers/Consumers Kafka, Temporal Workers
│
├── accounts.module.ts        # Módulo raiz do NestJS que conecta todas as peças
└── main.ts                   # Ponto de entrada da aplicação


tsconfig.json

{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@core": ["libs/core/src"],
      "@core/*": ["libs/core/src/*"]
    }
  }
}

# Comandos para iniciar um projeto nestjs

nest new .

# por causa do erro no comando anterior
# Remove o package-lock e node_modules gerados pela metade
rm -rf node_modules package-lock.json

# Limpa o cache do npm forçadamente
npm cache clean --force

# Tenta instalar ignorando checagens estritas de peer dependencies
npm install --legacy-peer-deps

nest generate library core
nest generate app accounts
nest generate app transactions
