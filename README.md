# SanctumAI Node.js SDK

[![npm version](https://img.shields.io/npm/v/sanctum-ai.svg)](https://www.npmjs.com/package/sanctum-ai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript/Node.js SDK for [SanctumAI](https://github.com/jwgale/sanctum) — secure credential management for AI agents.

## Installation

```bash
npm install sanctum-ai
```

## Quick Start

```typescript
import { SanctumClient } from "sanctum-ai";

const client = new SanctumClient("my-agent");
await client.connect();

// Retrieve a credential
const apiKey = await client.retrieve("openai/api_key");

// List available credentials
const creds = await client.list();

// Use-not-retrieve (credential never leaves the vault)
const result = await client.use("openai/api_key", "http_header");

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

// Or via constructor
const client = new SanctumClient("my-agent", { host: "127.0.0.1", port: 8200 });
```

## API Reference

### `new SanctumClient(agentName, opts?)`

| Option | Description |
|---|---|
| `socketPath` | Unix socket path (default: `~/.sanctum/vault.sock`) |
| `host` / `port` | TCP connection (alternative to socket) |
| `keyPath` | Path to Ed25519 key file (default: `~/.sanctum/keys/{agentName}.key`) |

### Methods

#### `connect(target?) → Promise<this>`
Connect and authenticate. Optionally pass a socket path or `{ host, port }`.

#### `retrieve(path, ttl?) → Promise<string>`
Retrieve a credential as a UTF-8 string. Lease is auto-tracked.

#### `list() → Promise<CredentialEntry[]>`
List credentials the agent has access to.

#### `releaseLease(leaseId) → Promise<void>`
Release a credential lease.

#### `use(path, operation, params?) → Promise<UseResult>`
Use-not-retrieve pattern — execute an operation without exposing the secret.

#### `close() → Promise<void>`
Release all tracked leases and disconnect.

### Error Classes

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

## Protocol

JSON-RPC over Unix sockets or TCP with 4-byte big-endian length-prefix framing. Ed25519 challenge-response authentication.

## License

MIT — see [LICENSE](LICENSE).

## Links

- **Main project:** [github.com/jwgale/sanctum](https://github.com/jwgale/sanctum)
- **Issues:** [github.com/jwgale/sanctum-sdk-node/issues](https://github.com/jwgale/sanctum-sdk-node/issues)
