# Technical Debt

This file tracks TODOs and placeholders converted from inline comments during stabilization.

- Migrations: The IndexedDB schema is created via `openIndexedDB` and `runMigrations()` is a no-op placeholder. Implement a migration strategy for schema evolution and store versioning to support future upgrades.
  - File: `js/database/migrations.js`
  - Priority: Medium
  - Notes: Required when introducing breaking changes to the `memories`, `conversations`, or `invertedIndex` stores.

- Further manual review recommended for any remaining `TODO`/`FIXME` comments that were intentionally left in tests or third-party code.

- Tests contain console.log debug output which was intentionally preserved to avoid changing test behaviors. Consider replacing with test assertions or test-specific logging utilities.
  - Files: `js/chat/tests/*`, `js/rag/tests/*`
  - Priority: Low

- Backend EventBus: several backend routes now emit errors via `backend/lib/eventBus`. There is no consumer configured to persist or expose these events. Consider adding a logger or attaching listeners in dev/prod environments.
  - Priority: Low

