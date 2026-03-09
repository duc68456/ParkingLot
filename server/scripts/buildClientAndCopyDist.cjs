#!/usr/bin/env node
/*
  Cross-platform build helper:
  - installs + builds the Vite client (../client)
  - copies ../client/dist -> ./dist

  Works on Windows + Linux (Render).
*/

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(cmd, args, options = {}) {
  const pretty = [cmd, ...args].join(' ');
  console.log(`\n> ${pretty}`);
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  if (res.status !== 0) {
    process.exit(res.status ?? 1);
  }
}

function rmDirIfExists(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);

    if (e.isDirectory()) {
      copyDir(from, to);
    } else if (e.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(from);
      fs.symlinkSync(linkTarget, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

const serverDir = path.resolve(__dirname, '..');
const clientDir = path.resolve(serverDir, '..', 'client');
const clientDist = path.resolve(clientDir, 'dist');
const serverDist = path.resolve(serverDir, 'dist');

if (!fs.existsSync(clientDir)) {
  console.error(`Client directory not found: ${clientDir}`);
  process.exit(1);
}

// IMPORTANT (Render): client build needs devDependencies (vite).
// Some hosts set NODE_ENV=production which can cause `npm ci` to omit dev deps.
// We force dev deps via `--include=dev`.
const hasLock = fs.existsSync(path.join(clientDir, 'package-lock.json'));

if (hasLock) {
  run('npm', ['ci', '--include=dev'], { cwd: clientDir });
} else {
  run('npm', ['install', '--include=dev'], { cwd: clientDir });
}
run('npm', ['run', 'build'], { cwd: clientDir });

if (!fs.existsSync(clientDist)) {
  console.error(`Client build output not found: ${clientDist}`);
  process.exit(1);
}

rmDirIfExists(serverDist);
copyDir(clientDist, serverDist);

console.log(`\nCopied ${clientDist} -> ${serverDist}`);
