# Database configuration

Database credentials are **not** stored in the repository. The application reads
them from the environment at startup.

| Variable      | Required | Default                                 | Purpose              |
|---------------|----------|-----------------------------------------|----------------------|
| `DB_USERNAME` | yes      | none                                    | MySQL user           |
| `DB_PASSWORD` | yes      | none                                    | MySQL password       |
| `DB_URL`      | no       | `jdbc:mysql://localhost:3306/club_db`   | JDBC connection URL  |

If `DB_USERNAME` or `DB_PASSWORD` is missing or blank, startup fails immediately with:

```
Missing required database configuration: DB_USERNAME, DB_PASSWORD. Set these environment variables ...
```

## Running locally

Option A - environment variables (PowerShell):

```powershell
$env:DB_USERNAME = "<your-db-user>"
$env:DB_PASSWORD = "<your-db-password>"
./mvnw spring-boot:run
```

Option B - git-ignored local profile:

1. Copy `src/main/resources/application-local.properties.example` to
   `src/main/resources/application-local.properties` (ignored by `.gitignore`).
2. Fill in your own values.
3. Run with `--spring.profiles.active=local`.

## Guidelines

- Use a dedicated, least-privilege MySQL account for the application, not `root`.
- Use a long, randomly generated password and a different one per environment.
- Never commit `.env`, `application-local.properties`, or any file containing real credentials.
- Tests that start the full Spring context (`@SpringBootTest`) need these variables set
  (use throwaway test values or an in-memory database).
