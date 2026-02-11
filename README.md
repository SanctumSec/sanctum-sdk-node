# SanctumAI Node.js SDK

[![npm version](https://img.shields.io/npm/v/sanctum-ai.svg)](https://www.npmjs.com/package/sanctum-ai)
[![Node.js](https://img.shields.io/badge/node-18%2B-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/jwgale/sanctum-sdk-node/actions/workflows/ci.yml/badge.svg)](https://github.com/jwgale/sanctum-sdk-node/actions/workflows/ci.yml)

> Part of the [SanctumAI](https://github.com/jwgale/sanctum) ecosystem — secure credential management for AI agents.

TypeScript/Node.js SDK for interacting with a SanctumAI vault. Supports Unix sockets and TCP, Ed25519 authentication, automatic lease tracking, and the **use-not-retrieve** pattern.

## Installation

```bash
npm install sanctum-ai
```

Requires **Node.js 18+**.

## Quick Start

```typescript
import { SanctumClient } from "sanctum-ai";

const client = new SanctumClient("my-agent");
await client.connect();

// List available credentials
const creds = await client.list();
for (const c of creds) {
  console.log(`  ${c.path} (tags: ${c.tags.join(", ")})`);
}

// Retrieve a credential (lease auto-tracked, released on close)
const apiKey: string = await client.retrieve("openai/api_key");
console.log(`Key starts with: ${apiKey.slice(0, 8)}...`);

// Use-not-retrieve — credential never leaves the vault
const result = await client.use("openai/api_key", "http_header");
// result.header → "Authorization: Bearer sk-..."

await client.close();
```

## Connecting

```typescript
// Unix socket (default: ~/.sanctum/vault.sock)
const client = new SanctumClient("my-agent");
await client.connect();

// Custom socket path
await client.connect("/tmp/sanctum.sock");

// TCP connection
await client.connect({ host: "127.0.0.1", port: 8200 });

// Or via constructor options
const client = new SanctumClient("my-agent", { host: "127.0.0.1", port: 8200 });
await client.connect();
```

## Use-Not-Retrieve

The **use-not-retrieve** pattern lets agents perform operations that require a credential without ever exposing the secret to the agent process. The vault executes the operation server-side and returns only the result.

```typescript
// Sign a request — private key never leaves the vault
const signed = await client.use("signing/key", "sign_payload", {
  payload: "data-to-sign",
});

// Inject as HTTP header — agent never sees the raw token
const header = await client.use("openai/api_key", "http_header");

// Encrypt data — encryption key stays in the vault
const encrypted = await client.use("encryption/key", "encrypt", {
  plaintext: "sensitive data",
});
```

This is the recommended pattern for production agents. Secrets never exist in agent memory, minimizing blast radius if an agent is compromised.

## Error Handling

All errors inherit from `VaultError` and carry structured context:

```typescript
import { SanctumClient } from "sanctum-ai";
import {
  VaultError,
  AuthError,
  AccessDenied,
  CredentialNotFound,
  VaultLocked,
  LeaseExpired,
  RateLimited,
  SessionExpired,
} from "sanctum-ai/errors";

const client = new SanctumClient("my-agent");
await client.connect();

try {
  const secret = await client.retrieve("openai/api_key");
} catch (e) {
  if (e instanceof AccessDenied) {
    console.error(`No access: ${e.detail}`);
    console.error(`Suggestion: ${e.suggestion}`);
  } else if (e instanceof CredentialNotFound) {
    console.error(`Path not found: ${e.detail}`);
  } else if (e instanceof AuthError) {
    console.error("Authentication failed — check your Ed25519 key");
  } else if (e instanceof VaultLocked) {
    console.error("Vault is sealed — an operator needs to unseal it");
  } else if (e instanceof VaultError) {
    console.error(`[${e.code}] ${e.detail}`);
    if (e.docsUrl) console.error(`Docs: ${e.docsUrl}`);
  }
} finally {
  await client.close();
}
```

### Error Reference

| Class | Code | Description |
|---|---|---|
| `VaultError` | — | Base error |
| `AuthError` | `AUTH_FAILED` | Authentication failed |
| `AccessDenied` | `ACCESS_DENIED` | Insufficient permissions |
| `CredentialNotFound` | `CREDENTIAL_NOT_FOUND` | Path doesn't exist |
| `VaultLocked` | `VAULT_LOCKED` | Vault is sealed |
| `LeaseExpired` | `LEASE_EXPIRED` | Lease timed out |
| `RateLimited` | `RATE_LIMITED` | Too many requests |
| `SessionExpired` | `SESSION_EXPIRED` | Re-authenticate needed |

All errors carry `.code`, `.detail`, `.suggestion`, `.docsUrl`, and `.context`.

## API Reference

### `new SanctumClient(agentName, opts?)`

| Option | Description |
|---|---|
| `socketPath` | Unix socket path (default: `~/.sanctum/vault.sock`) |
| `host` / `port` | TCP connection (alternative to socket) |
| `keyPath` | Path to Ed25519 key file (default: `~/.sanctum/keys/{agentName}.key`) |

### Methods

| Method | Returns | Description |
|---|---|---|
| `connect(target?)` | `Promise<this>` | Connect and authenticate |
| `retrieve(path, ttl?)` | `Promise<string>` | Retrieve credential (lease auto-tracked) |
| `list()` | `Promise<CredentialEntry[]>` | List accessible credentials |
| `releaseLease(leaseId)` | `Promise<void>` | Release a credential lease |
| `use(path, operation, params?)` | `Promise<UseResult>` | Use-not-retrieve operation |
| `close()` | `Promise<void>` | Release all leases and disconnect |

## Protocol

JSON-RPC over Unix sockets or TCP with 4-byte big-endian length-prefix framing. Ed25519 challenge-response authentication.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`npm test`)
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT — see [LICENSE](LICENSE).

## Links

- 🏠 **Main project:** [github.com/jwgale/sanctum](https://github.com/jwgale/sanctum)
- 🌐 **Website:** [sanctumai.dev](https://sanctumai.dev)
- 🐍 **Python SDK:** [sanctum-sdk-python](https://github.com/jwgale/sanctum-sdk-python)
- 🦀 **Rust SDK:** [sanctum-sdk-rust](https://github.com/jwgale/sanctum-sdk-rust)
- 🐹 **Go SDK:** [sanctum-sdk-go](https://github.com/jwgale/sanctum-sdk-go)
- 🐛 **Issues:** [github.com/jwgale/sanctum-sdk-node/issues](https://github.com/jwgale/sanctum-sdk-node/issues)
