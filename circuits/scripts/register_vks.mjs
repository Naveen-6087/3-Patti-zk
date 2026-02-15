#!/usr/bin/env node

/**
 * Register Verification Keys with zkVerify (Kurier API)
 *
 * Reads binary VK files from circuits/target/, converts to hex,
 * and registers them with zkVerify's Kurier REST API.
 *
 * Saves vkHash results to circuits/target/vkHashes/ for later use
 * when submitting proofs with vkRegistered: true.
 *
 * Usage:
 *   node scripts/register_vks.mjs
 *
 * Environment:
 *   KURIER_API_KEY  — from .env or inline
 *   KURIER_API_URL  — defaults to testnet
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ───────────────────────────────────────────────────────────────────

const KURIER_API_KEY = process.env.KURIER_API_KEY || '92efdf3d9824533c81d831084ad3bf4d87052c52';
const KURIER_API_URL = process.env.KURIER_API_URL || 'https://api-testnet.kurier.xyz/api/v1';

const CIRCUITS = ['shuffle', 'deal', 'show'];

const TARGET_DIR = path.resolve(__dirname, '..', 'target');
const VK_HASHES_DIR = path.join(TARGET_DIR, 'vkHashes');

// ── Helpers ──────────────────────────────────────────────────────────────────

function bufferToHex(buffer) {
  return '0x' + Buffer.from(buffer).toString('hex');
}

function log(msg) {
  console.log(`[register_vks] ${msg}`);
}

function logError(msg) {
  console.error(`[register_vks] ERROR: ${msg}`);
}

// ── Register a single VK ────────────────────────────────────────────────────

async function registerVK(circuitName) {
  const vkPath = path.join(TARGET_DIR, `${circuitName}_vk`, 'vk');

  if (!fs.existsSync(vkPath)) {
    logError(`VK file not found: ${vkPath}`);
    logError(`Run 'bb write_vk' for the ${circuitName} circuit first.`);
    return null;
  }

  const vkBytes = fs.readFileSync(vkPath);
  const vkHex = bufferToHex(vkBytes);

  log(`${circuitName}: VK size = ${vkBytes.length} bytes (${vkHex.length} hex chars)`);

  const payload = {
    proofType: 'ultrahonk',
    vk: vkHex,
    proofOptions: {
      variant: 'ZK',
    },
  };

  const url = `${KURIER_API_URL}/register-vk/${KURIER_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      logError(`${circuitName}: API error (${response.status}): ${JSON.stringify(data)}`);
      return null;
    }

    log(`${circuitName}: VK registered! vkHash = ${data.vkHash}`);
    return data;
  } catch (error) {
    logError(`${circuitName}: ${error.message}`);
    return null;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('=== zkVerify VK Registration for Teen Patti ===');
  log(`API URL: ${KURIER_API_URL}`);
  log(`API Key: ${KURIER_API_KEY.slice(0, 8)}...`);
  log(`Target dir: ${TARGET_DIR}`);
  log('');

  // Create vkHashes directory
  if (!fs.existsSync(VK_HASHES_DIR)) {
    fs.mkdirSync(VK_HASHES_DIR, { recursive: true });
    log(`Created ${VK_HASHES_DIR}`);
  }

  const results = {};

  for (const circuit of CIRCUITS) {
    log(`\n--- Registering ${circuit} VK ---`);
    const data = await registerVK(circuit);

    if (data) {
      results[circuit] = data;

      // Save vkHash to file
      const hashFile = path.join(VK_HASHES_DIR, `${circuit}_vkHash.json`);
      fs.writeFileSync(hashFile, JSON.stringify(data, null, 2));
      log(`Saved to ${hashFile}`);
    } else {
      results[circuit] = { error: 'Registration failed' };
    }
  }

  // Save combined results
  const combinedFile = path.join(VK_HASHES_DIR, 'all_vkHashes.json');
  fs.writeFileSync(combinedFile, JSON.stringify(results, null, 2));
  log(`\n=== Combined results saved to ${combinedFile} ===`);

  // Summary
  log('\n=== Summary ===');
  for (const [circuit, data] of Object.entries(results)) {
    if (data.vkHash) {
      log(`  ${circuit}: ✓ ${data.vkHash}`);
    } else {
      log(`  ${circuit}: ✗ ${data.error || 'Failed'}`);
    }
  }
}

main().catch((err) => {
  logError(err.message);
  process.exit(1);
});
