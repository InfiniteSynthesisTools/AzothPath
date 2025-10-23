declare module 'better-sqlite3' {
  interface Options {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: (message?: any, ...additionalArgs: any[]) => void;
  }

  class Database {
    constructor(filename: string, options?: Options);
    prepare(sql: string): Statement;
    exec(sql: string): this;
    close(): void;
    inTransaction: boolean;
    name: string;
    open: boolean;
    memory: boolean;
    readonly: boolean;
  }

  class Statement {
    run(...params: any[]): { changes: number; lastInsertRowid: number | bigint };
    get(...params: any[]): any;
    all(...params: any[]): any[];
    iterate(...params: any[]): IterableIterator<any>;
    pluck(toggleState?: boolean): this;
    expand(toggleState?: boolean): this;
    safeIntegers(toggleState?: boolean): this;
    bind(...params: any[]): this;
    columns(): Array<{ name: string; column?: string; type?: string }>;
  }

  export = Database;
}