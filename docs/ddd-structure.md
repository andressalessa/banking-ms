# DDD 

## Agregattes/Services

- Accounts
- Transactions


## Bounded contexts

### Account


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
