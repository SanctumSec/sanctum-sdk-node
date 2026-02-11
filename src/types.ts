/** Connection target — Unix socket path or TCP host/port. */
export type ConnectionTarget = string | { host: string; port: number };

/** JSON-RPC request. */
export interface RpcRequest {
  id: number;
  method: string;
  params: Record<string, unknown>;
}

/** JSON-RPC response. */
export interface RpcResponse {
  id: number;
  result?: Record<string, unknown>;
  error?: string | StructuredError;
}

/** Structured error from the vault. */
export interface StructuredError {
  code: string;
  message: string;
  detail?: string;
  suggestion?: string;
  docs_url?: string;
  context?: Record<string, unknown>;
}

/** Result of a retrieve call. */
export interface RetrieveResult {
  value: string;
  lease_id: string;
  ttl?: number;
}

/** Credential entry from list. */
export interface CredentialEntry {
  path: string;
  [key: string]: unknown;
}

/** Authentication challenge from the vault. */
export interface AuthChallenge {
  session_id: string;
  challenge: string;
}

/** Authentication confirmation. */
export interface AuthConfirmation {
  authenticated: boolean;
}

/** Use operation result. */
export interface UseResult {
  [key: string]: unknown;
}
