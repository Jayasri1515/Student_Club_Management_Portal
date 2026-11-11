# Student Club Management Portal

A simple web portal to manage student clubs, memberships, and club activities.

This repository uses *separate branches* for frontend and backend:
- `front_end` – React + Vite frontend (default branch)
- `back_end` – Spring Boot REST backend (separate branch)

> Workflow 3 documentation scources of truth: see Confluence pages listed in the repo’s Workflow 3 documentation section.

## Key features (as implemented)

- User registration and login *(security limitations apply; see below)*
- Clubs: list (paged), create, update, delete (UI gated by role)
- Activities: list (paged), list by club, create (update/delete depends on un-merged backend work – see below)
- Memberships: join a club; view my memberships (leave depends on un-merged backend work –  see below)

## Technology stack (verified from repo)

### Frontend (`front_end`)
- React `^19.1.1`
- Vite `^7.1.2`
- ESModules (`" type": "module"`)
- ESLint `^9.33.0`
- Tailwind CSS `d4.1.11` (installed dependency)

- Note: the `front_end` branch does *not* define an `npm test` script or test dependencies. Tests are present only in un-merged PR #5.