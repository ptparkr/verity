import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const RUST_CORE_TIMEOUT_MS = 15000;

function getWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'rust-core', 'Cargo.toml'))) {
      return candidate;
    }
  }

  return process.cwd();
}

function resolveRustBinaryPath(): string {
  if (process.env.RUST_CORE_BINARY) {
    return process.env.RUST_CORE_BINARY;
  }

  const workspaceRoot = getWorkspaceRoot();
  const isWin = process.platform === 'win32';

  const binaryNames = isWin
    ? ['verity_core.exe', 'karma_yoga_core.exe']
    : ['verity_core', 'karma_yoga_core'];

  for (const profile of ['release', 'debug']) {
    for (const name of binaryNames) {
      const p = path.join(workspaceRoot, 'rust-core', 'target', profile, name);
      if (fs.existsSync(p)) {
        return p;
      }
    }
  }

  // Default target path
  const defaultName = isWin ? 'verity_core.exe' : 'verity_core';
  return path.join(workspaceRoot, 'rust-core', 'target', 'release', defaultName);
}

export async function runRustAnalytics(payload: unknown): Promise<unknown> {
  const binaryPath = resolveRustBinaryPath();
  const workspaceRoot = getWorkspaceRoot();

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Rust core binary not found at ${binaryPath}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [], {
      cwd: path.join(workspaceRoot, 'rust-core'),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Rust core analytics timed out.'));
    }, RUST_CORE_TIMEOUT_MS);

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      stdout += chunk;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });

    child.on('error', error => {
      clearTimeout(timer);
      reject(new Error(`Rust core process failed to start: ${error.message}`));
    });

    child.on('close', code => {
      clearTimeout(timer);

      if (code !== 0) {
        reject(new Error(`Rust core exited with code ${code}. ${stderr.trim()}`.trim()));
        return;
      }

      try {
        const parsed = stdout.trim() ? JSON.parse(stdout) : null;
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Rust core returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });

    const body = JSON.stringify(payload);
    child.stdin.write(body);
    child.stdin.end();
  });
}