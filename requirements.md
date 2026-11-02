# Approved Enhancement Requirements (from Requirements Analysis Assistant)

Repo: `Jayasri1515/Student_Club_Management_Portal`
Branch: `front_end`


> **Note:** This file captures the approved enhancement requirements previously generated and agreed in the project conversation. Intentionally no app source code is changed by this commit.

---

## REQ-001 — API configuration by env variable (P0)
**(Configurability)**
- Replace the hard-coded backend base URL (currently `http://localhost:8082/api`) with a Vite environment variable `VITE_API_BASE_URL`.
  - Provide a safe fallback for local development if the var is not set.
- Document the variable in README. md (examples for dev/stage/prod).

## REQ-002 – UX: replace browser alert/ prompt (P1)
**(Usability & Accessibility)**
- Replace all usages of `alert()` with non-blocking inline notifications (success/error/info).
  - Example: toast style or card-based alert area in the uI.
- Replace the club rename `Prompt()` with a modal form (validation, cancel, submit).
- Make state changes and error states clear to the user without losing context.

## REQ-003 – Role-based access control in UI. (P0)
**(Security / Governance)**
- Centralize permission checks (Admin/Leader/Student) in a single module.
- Apply permissions consistently across:
  - Create club
  - Update club
  - Delete club
   - Create activity (and future update/delete if added)
- Verify existing behavior before changing permissions; do not invent policy.
  - If backend enforces different subject-ownership rules (e.g. Leader can edit only their own clubs), the UI should match.

## REQ-004 – API: introduce apiClient + token support if available (P1)
**(Reliability / Maintainability)**
- Introduce a reusable api client wrapper for:
  - base URL, headers, JSON serialization
  - consistent error handling and error message normalization
- Add token handling only if the backend actually returns an auth token on login.
  - Do **not** assume field name or header format without verification.
  - If no token is returned, the api client must operate without Authorization headers.

## REQ-005 – Club membership: browse/search and join (instead of manual ID) (P1)
**(User Journey)**
- Add a screen or section that lists available clubs (from existing clubs endpoint).
  - Provide optional search/filter by club name/description.
- Provide a Join button per club, so the user does not need to know the club ID.
- Use the existing membership join endpoint and payload structure.

## REQ-006 – Club membership: leave club (backend-dependent) (P2)
**(Backend Dependency)**
 - Investigate whether the backend provides an endpoint to leave a club (delete membership).
 - If supported, implement a "Lave" action in "“My Memberships” page.
- If *not* supported, document the limitation and do not invent endpoints.

## REQ-007 – Activity display fix (P0)
**(Data Correctness)**
- Correct activity rendering so that Activity ID and Club ID are displayed accurately.
- Fix labels and data binding (e.g. do not display club ID using the activity id).
 - Handle missing fields gracefully (e.g. if club object is null).

## REQ-008 – Activity management: update/delete (backend-dependent) (P2)
**(Backend Dependency)**
 - Investigate whether the backend provides endpoints to update and/or delete activities.
 - If supported, implement UP controls and RBAC to edit/delete activities.
 - If *not* supported, document the limitation and do not invent endpoints.
