/**
 * Wire-level helpers for the Sanctum JSON-RPC protocol.
 * Framing: 4-byte big-endian length prefix + JSON payload.
 */

import type { RpcResponse, StructuredError } from "./types";
import { VaultError, CODE_TO_ERROR } from "./errors";

const MAX_MESSAGE_SIZE = 4 * 1024 * 1024; // 4 MiB

/** Encode a JSON object into a length-prefixed frame. */
export function encodeFrame(obj: Record<string, unknown>): Buffer {
  const payload = Buffer.from(JSON.stringify(obj));
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  return Buffer.concat([header, payload]);
}

/** Decode a length-prefixed frame from a buffer. Returns [parsed, remaining]. */
export function decodeFrame(
  data: Buffer,
): [Record<string, unknown>, Buffer] {
  if (data.length < 4) {
    throw new VaultError("Incomplete frame header", { code: "INTERNAL_ERROR" });
  }
  const length = data.readUInt32BE(0);
  if (length > MAX_MESSAGE_SIZE) {
    throw new VaultError("Response too large", { code: "INTERNAL_ERROR" });
  }
  if (data.length < 4 + length) {
    throw new VaultError("Incomplete frame body", { code: "INTERNAL_ERROR" });
  }
  const obj = JSON.parse(data.subarray(4, 4 + length).toString());
  return [obj, data.subarray(4 + length)];
}

/** Throw a typed error if the RPC response contains an error. */
export function raiseOnError(resp: RpcResponse): void {
  const err = resp.error;
  if (err == null) return;

  if (typeof err === "string") {
    throw new VaultError(err);
  }

  const structured = err as StructuredError;
  const code = structured.code ?? "INTERNAL_ERROR";
  const Cls = CODE_TO_ERROR[code] ?? VaultError;
  throw new Cls(structured.message ?? "Unknown error", {
    code,
    detail: structured.detail,
    suggestion: structured.suggestion,
    docsUrl: structured.docs_url,
    context: structured.context ?? {},
  });
}
