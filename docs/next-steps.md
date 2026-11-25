# Próximos passos / Evoluções futuras

Melhorias conscientemente adiadas para manter a simplicidade (KISS). Este documento cresce conforme novas evoluções forem identificadas.

## Segurança

- **CPF na tabela de lookup (`account_cpf_registry`).** Para manter a simplicidade (KISS), o CPF é armazenado apenas sanitizado. Em um ambiente produtivo sujeito à LGPD, esta tabela de lookup poderia evoluir para utilizar um Blind Index via HMAC-SHA256 aliado à criptografia de payload nos eventos.

## Estrutura do monorepo

- **Workspaces por serviço.** Hoje `accounts` e `transactions` compartilham um único `package.json` na raiz, com o Prisma configurado por serviço (`prisma.config.ts`, schema e client gerado em cada app). Isso é suficiente enquanto os serviços evoluem juntos, mas nada impede, em tempo de build, um serviço de importar código do outro. Se os serviços passarem a ser versionados e implantados de forma independente, a evolução é adotar workspaces (npm, pnpm ou Nx), com `package.json` próprio por app declarando suas dependências. A estrutura de `prisma/` por serviço permanece igual nesse cenário.
- **Fronteira entre serviços via lint.** Como evolução intermediária, mais barata que workspaces, adicionar uma regra de lint (`oxlint`) que proíba imports entre `apps/*`, reforçando o isolamento do database-per-service.
- **Scripts de Prisma parametrizados.** Cada serviço novo replica três scripts (`generate`, `migrate:dev`, `migrate:deploy`). Se o número de serviços crescer, parametrizar por nome do serviço. Com dois serviços, a duplicação é preferível à complexidade extra.
- **Geração do client no empacotamento.** O `postinstall` gera os clients de todos os serviços. Em imagens Docker de produção por serviço, gerar apenas o client do serviço empacotado.
