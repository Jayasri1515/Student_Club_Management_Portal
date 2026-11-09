# Membership uniqueness (one row per user and club)

`memberships` now has a unique constraint `uk_membership_user_club` on `(user_id, club_id)`
(see `Membership.java`). Before this, two concurrent join requests could both pass the
"already a member?" check and insert two rows, after which leave and join failed with a 500.

## What the application does

- **Join:** if the database rejects a second row, the API answers 400 `User is already a member of this club.`
  (same as the normal "already a member" case).
- **Leave:** removes every row for the pair, so a user who already has duplicates can still leave.

## Action needed from a database administrator (not done by the application or by this change)

The application runs with `spring.jpa.hibernate.ddl-auto=update`, so Hibernate tries to add the
constraint on the next start. **If the table already contains duplicate pairs, MySQL refuses to create
it.** Hibernate logs the failure and the application still starts, but the constraint is then missing
and duplicates remain possible.

1. Back up the `memberships` table.
2. Find existing duplicates (read-only):

   ```sql
   SELECT user_id, club_id, COUNT(*) AS rows_found
   FROM memberships
   GROUP BY user_id, club_id
   HAVING COUNT(*) > 1;
   ```

3. If there are any, review them and remove the extras, keeping one row per pair. For example, keeping the
   lowest id (have a DBA review before running):

   ```sql
   DELETE m1 FROM memberships m1
   JOIN memberships m2
     ON m1.user_id = m2.user_id AND m1.club_id = m2.club_id AND m1.id > m2.id;
   ```

4. Restart the application (or add the constraint manually) and confirm it exists:

   ```sql
   SHOW INDEX FROM memberships WHERE Key_name = 'uk_membership_user_club';
   ```

Rows with a `NULL` `user_id` or `club_id` are not covered by the constraint (MySQL allows repeated NULLs).
