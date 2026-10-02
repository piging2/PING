// lib/federation/keys.ts
//
// Federation TRANSPORT keys. These keys sign HTTP delivery (RSA, legacy
// interop) and Object Integrity Proofs (Ed25519, FEP-8b32). They are NOT PING
// identity keys. The PING actor signing key (owned by IdentityAuthority) never
// enters this module.
//
// Production: keys persist as JWK files under PING_FEDERATION_KEY_DIR,
// one subdirectory per identifier. Keys are generated once and reused.
// Dev: when the dir is unset and NODE_ENV is not production, ephemeral keys
// are generated per boot with a loud warning. Production refuses to boot
// without PING_FEDERATION_KEY_DIR.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map<string, CryptoKeyPair[]>();

async function generatePairs(): Promise<CryptoKeyPair[]> {
  const rsa = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const ed = await crypto.subtle.generateKey({ name: "Ed25519" }, true, [
    "sign",
    "verify",
  ]);
  return [rsa as CryptoKeyPair, ed as CryptoKeyPair];
}

async function persistPair(dir: string, name: string, pair: CryptoKeyPair): Promise<void> {
  await mkdir(dir, { recursive: true });
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  await writeFile(path.join(dir, `${name}.public.jwk`), JSON.stringify(pub));
  await writeFile(path.join(dir, `${name}.private.jwk`), JSON.stringify(priv), {
    mode: 0o600,
  });
}

async function loadPair(dir: string, name: string): Promise<CryptoKeyPair | null> {
  let pubJwk: JsonWebKey;
  let privJwk: JsonWebKey;
  try {
    pubJwk = JSON.parse(await readFile(path.join(dir, `${name}.public.jwk`), "utf8"));
    privJwk = JSON.parse(await readFile(path.join(dir, `${name}.private.jwk`), "utf8"));
  } catch {
    return null;
  }
  const alg = name === "rsa"
    ? {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      }
    : { name: "Ed25519" };
  const publicKey = await crypto.subtle.importKey("jwk", pubJwk, alg as AlgorithmIdentifier, true, [
    "verify",
  ]);
  const privateKey = await crypto.subtle.importKey("jwk", privJwk, alg as AlgorithmIdentifier, true, [
    "sign",
  ]);
  return { publicKey, privateKey };
}

async function loadOrCreateKeys(dir: string): Promise<CryptoKeyPair[]> {
  const rsa = await loadPair(dir, "rsa");
  const ed = await loadPair(dir, "ed25519");
  if (rsa && ed) return [rsa, ed];
  const [newRsa, newEd] = await generatePairs();
  await persistPair(dir, "rsa", newRsa);
  await persistPair(dir, "ed25519", newEd);
  console.warn(
    `[federation] generated new transport key pair in ${dir}; back this directory up, keys are long-lived.`,
  );
  return [newRsa, newEd];
}

export async function getTransportKeyPairs(identifier: string): Promise<CryptoKeyPair[]> {
  const hit = cache.get(identifier);
  if (hit) return hit;
  const dir = process.env.PING_FEDERATION_KEY_DIR;
  let pairs: CryptoKeyPair[];
  if (dir) {
    pairs = await loadOrCreateKeys(path.join(dir, identifier));
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PING_FEDERATION_KEY_DIR must be set in production; refusing ephemeral transport keys.",
      );
    }
    console.warn(
      `[federation] PING_FEDERATION_KEY_DIR unset: generating EPHEMERAL dev transport keys for "${identifier}". They change on every restart. Dev only.`,
    );
    pairs = await generatePairs();
  }
  cache.set(identifier, pairs);
  return pairs;
}
