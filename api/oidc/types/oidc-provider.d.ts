declare module 'oidc-provider' {
  import { IncomingMessage, ServerResponse } from 'http';

  export interface Configuration {
    clients?: any[];
    [key: string]: any;
  }

  export class Provider {
    constructor(issuer: string, config: Configuration);
    callback(): (req: IncomingMessage, res: ServerResponse) => void;
    initialize(): Promise<void>;
    app: any;
  }
}