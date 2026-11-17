export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }

  /** Código estável para clientes (ex.: `AccountNotFoundError` -> `ACCOUNT_NOT_FOUND`). */
  get code(): string {
    return this.name
      .replace(/Error$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toUpperCase();
  }
}
