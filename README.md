# SOP Creator by Duvo

Describe any operational process in plain English — get a complete Standard Operating Procedure with visual workflow, role assignments, time estimates, automation scoring, and stakeholder validation.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **Claude API** (claude-sonnet-4-20250514) with streaming
- **Resend** for stakeholder invite emails (optional)

## Setup

```bash
npm install
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for SOP generation |
| `RESEND_API_KEY` | No | Resend API key for email invites (falls back to copy-link) |
