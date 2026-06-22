#!/usr/bin/env node

const DEFAULT_LOCAL_BOOTSTRAP_SECRET = "trophy-local-bootstrap";

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : undefined;
}

function readOption(name, envName) {
  return readArg(name) || process.env[envName];
}

function isLoopbackUrl(value) {
  try {
    const { hostname } = new URL(value);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

function resolveBootstrapSecret(url, explicitSecret) {
  if (explicitSecret) {
    return explicitSecret;
  }

  return isLoopbackUrl(url) ? DEFAULT_LOCAL_BOOTSTRAP_SECRET : undefined;
}

function buildSeedEmail(username) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

async function readErrorMessage(response) {
  const body = await response.text();
  if (!body) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed?.message === "string") {
      return parsed.message;
    }
  } catch {
    // Fall through to raw text.
  }

  return body;
}

async function main() {
  const url = readOption("url", "ADMIN_SEED_URL") || "http://localhost:8787";
  const username = readOption("username", "ADMIN_SEED_USERNAME");
  const password = readOption("password", "ADMIN_SEED_PASSWORD");
  const bootstrapSecret = resolveBootstrapSecret(url, readOption("secret", "ADMIN_SEED_SECRET"));

  if (!username) {
    throw new Error("Missing admin username. Set ADMIN_SEED_USERNAME or pass --username=...");
  }

  if (!password) {
    throw new Error("Missing admin password. Set ADMIN_SEED_PASSWORD or pass --password=...");
  }

  if (!bootstrapSecret) {
    throw new Error(
      "Missing bootstrap secret. Set ADMIN_SEED_SECRET or use a loopback URL such as http://127.0.0.1:8787."
    );
  }

  const response = await fetch(`${url.replace(/\/$/, "")}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      password,
      bootstrapSecret,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      console.log("Admin bootstrap is already complete.");
      return;
    }

    throw new Error(await readErrorMessage(response));
  }

  const payload = await response.json();
  const createdUsername = payload?.user?.username || username;
  console.log(`Seeded admin account: ${createdUsername} (${buildSeedEmail(createdUsername)})`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
