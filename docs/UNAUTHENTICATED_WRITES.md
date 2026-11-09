# Endpoints that are disabled until the backend has authentication

The backend cannot tell who is calling it: login does not check passwords and returns no token.
Three endpoints change data that belongs to someone else, so they are **off by default** and answer
`403` with an explanatory message:

| Endpoint | What it does |
|----------|--------------|
| `DELETE /api/memberships/user/{userId}/club/{clubId}` | Removes a user from a club |
| `PUT /api/activities/{id}` | Changes an activity |
| `DELETE /api/activities/{id}` | Deletes an activity |

Reads, joining a club, creating clubs and activities, and CORS preflight requests are not affected.

## Local development only

Set the switch before starting the backend (PowerShell):

```powershell
$env:APP_ENABLE_UNAUTHENTICATED_WRITES = "true"
./mvnw spring-boot:run
```

The application logs a warning at startup when it is on. The property behind it is
`app.unauthenticated-writes.enabled` (default `false`).

## This is not access control

The switch only prevents these endpoints from being exposed by accident. **When it is on, any caller can
use them for any user or activity.** Do not enable it on a shared, staging or production system.

The frontend's role rules (for example Admin-only activity edit/delete) are UI-only and do not protect
the backend. Real protection needs authentication (password checks, a signed token) and server-side
role checks; that has not been built.

## Effect on the frontend

With the switch off, the frontend's Leave and activity Edit/Delete actions show the 403 message instead
of working.
