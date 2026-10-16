"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRustAnalytics = runRustAnalytics;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const RUST_CORE_TIMEOUT_MS = 15000;
function getWorkspaceRoot() {
    const candidates = [
        process.cwd(),
        path_1.default.resolve(process.cwd(), '..'),
        path_1.default.resolve(__dirname, '..', '..'),
        path_1.default.resolve(__dirname, '..', '..', '..'),
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(path_1.default.join(candidate, 'rust-core', 'Cargo.toml'))) {
            return candidate;
        }
    }
    return process.cwd();
}
function resolveRustBinaryPath() {
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
            const p = path_1.default.join(workspaceRoot, 'rust-core', 'target', profile, name);
            if (fs_1.default.existsSync(p)) {
                return p;
            }
        }
    }
    // Default target path
    const defaultName = isWin ? 'verity_core.exe' : 'verity_core';
    return path_1.default.join(workspaceRoot, 'rust-core', 'target', 'release', defaultName);
}
async function runRustAnalytics(payload) {
    const binaryPath = resolveRustBinaryPath();
    const workspaceRoot = getWorkspaceRoot();
    if (!fs_1.default.existsSync(binaryPath)) {
        throw new Error(`Rust core binary not found at ${binaryPath}`);
    }
    return new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(binaryPath, [], {
            cwd: path_1.default.join(workspaceRoot, 'rust-core'),
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
            }
            catch (error) {
                reject(new Error(`Rust core returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
            }
        });
        const body = JSON.stringify(payload);
        child.stdin.write(body);
        child.stdin.end();
    });
}
