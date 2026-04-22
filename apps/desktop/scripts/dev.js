#!/usr/bin/env node
// Wrapper to clear ELECTRON_RUN_AS_NODE before launching electron-vite dev.
// This is needed when running from environments like Claude Code that set this flag.
'use strict';
const { spawnSync } = require('child_process');

delete process.env.ELECTRON_RUN_AS_NODE;

const result = spawnSync('electron-vite', ['dev'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

process.exit(result.status ?? 0);
