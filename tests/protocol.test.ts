import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { encodeFrame, decodeFrame, raiseOnError } from "../src/protocol";
import { VaultError, AccessDenied } from "../src/errors";

describe("encodeFrame / decodeFrame", () => {
  it("roundtrips a simple object", () => {
    const obj = { id: 1, method: "authenticate", params: { agent_name: "test" } };
    const frame = encodeFrame(obj);
    const [decoded, rest] = decodeFrame(frame);
    assert.deepStrictEqual(decoded, obj);
    assert.strictEqual(rest.length, 0);
  });

  it("encodes correct length prefix", () => {
    const obj = { hello: "world" };
    const frame = encodeFrame(obj);
    const length = frame.readUInt32BE(0);
    assert.strictEqual(length, frame.length - 4);
  });

  it("decodes multiple frames", () => {
    const a = { id: 1 };
    const b = { id: 2 };
    const data = Buffer.concat([encodeFrame(a), encodeFrame(b)]);
    const [first, rest1] = decodeFrame(data);
    assert.deepStrictEqual(first, a);
    const [second, rest2] = decodeFrame(rest1);
    assert.deepStrictEqual(second, b);
    assert.strictEqual(rest2.length, 0);
  });

  it("throws on incomplete header", () => {
    assert.throws(() => decodeFrame(Buffer.from([0, 0])), VaultError);
  });

  it("throws on incomplete body", () => {
    const header = Buffer.alloc(4);
    header.writeUInt32BE(100);
    assert.throws(
      () => decodeFrame(Buffer.concat([header, Buffer.from("short")])),
      VaultError,
    );
  });
});

describe("raiseOnError", () => {
  it("does nothing when no error", () => {
    raiseOnError({ id: 1, result: {} });
  });

  it("throws on string error", () => {
    assert.throws(
      () => raiseOnError({ id: 1, error: "something went wrong" }),
      VaultError,
    );
  });

  it("throws typed error for structured error", () => {
    assert.throws(
      () =>
        raiseOnError({
          id: 1,
          error: {
            code: "ACCESS_DENIED",
            message: "not allowed",
            detail: "policy forbids",
          },
        }),
      AccessDenied,
    );
  });
});
