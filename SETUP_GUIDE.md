# Setup Guide

## Requirements
- Node.js 20+
- npm
- A buyer-owned Supabase project

## Install
```bash
npm install
npm run dev
```

## Environment
Create `.env.local` locally. Never commit it. Required names depend on enabled integrations; inspect runtime configuration and deployment settings before copying values. Public Supabase URL/anon values may be used client-side; service-role values must remain server-only.

## Database
Apply repository Supabase migrations to the target buyer-owned project in order. Regenerate database types when the schema changes.

## Verification
```bash
npm test
npm run lint
npm run build
```
