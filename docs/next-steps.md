# Próximos passos / Evoluções futuras

Melhorias conscientemente adiadas para manter a simplicidade (KISS). Este documento cresce conforme novas evoluções forem identificadas.

## Segurança

- **CPF na tabela de lookup (`account_cpf_registry`).** Para manter a simplicidade (KISS), o CPF é armazenado apenas sanitizado. Em um ambiente produtivo sujeito à LGPD, esta tabela de lookup poderia evoluir para utilizar um Blind Index via HMAC-SHA256 aliado à criptografia de payload nos eventos.
