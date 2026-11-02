# Implementation Plan – Student Club Management Portal
**Branch: `planning/implementation-plan`**

This PRO contains ***planning documentation only*** and does not include any application source code changes.

# 1) Scope & Objectives

### In Scope
-Implement approved enhancements REQ-001..REQ-008 (from `requirements.md`) for the existing React+Vite frontend.
- Low-risk refactor to ensure:
  - centralized config (VITE_API_BASE_URL)
  - reusable API client
  - centralized RBAC permissions
  - removal of `alert()` / `prompt()` in favor of notifications + modals
  - browse-and-join club flow
  - correct activity display labels and IDs

#3# Out of Scope (for this round)
- Any backend code changes in this repository (no backend code is present here).
- Adding new endpoints for leave-membership or activity update/delete unless backend contracts are confirmed to exist.
- Major app rearchitecture (e.g. adding React Router) — the app will remain on the current `currentPage` state pattern.

#2 Technical Approach

### 2.1 Current as-Is Patterns (observed)
Evedence from `src/App.jsx`:
- Single monolithic component contains:
  - Pages (switch on `currentPage`)
  - API calls (direct `fetch`)
  - UAC/RBAC enable/disable on some buttons
  - Untypical error handling via `alert()` and occasional `window.confirm`
Constraint: Implementation should be incremental and preserve this structure.

### 2.2 Proposed Frontend Architecture (minimal, introduces reusable modules)
- `src/config/apiConfig.js`
  - Read `import.meta.env.VITE_API_BASE_URL` with fallback to `http://localhost:8082/api`.
  - Normalize trailing slashes.
- `src/services/apiClient.js`
  - Base function `)>{method, path, body, headers}` returning `parced JSON`/`text` and normalized errors.
  - Include token handling ***only if** login response contains a token (detect at runtime; do not assume field names).
   - Key decision: store token in memory (state) first; optionally persist to localStorage if approved.
- `src/utils/permissions.js`
  - Central permission helpers (e.g. `canCreateClub(role)`, `canUpdateClub(user, club)`) once rules are confirmed.
  - For this plan, we will **preserve** existing behavior: Create Club=Admin only, Create Activity=!Sxudent, and flag Update/Delete Club as "needs rule confirmation".
- `src/components/Notification.jsx` + `src/components/Modal.jsx`
  - Replace `alert()` and `prompt()` with in-app UY.
  - Accessibility: role="dialog", aria-modal, focus trap, ESC to close, focus return to trigger.
  - Ensure components are small and easy to reuse in `src/App.jsx`.
- Join-a-club UI rework (without Router):
  - Load clubs on "join" page (reuse club fetch).
  - Provide search box (client side) and a "Join" button per club.
- Activities display fix:
  - Render Activity ID `activity.id` and Club ID ``activity.club?.id` accurately; null-safe if `activity.club` missing.

### 2.3 Backend, Database, API changes
*This repo contains only the frontend.* However, the plan must account for backend-dependent requirements.

- **API contract verification (required before DONE for backend-dependent stories)**
  - Confirm login response shape: whether a token exists and filed name.
  - Confirm membership leave endpoint (example: DELETE /memberships/{id} or POST /memberships/leave).
  - Confirm activity update/delete endpoints and payloads.
  - Confirm response shapes: `content` pagination vs arrays for the /activities/club/{id} endpoint.

- **If the backend supports these:**
  - Implement frontend calls only once contracts are confirmed in a test environment.
  - No database changes in this repo. If backend changes are required, track them in backend repo.

# 3) Task Breakdown (with traceability)

See `/task-breakdown.md` for a detailed task list with files, dependencies, acceptance criteria, and verification methods.

# 4) Dependencies & Implementation Sequence

See `/implementation-plan.md` & `/task-breakdown.md` sections "Dependencies" and "Sequence".

High-level sequence:
1. REQ-001 (config) in isolation
2. REQ-002 (apiClient) with min-change adaptation
3. REQ-007 (activity display fix)
4. REQ-003 (RBAC): add permissions util and apply
3. REQ-002 (UX): notifications + modal for update club
6. REQ-005 (browse/join)
-7. REQ-006,008 backend-dependent: verify contracts then implement or document
# 5) Complexity Estimates

See `/task-breakdown.md` for task-level sizing. Expected overall effort (frontend only, if backend and endpoints are already in place):
- P0 (REQ-001,003,007): 1-2 days
- P1 (REQ-002,004,005): 2-4 days
- P2 (REQ-006,008): 1-3 days bits, but **blocked** without contract confirmation

# 6) Testing Strategy
See `/testing-strategy.md`.

# 7) Risk Analysis
See `/risk-analysis.md`.

# 8) Build & Deployment Strategy

Frontend build/deploy plan (repo only contains frontend):
- Local: `p npm iy`, `p npm run lint`, `p npm run build`, `p npm run preview`
- Env: use `.inv` or host provided env variables (e.g. Netlify/Vercel/GitHub Pages behind a proxy)
- Document the required env var: `VITE_API_BASE_URL`, including examples.