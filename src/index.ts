export { SanctumClient } from "./client";
export {
  VaultError,
  AuthError,
  AccessDenied,
  CredentialNotFound,
  VaultLocked,
  LeaseExpired,
  RateLimited,
  SessionExpired,
} from "./errors";
export { encodeFrame, decodeFrame, raiseOnError } from "./protocol";
export type {
  ConnectionTarget,
  RpcRequest,
  RpcResponse,
  StructuredError,
  RetrieveResult,
  CredentialEntry,
  UseResult,
} from "./types";
