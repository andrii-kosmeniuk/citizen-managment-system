# Database Structure

This schema supports the Citizen Request Management System requirements.

## Tables

### `staff_users`
- Purpose: City staff members who claim requests, change statuses, and write comments.
- Key columns:
  - `id` primary key
  - `full_name`, `email` (unique)
  - `is_active`
  - `created_at`, `updated_at`

### `categories`
- Purpose: Managed request categories (Infrastructure, Environment, etc.).
- Key columns:
  - `id` primary key
  - `name` (unique)
  - `description`
  - `is_active`
  - `created_at`, `updated_at`

### `citizen_requests`
- Purpose: Main citizen request entity.
- Key columns:
  - `id` primary key
  - `title`, `description`
  - `category_id` foreign key to `categories`
  - `priority` enum: `LOW | MEDIUM | HIGH | CRITICAL`
  - `status` enum: `NEW | IN_PROGRESS | CLARIFICATION_NEEDED | RESOLVED | CLOSED`
  - `citizen_name` (optional)
  - `assigned_to_user_id` foreign key to `staff_users`
  - `resolved_at`, `closed_at`
  - `created_at`, `updated_at`
- Constraints:
  - Title/description cannot be blank.
  - `resolved_at` required for `RESOLVED` and `CLOSED`.
  - `closed_at` required for `CLOSED`.

### `request_comments`
- Purpose: Immutable historical comments on requests.
- Key columns:
  - `id` primary key
  - `request_id` foreign key to `citizen_requests` (cascade delete)
  - `author_user_id` foreign key to `staff_users`
  - `comment_text`
  - `created_at`
- Constraint: comment text cannot be blank.

### `request_status_history`
- Purpose: Audit trail of all status transitions.
- Key columns:
  - `id` primary key
  - `request_id` foreign key to `citizen_requests` (cascade delete)
  - `from_status` enum (nullable for initial transition)
  - `to_status` enum (required)
  - `changed_by_user_id` foreign key to `staff_users`
  - `change_note`
  - `changed_at`
- Constraint: `from_status` and `to_status` must differ.

## Workflow Enforcement

A trigger validates transitions in `request_status_history`:
- Initial transition: `NULL -> NEW`
- `NEW -> IN_PROGRESS | CLARIFICATION_NEEDED`
- `IN_PROGRESS -> CLARIFICATION_NEEDED | RESOLVED`
- `CLARIFICATION_NEEDED -> IN_PROGRESS`
- `RESOLVED -> CLOSED`
- No transitions from `CLOSED`

## Indexes

Indexes are added for common filtering and lookups:
- Request filters: `status`, `category_id`, `priority`, `assigned_to_user_id`
- Relationship lookups: `request_comments.request_id`, `request_status_history.request_id`

## Migration file

- SQL migration path: `database/migrations/001_initial_schema.sql`
