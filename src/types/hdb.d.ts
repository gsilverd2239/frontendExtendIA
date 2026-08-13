declare module "hdb" {
  export interface ClientOptions {
    host: string;
    port: number;
    user?: string;
    password?: string;
    [key: string]: any;
  }

  export interface Client {
    connect(callback: (err?: Error) => void): void;
    exec(query: string, callback: (err?: Error, rows?: any[]) => void): void;
    end(): void;
  }

  export function createClient(options: ClientOptions): Client;
}
