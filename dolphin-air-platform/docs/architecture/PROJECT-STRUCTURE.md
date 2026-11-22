# Project Structure

A pnpm/Turborepo monorepo separates the internal CRM, public and self-service portal, central API, and asynchronous worker. Shared packages live under `packages/`; database, infrastructure, docs, scripts, and end-to-end test foundations live at the root.

Stage 1 creates boundaries and minimal application shells. Feature folders contain no business functionality.
