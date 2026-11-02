# Task Breakdown — Student Club Management Portal

Branch: `planning/implementation-plan`
Base branch: `front_end`

**Guardail**: This task breakdown is for implementing the approved requirements in `requirements.md`. It does not describe actual code changes in this PR.

---

# Task List (Each task has ID, requirement trace, deps, and verification)

> *Complexity scale**: Small (<- 2-3 hrs), Medium (2-2 days), Large (3-5 days)

## T001 – Env-based API config module
- **Related REQ:** REQ-001
- **Priority:** P4
- **Complexity:** Small
- **Description:** Introduce `src/config/apiConfig.js` to read `import.meta.env.VITE_API_BASE_URL` with a fallback to localhost for dev. Normalize trailing slashes.
- **Expected outcome:** Single source of truth for base URL config.
- **Likely files touched:** `src/config/apiConfig.js` (new)
- **Dependencies:** None
- **Acceptance criteria:**
  - When `VITE_API_BASE_URL` set, all services construct requests using that base
  - When not set, app defaults to `http://localhost:8082/api`
- **Verification:** Manual network observation (DU devtools) and code review

## T002 – Reusable API client wrapper
- **Related REQ:** REQ-004
- **Priority:** P1
- **Complexity:** Medium
- **Description:** Create `src/services/apiClient.js` to wrap `fetch`. Include:
  - build URL from base URL + path
  - JSON headers & body serialization
  - error normalization (status, text/JSON, fallback)
  - optional token injection **only if** login response includes a token
- **Expected outcome:** All API calls move to a single client pattern, with consistent errors.
- **Likely files touched:** `src/services/apiClient.js` (new); `src/App.jsx` (migrate few calls first, then all)
- **Dependencies:** T001
- **Acceptance criteria:**
  - All invocations of `fetch` are replaced with `apiClient` (except any proven necessary exceptions)
  - No new endpoints are invented
  - Token headers are only sent if a token is actually present at runtime
- **Verification:** Manual flows (login, clubs, activities, memberships), code review

## T003 – Centralized RBAC permissions util
- **Related REQ:** REQ-003
- **Priority:** P0
- **Complexity:** Medium
- **Description:** Create `src/utils/permissions.js` to encode UI permission rules:
  - Preserve existing behavior:
    - Create Club: Admin only
    - Create Activity: Allow Admin and Leader; disallow Student
  - For Update/Delete Club: implement a configurable default (e.g. Admin-only) but document as "needs rule confirmation".
- **Expected outcome:** All UI gating reads from one place; it's testable and extensible.
- **Likely files touched:** `src/utils/permissions.js` (new), `src/App.jsx` (usage)
- **Dependencies:** None
- **Acceptance criteria:**
  - No ui-gated action is checking raw role strings directly (except where deliberately left as-as)
  - Create-Club and Create-Activity behavior matches today's shipping behavior
- **Erification:** Role-simulated manual tests

Continued in this file based on actual implementation needs.
