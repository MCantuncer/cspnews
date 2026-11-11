/**
 * The part of Cloudflare's D1 database API this Worker uses. Declared here, so the code doesn't
 * depend on Workers type packages and tests can stand in a local SQLite database.
 */
export interface D1Result<T = unknown> {
  readonly results: T[];
  readonly success: boolean;
  readonly meta: { readonly changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  /** Runs the statements in one transaction: all of them, or none. */
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}
