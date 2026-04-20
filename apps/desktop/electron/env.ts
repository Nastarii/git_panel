import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'

// Fallback client ID — a GitHub OAuth App with "Enable Device Flow" enabled.
// Can be overridden by GITHUB_CLIENT_ID in .env (dev) or at build time.
const DEFAULT_CLIENT_ID = ''

type EnvConfig = {
  githubToken: string | null       // PAT path: dev sets GITHUB_TOKEN in .env
  githubClientId: string | null    // Device-flow path
  gitpanelApiUrl: string | null
}

let cached: EnvConfig | null = null

function loadDotEnv(): void {
  if (app.isPackaged) return // packaged builds have no .env — rely on OAuth device flow

  // Try apps/desktop/.env relative to cwd (dev) and to __dirname (just in case)
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.development'),
    path.join(process.cwd(), 'apps/desktop/.env'),
    path.join(process.cwd(), 'apps/desktop/.env.development'),
  ]
  for (const file of candidates) {
    if (fs.existsSync(file)) dotenv.config({ path: file, override: false })
  }
}

export function getEnv(): EnvConfig {
  if (cached) return cached
  loadDotEnv()
  cached = {
    githubToken: process.env['GITHUB_TOKEN']?.trim() || null,
    githubClientId: process.env['GITHUB_CLIENT_ID']?.trim() || DEFAULT_CLIENT_ID || null,
    gitpanelApiUrl: process.env['GITPANEL_API_URL']?.trim() || null,
  }
  return cached
}

export function resetEnvCache(): void {
  cached = null
}
