# ADR 0001: Adoção de Exceções de Domínio em vez de Either

- **Status:** Aceito
- **Data:** 2026-11-09

## Contexto
Durante a modelagem do domínio de `accounts`, avaliei o uso da mônada `Either` (Railway Oriented Programming) para tratar validações de Value Objects (`Cpf`) e regras de negócio (`Account`). No entanto, o encadeamento de objetos aninhados gerou verbosidade excessiva e atrito com o fluxo nativo do NestJS.

## Decisão
Adotei Exceções de Domínio puras (`throw`), herdando de uma classe base abstrata `DomainError` na biblioteca `@core`, combinadas com um `ExceptionFilter` global no NestJS para traduzir erros de negócio em respostas HTTP adequadas (`400`/`422`).

## Alternativas Consideradas
- **Either / Result Pattern:** Oferece tipagem explícita de erros na assinatura dos métodos, mas aumenta o boilerplate na criação de agregados compostos (`Account` -> `AccountHolder` -> `Cpf`) e exige conversão manual antes de integrar com o Temporal (que espera exceções para controle de retentativas).

## Consequências
- **Positivas:** Código de domínio e fábricas de teste mais limpos (KISS); integração nativa com NestJS Exception Filters e Temporal Sagas.
- **Negativas / Riscos:** A assinatura dos métodos não explicita quais exceções podem ser lançadas, exigindo disciplina nos testes unitários e no mapeamento do `ExceptionFilter` para evitar erros `500` não tratados.
