# Student Club Management Portal - Frontend

React 19 + Vite single-page app for the Club Management backend (Spring Boot, `back_end` branch).
The app keeps a simple `currentPage` state (no router).

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run lint
npm test          # Vitest + React Testing Library (one-shot)
npm run test:watch
npm run build
npm run preview
```

## Configuration: backend URL (`VITE_API_BASE_URL`)

The backend base URL (including the `/api` prefix) is read from the Vite environment
variable `VITE_API_BASE_URL` in `src/config/apiConfig.js`.

- If it is unset or blank, the app falls back to `http://localhost:8082/api`.
- Trailing slashes are removed, so `https://host/api/` and `https://host/api` are equivalent.
- Vite inlines the value at **build time**, so set it before `npm run build`
  (or restart `npm run dev` after changing it). Only variables prefixed with `VITE_` are exposed.
- See `.env.example` for a template.

| Environment | Where to set it | Example value |
| ----------- | --------------- | ------------- |
| Development | `.env.local` (or nothing - the fallback applies) | `VITE_API_BASE_URL=http://localhost:8082/api` |
| Staging | CI/host build environment, or `.env.staging` with `vite build --mode staging` | `VITE_API_BASE_URL=https://stage-api.example.com/api` |
| Production | CI/host build environment, or `.env.production` | `VITE_API_BASE_URL=https://api.example.com/api` |

Example staging build: `VITE_API_BASE_URL=https://stage-api.example.com/api npm run build`

> Note: the backend currently restricts CORS to `http://localhost:5173` (`@CrossOrigin` on its
> controllers). Using any other frontend origin requires a backend change (backend repo).

## Code layout

| Path | Purpose |
| ---- | ------- |
| `src/config/apiConfig.js` | `VITE_API_BASE_URL` resolution + normalization (REQ-001) |
| `src/services/apiClient.js` | `fetch` wrapper: base URL, JSON, error normalization (REQ-004) |
| `src/utils/permissions.js` | All role-based UI permission checks (REQ-003) |
| `src/hooks/useNotifications.js`, `src/components/Notification.jsx` | In-app notifications replacing `alert()` (REQ-002) |
| `src/components/Modal.jsx`, `RenameClubModal.jsx`, `ConfirmDialog.jsx` | Accessible dialogs replacing `prompt()` / `confirm()` (REQ-002) |
| `src/components/ClubBrowser.jsx`, `src/utils/clubSearch.js` | Browse / search / join clubs (REQ-005) |
| `src/components/ActivityItem.jsx`, `src/utils/activity.js` | Null-safe activity display (REQ-007) |

## Permission rules (UI)

Defined only in `src/utils/permissions.js`. The rules below are confirmed by the product
owner. The backend performs **no** role or ownership checks, so the UI is the only gate.

| Action | Rule |
| ------ | ---- |
| Create Club | `Admin` only |
| Update Club / Delete Club | `Admin` only (confirmed); Leaders and Students see the controls disabled |
| Create Activity | any logged-in user except `Student` (Admin, Leader) |
| Join Club | any logged-in user |
| Leave Club | any logged-in user, own membership only |
| Update Activity / Delete Activity | Admin only |

The registration form only offers `Student` and `Leader`; `Admin` accounts are not self-service. This is a UI choice only: the backend `/register` still accepts any role in the request body, so it does not prevent anyone from creating an Admin by calling the API directly.

## Backend contract notes and known limitations

Verified against the `back_end` branch (`AuthController`, `ClubController`,
`MembershipController`, `ActivityController`):

- **Authentication / token (REQ-004):** `POST /api/auth/login` returns the plain `User`
  entity (`id`, `username`, `email`, `role`, ...) and **no token**. The backend does not
  verify the password and has no Spring Security. The api client therefore sends **no**
  `Authorization` header. Add token support only after the backend defines a token field
  and header format.
- **Leave club (REQ-006):** uses `DELETE /api/memberships/user/{userId}/club/{clubId}`
  (204 on success, 404 if the user, club or membership is not found). This endpoint is added
  by backend PR #6 and **requires that backend**; against an older backend the request fails
  and the UI shows the error. "My Memberships" has a Leave button (with a confirmation dialog)
  on every membership of the logged-in user.
- **Activity update / delete (REQ-008):** use `PUT /api/activities/{id}` with
  `{ title, description, date }` (200 with the activity, 400 if the title is blank, 404 if not
  found; the club cannot be changed) and `DELETE /api/activities/{id}` (204 / 404). Both are
  added by backend PR #6 and require that backend. The activities list has Edit (dialog) and
  Delete (confirmation dialog) buttons.
- **Authorization for these three actions is UI-only:** the backend has no authentication and
  cannot verify who is calling.
- **Activity fields:** the backend `Activity` has `title` (not `name`), `description`, `date`
  and `club`. The create form now sends `title`.
- **Club rename:** `PUT /clubs/{id}` overwrites `name`, `description` and `leader`, so the UI
  sends the existing description and leader back along with the new name.
- **Pagination:** list endpoints return Spring `Page` objects (default page size 10). The club
  lists show a "Load more clubs" button while more pages exist.
- **Register:** for a duplicate username the backend answers HTTP 200 with a plain-text message;
  the UI treats a text response as a failure.
