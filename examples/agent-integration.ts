import { SanctumClient, AccessDenied, LeaseExpired, VaultError } from "sanctum-ai";

async function runAgent() {
  const client = new SanctumClient("research-agent", {
    host: "127.0.0.1",
    port: 8200,
  });

  try {
    await client.connect();

    // Retrieve with TTL
    const apiKey = await client.retrieve("anthropic/api_key", 300);
    console.log(`Got key (5 min lease): ${apiKey.slice(0, 8)}...`);

    // List credentials
    const creds = await client.list();
    console.log("Credentials:", creds.map((c) => c.path));

    // Use-not-retrieve
    const result = await client.use("openai/api_key", "http_header");
    console.log("Use result:", result);
  } catch (e) {
    if (e instanceof AccessDenied) {
      console.error(`Access denied: ${e.message} (suggestion: ${e.suggestion})`);
    } else if (e instanceof LeaseExpired) {
      console.error(`Lease expired: ${e.message}`);
    } else if (e instanceof VaultError) {
      console.error(`Vault error [${e.code}]: ${e.message}`);
    } else {
      throw e;
    }
  } finally {
    await client.close();
  }
}

runAgent();
