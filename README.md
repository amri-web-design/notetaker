# Notetaker Settings Preview

Prototype preview of the enhanced "Automatically invite AIRA Notetaker to" settings section. Built as a standalone Vite + React + TypeScript app so the dev team can see the design and interactions live.

## What's in here

A self-contained copy of the new section:

- Toggle for auto-invite
- "Primary Trigger" dropdown with the six PRD-defined options
- "Owner criteria" dropdown
- Helper text block
- Smart Exclusion Filters:
  - "Exclude if BOTH candidate AND contact are invited" checkbox with `RECOMMENDED` badge
  - Domain / email exclusion chip input with Enter-to-add, click-× to remove, and format validation (valid domains like `example.co.uk`, valid emails like `user+tag@example.com`)

All interactions use local React state. No Redux, no API, no auth — nothing to configure.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`).

## Deploy

This repo is set up for Vercel's auto-detection: it's a plain Vite project. Import the repo into Vercel and it'll just work — build command `npm run build`, output directory `dist`.
