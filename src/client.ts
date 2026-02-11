/**
 * SanctumClient — main entry point for AI agents to access Sanctum.
 */

import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import nacl from "tweetnacl";

import type {
  ConnectionTarget,
  RpcResponse,
  AuthChallenge,
  AuthConfirmation,
  RetrieveResult,
  CredentialEntry,
  UseResult,
} from "./types";
import { encodeFrame, raiseOnError } from "./protocol";
import { VaultError, AuthError } from "./errors";

const DEFAULT_SOCKET = "~/.sanctum/vault.sock";
const DEFAULT_KEY_DIR = "~/.sanctum/keys";

function expandHome(p: string): string {
  return p.startsWith("~") ? path.join(os.homedir(), p.slice(1)) : p;
}

export class SanctumClient {
  private agentName: string;
  private socketPath?: string;
  private host?: string;
  private port?: number;
  private keyPath?: string;
  private socket: net.Socket | null = null;
  private sessionId: string | null = null;
  private reqId = 0;
  private leases: string[] = [];
  private buffer = Buffer.alloc(0);
  private pending: Map<
    number,
    { resolve: (v: RpcResponse) => void; reject: (e: Error) => void }
  > = new Map();

  constructor(
    agentName: string,
    opts: {
      socketPath?: string;
      host?: string;
      port?: number;
      keyPath?: string;
    } = {},
  ) {
    this.agentName = agentName;
    this.socketPath = opts.socketPath;
    this.host = opts.host;
    this.port = opts.port;
    this.keyPath = opts.keyPath;
  }

  /** Connect to the Sanctum daemon and authenticate. */
  async connect(target?: ConnectionTarget): Promise<this> {
    if (target != null) {
      if (typeof target === "string") {
        this.socketPath = target;
        this.host = undefined;
      } else {
        this.host = target.host;
        this.port = target.port;
        this.socketPath = undefined;
      }
    }

    await this.rawConnect();
    await this.authenticate(this.agentName, this.keyPath);
    return this;
  }

  private rawConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.host && this.port) {
        this.socket = net.createConnection({ host: this.host, port: this.port });
      } else {
        const sockPath = expandHome(this.socketPath ?? DEFAULT_SOCKET);
        this.socket = net.createConnection({ path: sockPath });
      }
      this.socket.on("data", (chunk) => this.onData(chunk));
      this.socket.on("error", reject);
      this.socket.once("connect", () => {
        this.socket!.removeListener("error", reject);
        resolve();
      });
    });
  }

  private onData(chunk: Buffer | string): void {
    const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    this.buffer = Buffer.concat([this.buffer, buf]);
    while (this.buffer.length >= 4) {
      const length = this.buffer.readUInt32BE(0);
      if (this.buffer.length < 4 + length) break;
      const payload = JSON.parse(
        this.buffer.subarray(4, 4 + length).toString(),
      ) as RpcResponse;
      this.buffer = this.buffer.subarray(4 + length);
      const p = this.pending.get(payload.id);
      if (p) {
        this.pending.delete(payload.id);
        p.resolve(payload);
      }
    }
  }

  private call(
    method: string,
    params: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!this.socket) throw new VaultError("Not connected", { code: "INTERNAL_ERROR" });
    const id = ++this.reqId;
    const frame = encodeFrame({ id, method, params });
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (resp) => {
          try {
            raiseOnError(resp);
            resolve(resp.result ?? {});
          } catch (e) {
            reject(e);
          }
        },
        reject,
      });
      this.socket!.write(frame);
    });
  }

  /** Authenticate with Ed25519 challenge-response. */
  async authenticate(
    agentName: string,
    keyPath?: string,
  ): Promise<void> {
    const keyPair = this.loadKey(agentName, keyPath);

    const r1 = (await this.call("authenticate", {
      agent_name: agentName,
    })) as unknown as AuthChallenge;

    this.sessionId = r1.session_id;
    const challenge = Buffer.from(r1.challenge, "hex");
    const signature = nacl.sign.detached(challenge, keyPair.secretKey);

    const r2 = (await this.call("challenge_response", {
      session_id: this.sessionId,
      signature: Buffer.from(signature).toString("hex"),
    })) as unknown as AuthConfirmation;

    if (!r2.authenticated) {
      throw new AuthError("Authentication not confirmed");
    }
  }

  private loadKey(
    agentName: string,
    keyPath?: string,
  ): nacl.SignKeyPair {
    const p = keyPath
      ? expandHome(keyPath)
      : path.join(expandHome(DEFAULT_KEY_DIR), `${agentName}.key`);
    const hex = fs.readFileSync(p, "utf-8").trim();
    const seed = Buffer.from(hex, "hex");
    if (seed.length !== 32) {
      throw new AuthError(`Key file has ${seed.length} bytes, expected 32`);
    }
    return nacl.sign.keyPair.fromSeed(seed);
  }

  /** Retrieve a credential as a UTF-8 string. Lease is auto-tracked. */
  async retrieve(credPath: string, ttl?: number): Promise<string> {
    const params: Record<string, unknown> = {
      session_id: this.sessionId,
      path: credPath,
    };
    if (ttl != null) params.ttl = ttl;
    const r = (await this.call("retrieve", params)) as unknown as RetrieveResult;
    this.leases.push(r.lease_id);
    return Buffer.from(r.value, "hex").toString("utf-8");
  }

  /** List credentials the agent has access to. */
  async list(): Promise<CredentialEntry[]> {
    const r = await this.call("list", { session_id: this.sessionId });
    return (r as any).credentials ?? [];
  }

  /** Release a credential lease. */
  async releaseLease(leaseId: string): Promise<void> {
    await this.call("release_lease", { lease_id: leaseId });
    this.leases = this.leases.filter((id) => id !== leaseId);
  }

  /** Use-not-retrieve: execute an operation without exposing the secret. */
  async use(
    credPath: string,
    operation: string,
    params?: Record<string, unknown>,
  ): Promise<UseResult> {
    const rpcParams: Record<string, unknown> = {
      session_id: this.sessionId,
      path: credPath,
      operation,
    };
    if (params) rpcParams.params = params;
    return (await this.call("use", rpcParams)) as UseResult;
  }

  /** Release all tracked leases and disconnect. */
  async close(): Promise<void> {
    for (const lid of [...this.leases]) {
      try {
        await this.releaseLease(lid);
      } catch {
        // best-effort
      }
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.sessionId = null;
  }
}
