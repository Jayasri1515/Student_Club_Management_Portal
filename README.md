# Student Club Management Portal

A React-based web application for managing student clubs, club activities, and student memberships. The frontend communicates with a backend API to authenticate users and perform club and activity operations.

> **Branch note:** This README describes the application currently present on the `front_end` branch. Features available only in other unmerged pull requests are not included here.

## Features

- User registration and login.
- View the club list.
- Create, rename, and delete clubs.
- View activities and activities associated with a club.
- Create activities.
- Join a club.
- View the logged-in user's club memberships.

The application presents a dashboard after login and provides separate views for club management, activity management, joining clubs, and memberships.

## Technology stack

- **React** 19
- **Vite** 7
- **JavaScript** (ES modules)
- **ESLint** 9
- **Tailwind CSS** 4 is included as a project dependency.

## Prerequisites

- Node.js and npm.
- The Student Club Management Portal backend API running and reachable by the frontend.

## Getting started

1. Clone the repository and switch to the frontend branch:

   ```bash
   git clone https://github.com/Jayasri1515/Student_Club_Management_Portal.git
   cd Student_Club_Management_Portal
   git checkout front_end
   ```

2. Install the frontend dependencies:

   ```bash
   npm install
   ```

3. Start the Vite development server:

   ```bash
   npm run dev
   ```

4. Open the local URL printed by Vite in your browser (typically `http://localhost:5173`).

## Backend configuration

The frontend currently defines its API base URL directly in `src/App.jsx`:

```js
const API_BASE_URL = 'http://localhost:8082/api';
```

Make sure the backend is available at that address before using features that require server data. If your backend runs at a different host or port, update this constant in `src/App.jsx` to match the backend URL.

The frontend expects the club and activity list endpoints to return paginated responses containing a `content` array. The memberships endpoint is read as a list.

## API endpoints used by this frontend

The following paths are called by the current frontend. They are relative to the API base URL shown above.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/login` | Log in a user |
| POST | `/auth/register` | Register a user |
| GET | `/clubs/getclubs` | Retrieve clubs |
| POST | `/clubs` | Create a club |
| PUT | `/clubs/{id}` | Update a club |
| DELETE | `/clubs/{id}` | Delete a club |
| GET | `/activities/getactivities` | Retrieve activities |
| GET | `/activities/club/{clubId}` | Retrieve activities for a club |
| POST | `/activities` | Create an activity |
| POST | `/memberships/join` | Join a club |
| GET | `/memberships/user/{userId}` | Retrieve a user's memberships |

The backend must implement these routes and accept the request/response formats used by the frontend.

## Available scripts

Run these commands from the frontend project directory:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

There is currently no test script defined in the `front_end` branch's `package.json`.

## Project structure

```text
.
├── public/
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── eslint.config.js
```

## Current limitations

- The API base URL is hardcoded in `src/App.jsx`; it is not currently read from an environment variable.
- The frontend requires a compatible backend API to perform login, registration, club, activity, and membership operations.
- The current frontend branch does not define an automated test command in `package.json`.
- A successful frontend build does not verify that the backend, database, or end-to-end application flow is working.

## Build

To create the production frontend bundle:

```bash
npm run build
```

The generated files are written to the `dist/` directory.
