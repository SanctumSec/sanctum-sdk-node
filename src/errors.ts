/** Base error for all Sanctum vault errors. */
export class VaultError extends Error {
  code: string;
  detail?: string;
  suggestion?: string;
  docsUrl?: string;
  context: Record<string, unknown>;

  constructor(
    message: string,
    opts: {
      code?: string;
      detail?: string;
      suggestion?: string;
      docsUrl?: string;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message);
    this.name = "VaultError";
    this.code = opts.code ?? "UNKNOWN";
    this.detail = opts.detail;
    this.suggestion = opts.suggestion;
    this.docsUrl = opts.docsUrl;
    this.context = opts.context ?? {};
  }
}

export class AuthError extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "AUTH_FAILED", ...opts });
    this.name = "AuthError";
  }
}

export class AccessDenied extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "ACCESS_DENIED", ...opts });
    this.name = "AccessDenied";
  }
}

export class CredentialNotFound extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "CREDENTIAL_NOT_FOUND", ...opts });
    this.name = "CredentialNotFound";
  }
}

export class VaultLocked extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "VAULT_LOCKED", ...opts });
    this.name = "VaultLocked";
  }
}

export class LeaseExpired extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "LEASE_EXPIRED", ...opts });
    this.name = "LeaseExpired";
  }
}

export class RateLimited extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "RATE_LIMITED", ...opts });
    this.name = "RateLimited";
  }
}

export class SessionExpired extends VaultError {
  constructor(message: string, opts = {}) {
    super(message, { code: "SESSION_EXPIRED", ...opts });
    this.name = "SessionExpired";
  }
}

export const CODE_TO_ERROR: Record<string, typeof VaultError> = {
  AUTH_FAILED: AuthError,
  ACCESS_DENIED: AccessDenied,
  CREDENTIAL_NOT_FOUND: CredentialNotFound,
  VAULT_LOCKED: VaultLocked,
  LEASE_EXPIRED: LeaseExpired,
  RATE_LIMITED: RateLimited,
  SESSION_EXPIRED: SessionExpired,
};
