# EduNexus Industrialization Roadmap

## Flaws Found

- Runtime configuration and scripts were inconsistent: `run_all.bat` advertised backend port `5005`, while `.env` and Vite proxy use `5000`.
- The API did not expose a health endpoint, request IDs, or predictable operational metadata for monitoring.
- Basic production HTTP protections were missing, including security headers and request throttling.
- API errors were split between multiple response shapes, making client handling brittle.
- Public registration remained open in all environments even though the controller comment says it should be admin-only in production.
- Browser access tokens were persisted in `localStorage`, increasing the blast radius of an XSS issue.
- Socket.IO accepted a fallback JWT secret and allowed clients to request arbitrary user/course rooms.
- The platform had no audit trail for sensitive admin/faculty write operations.
- There was no academic calendar or exam schedule module, which is a core expectation for MyCamu-like campus platforms.
- The landing CSS had invalid generated selectors, which produced production build warnings.
- The frontend bundle is large and should be split by route for production performance.

## First Pass Completed

- Added environment validation and origin parsing in `server/config/env.js`.
- Added request IDs, security headers, a lightweight rate limiter, API 404 handling, and centralized error handling in `server/middleware/opsMiddleware.js`.
- Added `GET /health` for uptime and deployment checks.
- Added production-only admin protection for `POST /api/v1/auth/register`.
- Moved frontend access-token handling to memory with refresh-cookie recovery and cleanup of the legacy localStorage token.
- Hardened Socket.IO authentication and room authorization:
  - removed fallback JWT secret
  - personal rooms now use the token user id only
  - course rooms now require admin access, student enrollment, or faculty assignment
- Added an admin audit trail:
  - `AuditLog` model
  - automatic write-operation logging
  - admin API at `/api/v1/audit-logs`
  - admin UI at `/admin/audit-logs`
- Added an academic calendar/exam module:
  - `ExamEvent` model
  - admin CRUD API at `/api/v1/exams`
  - authenticated student/faculty read access
  - role-aware portal page at `/student/calendar`, `/faculty/calendar`, and `/admin/calendar`
- Added the first admissions lifecycle slice:
  - `AdmissionApplication` model
  - admin API at `/api/v1/admissions/applications`
  - admin UI at `/admin/admissions`
  - inquiry, application, document verification, offer, enrolled, rejected, and withdrawn stages
- Added public admissions entry:
  - public active-program listing at `/api/v1/admissions/public/programs`
  - public application submission at `/api/v1/admissions/public/applications`
  - applicant-facing form at `/admissions/apply`
- Completed admissions workflow controls:
  - admin document checklist verification
  - conversion from accepted admission to student user/profile
- Extended result publishing:
  - moderation approval before publishing
  - GPA/credit summaries
  - transcript PDF export
- Added CSRF/session hardening:
  - double-submit CSRF cookie
  - automatic `X-CSRF-Token` client header on mutating requests
- Added Redis-ready rate limiting:
  - uses `REDIS_URL` when configured
  - keeps memory fallback for local development
- Added automated test coverage:
  - auth token generation and refresh hashing
  - result summary and GPA calculations
- Split frontend routes with `React.lazy` and `Suspense`, removing the large initial Vite chunk warning.
- Expanded audit logs with write categories and sanitized request summaries for admin/faculty operations.
- Added repeatable deployment scaffolding:
  - production `Dockerfile`
  - `docker-compose.yml` with MongoDB, Redis, and API/static frontend service
  - GitHub Actions CI for install, tests, and client build
- Fixed the malformed `.lp-btn-var(--card-bg)` CSS class.
- Added root scripts for client development and production client build.
- Updated `run_all.bat` to show the actual backend port.

## Next High-Impact Work

- Replace document URL fields with real object storage uploads.
- Add deeper integration tests with an isolated MongoDB test database.
- Add deployment secrets management and production domain configuration.
