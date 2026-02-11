import { SanctumClient } from "sanctum-ai";

async function main() {
  const client = new SanctumClient("my-agent");
  await client.connect();

  try {
    // List available credentials
    const creds = await client.list();
    console.log("Available credentials:", creds);

    // Retrieve a secret
    const apiKey = await client.retrieve("openai/api_key");
    console.log("Got API key:", apiKey.slice(0, 8) + "...");

    // Use-not-retrieve pattern
    const result = await client.use("openai/api_key", "http_header");
    console.log("Header:", result);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
