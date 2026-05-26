# OYA MICROCREDIT KENYA — ENTERPRISE LOAN MANAGEMENT ECOSYSTEM
## FULL PRODUCTION-GRADE SYSTEM ARCHITECTURE SPECIFICATION

---

## COMPANY IDENTITY

**Company:** OYA Micro-Credit Company Limited — Kenya
**Registered:** Companies Act 2015, Reg No. PVT-AJUXZ57A
**CBK Letter of No Objection:** Ref No. BSD/GEN/62
**Data Commissioner Certification:** No. 411-169C-C0EE
**Address:** Kilimani, Nairobi — P.O. Box 36513-00200
**Phone:** +254 709 030 000 / +254 730 030 000
**Email:** info@oyamicrocredit.co.ke
**Website:** https://oyamicrocredit.co.ke

---

## BRAND DESIGN SYSTEM

Extract and apply the following from https://oyamicrocredit.co.ke:

**Logo:**
- Use: https://oyamicrocredit.co.ke/images/OYA-Microcredit_LOGO-KENYA.png
- Display in app header, splash screen, and login screen

**Color Palette (extracted from website):**
- Primary Green: `#2E7D32` (dominant brand color — buttons, headers, active states)
- Dark Green: `#1B5E20` (pressed states, sidebar, footer)
- Accent Gold/Amber: `#F9A825` (highlights, badges, CTAs)
- White: `#FFFFFF` (card backgrounds, content areas)
- Light Grey: `#F5F5F5` (page backgrounds, input fields)
- Dark Text: `#212121` (body text)
- Medium Text: `#616161` (subtitles, labels)
- Error Red: `#C62828` (validation errors, overdue alerts)
- Success Green: `#388E3C` (success states, paid badges)
- Warning Amber: `#F57F17` (due-soon alerts, pending states)
- Divider Grey: `#E0E0E0` (table lines, card borders)

**Typography:**
- Primary Font: `Poppins` (Google Fonts — headings, labels, buttons)
- Body Font: `Inter` (Google Fonts — body text, tables, data)
- Fallback: `sans-serif`

**Design Language:**
- Clean, corporate, premium African fintech aesthetic
- No gradients unless subtle
- Card-based layouts
- Consistent 8px spacing grid
- Rounded corners: 8px for cards, 4px for inputs, 24px for pill badges
- Shadow: `0 2px 8px rgba(0,0,0,0.08)` for cards
- Icons: Material Icons or Lucide Icons only

**Mobile and Admin Dashboard must share one design system.**
No generic templates. No overdesigned elements. No animations that delay data display.

---

## SYSTEM OVERVIEW

Build the following production services as a modular, independently deployable ecosystem:

| # | Service | Technology |
|---|---------|------------|
| 1 | Flutter Mobile App | Flutter 3.x (stable) |
| 2 | React Admin Dashboard | React 18, TypeScript, Vite |
| 3 | API Gateway | Node.js, TypeScript, Fastify |
| 4 | Authentication Service | Node.js, TypeScript, Fastify |
| 5 | Loan Management Service | Node.js, TypeScript |
| 6 | Payment Service | Node.js, TypeScript, Safaricom Daraja |
| 7 | Notification Service | Node.js, Firebase Admin SDK |
| 8 | Queue Worker Service | BullMQ + Redis |
| 9 | Audit Logging Service | Node.js, PostgreSQL |
| 10 | Redis Infrastructure | Redis 7.x |
| 11 | Database | Supabase PostgreSQL 15 |
| 12 | Monitoring Stack | Prometheus + Grafana + Loki + Sentry |
| 13 | Reverse Proxy | NGINX |
| 14 | Containerization | Docker + Docker Compose |
| 15 | CI/CD | GitHub Actions |

---

## ARCHITECTURE RULES

- Every service is independently deployable and scalable.
- No tight coupling between: database logic, authentication logic, payment logic, or frontend logic.
- Use abstraction layers for: database access (repository pattern), authentication (service layer), storage (adapter pattern), notifications (provider interface), queues (queue adapter).
- Business logic must NEVER live in route handlers. Routes call service layer. Service layer calls repository layer.
- All services communicate via REST over internal network or via Redis Pub/Sub events.
- No shared database connections across services in production. Each service owns its schema namespace.
- Architecture must support future migration to AWS (RDS, Aurora, ECS, EKS, Lambda, ElastiCache, DynamoDB) without rewriting business logic.

---

## COST-OPTIMIZED DEPLOYMENT STRATEGY

**Initial deployment target:** DigitalOcean, Hetzner, Railway, or Render.
**Scale to AWS** only when traffic justifies it.

Cost reduction rules:
- Use Redis aggressively to reduce Postgres read load.
- Never poll APIs. Use WebSockets, Redis Pub/Sub, or Supabase Realtime for live updates.
- Use BullMQ queues for: email, SMS, push notifications, audit logs, payment reconciliation, document processing.
- Lazy-load all dashboard analytics data (not on initial page load).
- Cache all read-heavy endpoints (loan summaries, repayment schedules) in Redis with TTL.
- Use pagination on every list endpoint. No unbounded queries.
- Set container CPU and memory limits in Docker Compose and Kubernetes manifests.
- Use structured JSON logging with log level filtering. Do not log at DEBUG in production.
- Retention policy: Logs older than 90 days auto-archived; older than 365 days deleted.

---

## FLUTTER MOBILE APPLICATION

**Framework:** Flutter 3.x stable
**Targets:** Android (API 21+), iOS (14+)

### Architecture

Use **Clean Architecture** with feature-first folder structure:

```
lib/
  core/              # shared utilities, constants, theme, network client
  features/
    auth/            # login, register, OTP, password reset
    dashboard/       # loan summary, balance, quick actions
    profile/         # client profile page
    loans/           # loan application, status tracking
    payments/        # payment initiation, STK push, history
    notifications/   # notification list, settings
    devices/         # active sessions, device management
  shared/            # reusable widgets, bottom sheets, dialogs
```

### Required Packages (real, maintained packages only)

| Package | Version | Purpose |
|---------|---------|---------|
| `flutter_riverpod` | ^2.x | State management |
| `riverpod_annotation` | ^2.x | Code generation for Riverpod |
| `dio` | ^5.x | HTTP client |
| `flutter_secure_storage` | ^9.x | Secure token storage |
| `go_router` | ^14.x | Navigation |
| `freezed` | ^2.x | Immutable data classes |
| `freezed_annotation` | ^2.x | Annotations for freezed |
| `json_serializable` | ^6.x | JSON serialization |
| `build_runner` | ^2.x | Code generation runner |
| `get_it` | ^7.x | Dependency injection |
| `injectable` | ^2.x | DI code generation |
| `hive_flutter` | ^1.x | Local offline cache |
| `connectivity_plus` | ^6.x | Network state detection |
| `firebase_messaging` | ^15.x | Push notifications |
| `firebase_core` | ^3.x | Firebase initialization |
| `flutter_local_notifications` | ^17.x | Local notification display |
| `image_picker` | ^1.x | Camera and gallery access |
| `file_picker` | ^8.x | Document uploads |
| `intl` | ^0.19.x | Date and currency formatting |
| `cached_network_image` | ^3.x | Cached image loading |
| `shimmer` | ^3.x | Loading skeleton UI |
| `pinput` | ^5.x | OTP input field |
| `local_auth` | ^2.x | Biometric authentication |
| `package_info_plus` | ^8.x | App version detection |
| `device_info_plus` | ^10.x | Device fingerprinting |

Do NOT use: `provider` (replaced by Riverpod), `get` (GetX — unmaintained patterns), `mobx`, `flutter_bloc` (use Riverpod unless team mandates Bloc).

### Performance Requirements

- Cold start: under 2 seconds on mid-range Android devices.
- All screens must display skeleton loaders while data loads. Never show empty screens.
- Offline mode: cache last known loan balance and repayment schedule. Show cached data with a "Last updated: X" badge when offline.
- Image uploads compressed client-side to max 800KB before upload.
- Paginate all lists. Load 20 items per page.
- Minimize battery usage: no background polling. Use FCM push only.

---

## CLIENT PROFILE PAGE (MOBILE)

The profile page is a dedicated screen in the mobile app. It must display all information the client provided at registration, plus their business and account details.

**Profile Page Sections:**

**1. Header Card**
- Profile photo (from KYC selfie, or initials avatar if none)
- Full legal name (large text)
- Account status badge: Active / Suspended / Pending KYC
- Member since date

**2. Personal Information**
- Full legal name
- Kenyan National ID number (masked: `XX XX XXXX` show last 4 only, with toggle to reveal)
- Date of birth (if captured)
- Gender (if captured)

**3. Business Information**
- Business name
- Business type / category (e.g., Retail, Food, Transport)
- Business location / town
- Business description (brief)

**4. Contact Information**
- Phone number (masked: `+254 7XX XXX XX4`, with reveal toggle)
- Email address (if provided)
- Physical address / town

**5. Loan Account Summary**
- Loan account number (UUID short reference, e.g., `OYA-00234`)
- Current loan status
- Total loans taken (count)
- Total amount repaid (lifetime)

**6. KYC & Document Status**
- National ID: Verified / Pending / Rejected (with badge color)
- Selfie / Photo ID: Verified / Pending / Rejected
- Business proof document: Verified / Pending / Rejected

**7. Active Devices**
- List of currently logged-in devices
- Device name, OS, last active timestamp
- "Remove this device" button per device
- "Log out all devices" button

**8. Account Actions**
- Change password
- Update phone number (triggers OTP)
- Update profile photo
- Request account deletion (triggers admin workflow, not instant delete)
- View privacy policy

**Rules:**
- Sensitive fields (ID number, phone) are masked by default with a reveal-on-tap eye icon.
- Reveal action must require biometric authentication or PIN confirmation before showing.
- Profile edits that affect KYC fields (name, ID number) trigger a re-verification workflow, not an instant update.
- Display a "Data certified by Office of Data Commissioner — Cert No. 411-169C-C0EE" footer on this screen.

---

## CLIENT AUTHENTICATION SYSTEM

### Registration Fields

| Field | Validation |
|-------|-----------|
| Full legal name | Min 3 chars, max 100 chars, letters and spaces only |
| Kenyan National ID number | 7–8 digits, numeric only, unique in system |
| Kenyan phone number | See below |
| Business name | Min 2 chars, max 100 chars |
| Business type | Enum selection |
| Business location | Text field, min 2 chars |
| Password | See below |
| Password confirmation | Must match password |

### Phone Number Validation

Accepted formats: `07XXXXXXXX`, `+2547XXXXXXXX`, `2547XXXXXXXX`

Normalize ALL formats to E.164: `+2547XXXXXXXX` before storing.

Reject:
- Numbers with invalid prefixes (reject non-Kenyan prefix after normalization)
- Numbers shorter than 12 digits (in E.164)
- Non-numeric characters after stripping `+`
- Duplicate numbers already registered

Valid Safaricom prefixes after normalization: `+25470`, `+25471`, `+25472`, `+25479`
Valid Airtel Kenya prefixes: `+25473`, `+25474`, `+25475`
Valid Telkom Kenya prefixes: `+25477`
Reject all other prefixes.

### National ID Validation

- Accept only 7 or 8-digit numeric strings.
- Reject if already exists in `users` table (unique constraint + application-level check).
- Do not attempt to verify against government databases at this stage (not publicly accessible API in Kenya without bilateral agreement). Flag for manual KYC verification instead.

### Password Rules

- Minimum 8 characters.
- Must contain: one uppercase letter, one lowercase letter, one digit, one special character (`!@#$%^&*`).
- Hash using **bcrypt** with cost factor 12. (Argon2id is preferred if the Node.js runtime supports it via `argon2` npm package — use Argon2id with `memoryCost: 65536`, `timeCost: 3`, `parallelism: 1` if available.)
- NEVER store plaintext passwords.
- NEVER log passwords, tokens, or OTPs anywhere.

### OTP System

- Generate 6-digit numeric OTP.
- Store in Redis with key `otp:{phone}` and TTL of 300 seconds (5 minutes).
- Maximum 3 OTP attempts per phone number per 10-minute window (Redis counter with TTL).
- After 3 failed attempts: lock OTP for that phone for 10 minutes.
- Deliver via Africa's Talking SMS API or Twilio SMS API (both are real, production-ready APIs for Kenya).
- Do NOT use imaginary SMS providers.

**Real SMS API options for Kenya:**
- **Africa's Talking** (https://africastalking.com) — recommended, Kenya-native, low latency
- **Twilio** (https://twilio.com) — international fallback

### Token System

| Token | Storage | TTL | Notes |
|-------|---------|-----|-------|
| JWT Access Token | Memory only (not localStorage) | 15 minutes | Signed with RS256 or HS256 |
| Refresh Token | HTTP-only Secure cookie (web) / Flutter Secure Storage (mobile) | 30 days | Rotated on every use |
| Device Token | Stored in `sessions` table | 30 days | Tied to device fingerprint |

- Refresh token rotation: issue new refresh token on every refresh. Invalidate old one immediately.
- If a refresh token is used after it has been invalidated (token reuse attack), immediately invalidate ALL sessions for that user.
- Token blacklist: store invalidated access tokens in Redis with key `blacklist:{jti}` and TTL equal to remaining token lifetime.
- All requests: validate JWT signature → check blacklist → validate session in DB → verify device fingerprint → verify resource ownership.

### Device Fingerprint

Compose from:
- Device model
- OS version
- App version
- A UUID generated on first install (stored in Flutter Secure Storage)

Hash the composite with SHA-256 and store as `device_fingerprint` in the `sessions` table.

---

## RATE LIMITING AND ANTI-ABUSE

Use **Redis-backed sliding window rate limiting** via `ioredis` directly or the `@fastify/rate-limit` plugin.

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global per IP | 100 requests | 60 seconds |
| `/auth/login` | 5 attempts | 15 minutes |
| `/auth/register` | 10 attempts | 1 hour |
| `/auth/otp/send` | 3 sends | 10 minutes per phone |
| `/auth/otp/verify` | 3 attempts | 10 minutes per phone |
| `/payments/initiate` | 10 requests | 1 minute per user |
| General authenticated API | 60 requests | 60 seconds per user |

### Abuse Response

- After 5 consecutive failed logins from one IP: temporary ban for 15 minutes.
- After 20 consecutive failed logins from one IP: ban for 24 hours, alert to admin.
- Trigger security alert to admin dashboard for: rapid OTP requests, login attempts from new country, multiple failed payment initiations.
- Store all abuse events in `security_events` table with IP, user agent, device fingerprint, and timestamp.

### HTTP Security Headers (via `@fastify/helmet`)

```
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

CORS: allow only whitelisted origins. Reject all others with 403.

---

## DDOS PROTECTION

**Layer 1 — Cloudflare (Free or Pro)**
- Enable Cloudflare proxy on all A records.
- Enable "Under Attack Mode" automatically via Cloudflare API when traffic anomaly is detected.
- Configure Cloudflare WAF rules to block:
  - Requests with no User-Agent header
  - Requests with malformed Host header
  - Known bad bot signatures
  - Countries with no legitimate user base (configure based on business geography — Kenya-first, block high-risk regions)

**Layer 2 — NGINX Rate Limiting**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_req zone=api burst=50 nodelay;
limit_conn_zone $binary_remote_addr zone=addr:10m;
limit_conn addr 20;
```

**Layer 3 — Application-Level (Redis sliding window)**
Already defined in Rate Limiting section above.

**Emergency Mitigation Runbook:**
1. Detect anomaly: >5x baseline requests/second for >60 seconds → trigger alert.
2. Auto-enable Cloudflare "Under Attack Mode" via Cloudflare API (Node.js cron job monitors and calls API).
3. Auto-ban top 10 offending IPs via NGINX `deny` directive (generated dynamically from Redis sorted set of top-offending IPs).
4. Geo-block if attack is concentrated from specific region (Cloudflare Firewall Rule).
5. If attack penetrates to app layer: enable maintenance mode flag in Redis (`maintenance:active = 1`). All API routes check this flag first and return 503 with retry-after header.
6. Log all attack traffic to `ddos_events` table for audit.
7. Restore normal operation: disable maintenance flag, remove temp IP bans, generate incident report.

---

## SECURITY PENETRATION TESTING SUITE

Build a dedicated test suite that simulates real attacker tactics. Run in staging environment only. Never run against production.

### Test Categories and Tactics to Simulate

**1. Authentication Attacks**
- Brute force login: 1000 rapid login attempts with common passwords. Verify lockout triggers at attempt 5.
- Credential stuffing: replay known breached credential pairs. Verify all fail and trigger alerts.
- Password spray: one common password against 100 different accounts. Verify rate limiter catches IP.
- OTP brute force: attempt all 1,000,000 6-digit combinations in rapid sequence. Verify lockout at attempt 3.
- JWT algorithm confusion attack: send `alg: none` JWT. Verify server rejects it.
- JWT secret brute force: send JWT with `alg: HS256` and attempt to crack weak secrets. Use RS256 to prevent this.
- Expired token replay: reuse an expired access token. Verify 401 response.
- Refresh token theft simulation: use a refresh token from device A on device B. Verify detection and session revocation.
- Session fixation: attempt to force a known session ID on a user. Verify server generates new session ID on auth.
- Cookie theft simulation: extract JWT from cookie via XSS-like manipulation. Verify HttpOnly prevents JavaScript access.

**2. Authorization Attacks (IDOR — Insecure Direct Object Reference)**
- Access another user's loan data by manipulating UUID in URL. Verify 403 response.
- Access another user's payment history. Verify ownership check blocks it.
- Attempt to approve own loan via direct API call (bypassing admin). Verify role check blocks it.
- Attempt to access admin endpoints with client JWT. Verify role-based guard blocks it.
- Attempt to read another admin's audit logs. Verify admin-level RBAC.
- Attempt to modify another user's phone number via PATCH request with different user UUID.

**3. Injection Attacks**
- SQL injection via all string input fields (name, ID, phone). Verify parameterized queries prevent execution.
- NoSQL injection patterns in JSON body. Verify input sanitization.
- XSS payload injection into profile fields. Verify output encoding on admin dashboard.
- Command injection via file upload filename. Verify filename sanitization.
- Path traversal via document upload path (`../../etc/passwd`). Verify path is jailed to upload directory.
- HTTP header injection via `X-Forwarded-For` spoofing. Verify server uses Cloudflare's real IP header, not user-supplied.

**4. Payment Attacks**
- Duplicate M-Pesa callback replay: send same callback payload twice within 1 second. Verify idempotency key prevents duplicate credit.
- Callback with tampered amount: change `Amount` field in callback body to 1 KES for a 10,000 KES loan. Verify amount is validated against pending transaction record, not taken from callback.
- Callback with fake `ResultCode: 0` for a failed payment. Verify server cross-checks with Daraja API query before crediting.
- Race condition on concurrent payment: send 5 simultaneous payment callbacks for the same `CheckoutRequestID`. Verify database transaction lock prevents double-credit. Use PostgreSQL `SELECT FOR UPDATE` or optimistic locking.
- SSRF via callback URL manipulation: attempt to register a malicious callback URL. Verify only Safaricom IP ranges are accepted for callbacks (validate source IP against Safaricom published IP ranges).

**5. File Upload Attacks**
- Upload PHP/shell script disguised as JPEG (polyglot file). Verify MIME type is validated from file magic bytes (not just extension), and file is stored in a non-executable location (object storage or `/uploads` directory outside web root).
- Upload extremely large file (1GB). Verify upload size limit (max 10MB per file) rejects it.
- Upload file with `../../../etc/cron.d/malicious` as filename. Verify filename is sanitized to alphanumeric + extension only before storage.
- Upload malicious PDF with embedded JavaScript. Verify PDFs are scanned or rendered safely.
- Upload SVG with embedded XSS. Verify SVG files are rejected or sanitized.

**6. Infrastructure Attacks**
- DDoS simulation: use `k6` or `Artillery` to send 10,000 requests/second to `/auth/login`. Verify rate limiter, NGINX limits, and Cloudflare layer all engage before the app crashes.
- Slowloris attack: open 500 connections and send headers very slowly. Verify NGINX `client_header_timeout` and `client_body_timeout` close these connections.
- Large payload attack: send 100MB JSON body to API. Verify `Content-Length` limit rejects it before parsing.

**7. Admin Dashboard Attacks**
- Attempt to access `/admin` routes without admin JWT. Verify 401/403.
- Attempt privilege escalation: use `role: "SUPER_ADMIN"` in JWT payload manually crafted. Verify role is read from database, not JWT payload.
- CSRF attack on admin action (approve loan): attempt from different origin. Verify CSRF token validation or SameSite=Strict cookie blocks it.
- Clickjacking: attempt to embed admin dashboard in an iframe. Verify `X-Frame-Options: DENY` blocks it.

**Testing Tools (all real, open-source):**
- `k6` (https://k6.io) — load and DDoS simulation
- `Artillery` (https://artillery.io) — API load testing
- `OWASP ZAP` (https://zaproxy.org) — automated security scanning
- `sqlmap` — SQL injection testing (run against staging only)
- `jwt_tool` (https://github.com/ticarpi/jwt_tool) — JWT attack simulation
- `Burp Suite Community` — manual penetration testing proxy

---

## CLIENT DASHBOARD (MOBILE)

The home screen of the mobile app must instantly show:

| Field | Source | Update Trigger |
|-------|--------|---------------|
| Active loan balance | Redis cache | On payment confirmed |
| Weekly installment amount | Precomputed in DB | On loan creation |
| Remaining installments (weeks) | Computed from repayments | On payment confirmed |
| Next due date | Installment schedule | Daily cron recalculates |
| Overdue amount | Penalty engine | Real-time |
| Last payment amount and date | `repayments` table | On payment confirmed |
| Total repaid | Aggregated in Redis | On payment confirmed |
| Loan status badge | `loans.status` | On any status change |

**Real-time updates:**
- Use Supabase Realtime (PostgreSQL LISTEN/NOTIFY via WebSocket) for live balance updates.
- Fallback: Redis Pub/Sub → server-sent SSE to mobile client if WebSocket is disconnected.
- Do NOT use polling. No `setInterval` fetching.

**Loading strategy:**
- Show skeleton loader on all cards while initial data loads.
- Cache last response in Hive (offline persistence). Show cached data immediately, then refresh in background.
- All API calls via Dio with interceptor that: attaches Authorization header, retries once on 401 (refresh token), retries twice on network error with exponential backoff.

---

## LOAN APPLICATION FLOW

**Step 1: Eligibility Check**
- User must have no active defaulted loan.
- User must have completed KYC (ID verified + selfie approved).
- User must not be suspended.
- Check performed before showing application form.

**Step 2: Application Form**
Fields:
- Loan amount requested
- Purpose of loan (enum: Stock Purchase, Equipment, Rent, Working Capital, Other)
- Business current monthly revenue (estimated)
- Number of employees
- Loan repayment preference (weekly installments)

**Step 3: Document Upload**
- Kenyan National ID (front photo) — JPEG/PNG, max 5MB
- Selfie with ID (liveness check photo) — JPEG/PNG, max 5MB
- Business proof document (optional: till receipt, business permit photo, shop photo) — JPEG/PNG/PDF, max 10MB

Store documents in Supabase Storage (S3-compatible). Store only the storage path in the database, never the file content.

**Step 4: Loan Workflow States**

```
DRAFT → SUBMITTED → KYC_REVIEW → CREDIT_REVIEW → APPROVED → DISBURSED → ACTIVE → CLOSED
                                                            → REJECTED
                                                 → DEFAULTED (from ACTIVE)
```

Every state transition must:
- Be recorded in `loan_audit_trail` table with: old state, new state, actor (user or admin ID), timestamp, notes.
- Trigger a push notification to the client.
- Be reversible only by an admin with appropriate role.

**Step 5: Repayment Schedule Generation**
- Calculate weekly installment = `(principal + total_interest) / number_of_weeks`
- Use `decimal.js` npm library for all money calculations. NEVER use JavaScript `number` type or `float` for money.
- Store all money values as `NUMERIC(15,2)` in PostgreSQL. Never use `FLOAT` or `DOUBLE PRECISION` for money columns.
- Generate all installment records at disbursement time and insert into `installments` table.

**Step 6: Penalty Engine**
- Run a daily cron job (via BullMQ repeatable job) at 00:01 EAT (UTC+3).
- For each installment where `due_date < TODAY` and `status = UNPAID`:
  - Calculate penalty: flat KES 50 per day overdue OR percentage-based (configurable per loan product in `loan_products` table).
  - Insert penalty record into `penalties` table.
  - Update `loans.total_penalties` aggregate.
  - Send push notification on day 1, 3, 7 overdue.

---

## PAYMENT SYSTEM (SAFARICOM DARAJA)

**API:** Safaricom Daraja v2 (https://developer.safaricom.co.ke)
**Feature:** M-Pesa STK Push (Lipa Na M-Pesa Online)

### Payment Flow

1. Client taps "Make Payment" in app.
2. App calls `/payments/initiate` with `{ amount, phone_number }`.
3. Backend:
   a. Validates amount > 0 and phone is valid E.164 format.
   b. Generates idempotency key: `SHA256(user_id + loan_id + amount + ISO_timestamp_minute)`.
   c. Checks Redis: `SET idempotency:{key} 1 NX EX 300`. If key exists, reject as duplicate.
   d. Creates pending `payment_requests` record in DB with status `PENDING`.
   e. Calls Daraja STK Push endpoint with: `BusinessShortCode`, `Password` (base64 of shortcode+passkey+timestamp), `Amount`, `PartyA` (customer phone), `PartyB` (shortcode), `PhoneNumber`, `CallBackURL`, `AccountReference`, `TransactionDesc`.
   f. Stores `CheckoutRequestID` from Daraja response against the payment record.
4. Client polls `/payments/status/{checkout_request_id}` OR waits for Supabase Realtime event.
5. Daraja sends callback to `/payments/callback` endpoint (must be HTTPS, publicly accessible).

### Callback Handling Rules

The callback endpoint MUST:
- Validate source IP is from Safaricom IP ranges. Reject all other IPs with 403. (Safaricom publishes their IP ranges — verify at time of integration.)
- Validate HMAC signature if Daraja provides one (check Daraja v2 docs at time of integration).
- Immediately store raw callback body in `payment_callbacks_raw` table before ANY processing.
- Use idempotency: check if `MpesaReceiptNumber` already exists in `repayments` table. If yes, return `{"ResultCode": 0}` without processing again.
- Only credit payment if `ResultCode == 0` in callback.
- Cross-validate `Amount` from callback against `expected_amount` in `payment_requests` table. If mismatch > KES 1 (floating point tolerance), flag for manual reconciliation and alert admin. Do NOT automatically credit wrong amount.
- Use PostgreSQL transaction: `UPDATE installments SET status = PAID` + `INSERT INTO repayments` + `UPDATE loans SET balance_remaining` all in one atomic transaction with `BEGIN/COMMIT`. Use `SELECT FOR UPDATE` on the loan record to prevent concurrent updates.
- After successful credit: publish `payment.confirmed:{loan_id}` event to Redis Pub/Sub.
- Push notification to client: "Payment of KES X received. Receipt: {MpesaReceiptNumber}. New balance: KES Y."

### Reconciliation

- Run a daily reconciliation job at 02:00 EAT.
- Query Daraja Transaction Status API for all payments with status `PENDING` older than 1 hour.
- Auto-resolve any confirmed payments that were missed due to callback failure.
- Flag and alert admin for any unresolvable discrepancies.

---

## ADMIN DASHBOARD (REACT)

**Stack:** React 18, TypeScript, Vite, Ant Design 5.x

Ant Design is a real, maintained component library (https://ant.design). Use it. Do not use imaginary component libraries.

Alternative: Material UI v5 (https://mui.com) is equally valid. Choose one and use consistently.

### Role-Based Access Control

| Role | Permissions |
|------|------------|
| `SUPER_ADMIN` | All permissions including user deletion, system config |
| `LOAN_OFFICER` | View/approve/reject loans, view customers |
| `COLLECTIONS_OFFICER` | View repayments, send reminders, mark overdue |
| `FINANCE_ADMIN` | View all financial reports, trigger reconciliation |
| `SUPPORT_AGENT` | View customer profiles, view loans (read-only) |

Roles are stored in the `admin_roles` table and read from the database on token validation. Role is NEVER read from JWT payload.

### Dashboard Screens

**1. Overview Dashboard**
Real-time metrics:
- Total active loans (count + KES sum)
- Total disbursed today (KES)
- Total collected today (KES)
- Overdue loans count and KES amount
- Loans pending approval (count)
- New registrations today

Charts:
- Collections this week vs last week (bar chart — use `recharts` library)
- Loan disbursements by month (line chart)
- Overdue rate trend (line chart)
- Loan status distribution (pie chart)

**2. Customer Management**
- Searchable, sortable table of all customers
- Columns: Name, Phone, ID Number, Registration Date, KYC Status, Loan Status, Balance
- Click row → Customer Detail Page
- Actions: View, Suspend, Unsuspend, Force Logout (revoke all sessions), Flag as Suspicious

**3. Customer Detail Page**
All fields from client profile plus:
- Full loan history
- Full payment history
- All uploaded documents (with approve/reject buttons per document)
- Active sessions with device info
- Security events log (failed logins, suspicious activity)
- Admin notes (add note, view note history)
- Audit trail (every action ever taken on this account)

**4. Loan Management**
- Table of all loans with filters: status, date range, officer, amount range
- Loan detail page: full application info, documents, repayment schedule, payment history, audit trail
- Actions per loan: Approve, Reject, Disburse, Mark Defaulted, Add Note
- Bulk actions: Export to CSV, Send bulk reminders

**5. Payment Management**
- All payments table with M-Pesa receipt numbers
- Flag payments for manual review
- Trigger manual reconciliation
- View raw callback logs

**6. Reports**
- Portfolio at Risk (PAR) report by date range
- Collections efficiency report
- Officer performance report
- Exportable as CSV and PDF (use `jsPDF` + `jspdf-autotable` — real packages)

**7. Audit Logs**
- Every admin action logged with: admin ID, action, target entity, timestamp, IP, before/after state.
- Audit logs are immutable. No admin can delete audit logs. Not even SUPER_ADMIN.
- Filterable by admin, action type, date range.

**8. Notifications Management**
- Compose and send broadcast notification to all users or filtered segment
- View notification delivery status (delivered, failed)
- Schedule notifications (via BullMQ delayed jobs)

**9. System Health**
- Real-time API latency graph (Prometheus data via Grafana embedded iframe or Prometheus API)
- Queue depth (BullMQ job counts per queue)
- Redis memory usage
- Active WebSocket connections
- Recent error log (last 50 errors from Sentry)

---

## DEVICE TRACKING

Store in `sessions` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to users |
| `device_fingerprint` | VARCHAR(64) | SHA-256 hash |
| `device_name` | VARCHAR(100) | e.g., "Samsung Galaxy A32" |
| `device_os` | VARCHAR(50) | e.g., "Android 13" |
| `app_version` | VARCHAR(20) | e.g., "1.4.2" |
| `ip_address` | INET | Login IP |
| `last_active_at` | TIMESTAMPTZ | Updated on every request |
| `created_at` | TIMESTAMPTZ | First login |
| `is_active` | BOOLEAN | Set false on logout or revocation |
| `revoked_at` | TIMESTAMPTZ | Nullable |
| `revoked_by` | UUID | Admin ID if force-revoked |

Client can view and remove their own sessions. Admin can revoke any session. Revoking adds token JTI to Redis blacklist.

---

## NODE.JS BACKEND

**Runtime:** Node.js 20.x LTS
**Framework:** Fastify 4.x (real, maintained, faster than Express for high-traffic APIs)
**Language:** TypeScript 5.x
**ORM:** Prisma 5.x (real, maintained — https://prisma.io)
**Queue:** BullMQ 5.x (real, maintained — https://docs.bullmq.io) with Redis 7.x backend
**Validation:** Zod 3.x (real — https://zod.dev) for all request body validation

Do NOT use: `sequelize` (outdated patterns), `knex` alone without repository layer, `mongoose` (wrong DB).

### Service Structure

```
services/
  api-gateway/          # Reverse proxy + auth middleware + rate limiting
  auth-service/         # Registration, login, OTP, tokens, devices
  loan-service/         # Loan CRUD, workflow engine, repayment schedule
  payment-service/      # Daraja integration, callback handler, reconciliation
  notification-service/ # FCM push, SMS, email dispatcher
  queue-worker/         # BullMQ workers for all background jobs
  audit-service/        # Immutable audit log writer
```

### Repository Pattern

Every service has:
```
service/
  routes/         # Fastify route definitions only. No logic.
  controllers/    # Parse request, call service, return response.
  services/       # Business logic. Calls repositories.
  repositories/   # Database queries via Prisma only.
  schemas/        # Zod validation schemas for all request/response shapes.
  types/          # TypeScript interfaces and enums.
  utils/          # Pure utility functions.
```

---

## DATABASE DESIGN

**Database:** Supabase PostgreSQL 15 (https://supabase.com)
**ORM:** Prisma 5.x
**All money columns:** `NUMERIC(15,2)` — never FLOAT, never DOUBLE PRECISION
**All IDs:** UUID v4 generated by `gen_random_uuid()` at database level
**All tables:** include `created_at TIMESTAMPTZ DEFAULT NOW()`, `updated_at TIMESTAMPTZ DEFAULT NOW()`, `deleted_at TIMESTAMPTZ NULL` (soft delete)

### Core Tables

**`users`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
full_name VARCHAR(100) NOT NULL,
national_id VARCHAR(8) UNIQUE NOT NULL,
phone_number VARCHAR(15) UNIQUE NOT NULL,  -- E.164 format
password_hash VARCHAR(255) NOT NULL,
business_name VARCHAR(100),
business_type VARCHAR(50),
business_location VARCHAR(100),
profile_photo_path TEXT,
kyc_status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, VERIFIED, REJECTED
status VARCHAR(20) DEFAULT 'ACTIVE',       -- ACTIVE, SUSPENDED, DELETED
fcm_token TEXT,
date_of_birth DATE,
gender VARCHAR(10),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
deleted_at TIMESTAMPTZ
```

**`loans`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
reference_number VARCHAR(20) UNIQUE NOT NULL,  -- OYA-XXXXX format
user_id UUID REFERENCES users(id) NOT NULL,
loan_product_id UUID REFERENCES loan_products(id),
principal_amount NUMERIC(15,2) NOT NULL,
interest_rate NUMERIC(5,4) NOT NULL,           -- e.g., 0.1500 = 15%
total_interest NUMERIC(15,2) NOT NULL,
total_amount NUMERIC(15,2) NOT NULL,           -- principal + interest
total_repaid NUMERIC(15,2) DEFAULT 0,
balance_remaining NUMERIC(15,2),
total_penalties NUMERIC(15,2) DEFAULT 0,
number_of_weeks INTEGER NOT NULL,
weekly_installment NUMERIC(15,2) NOT NULL,
disbursement_date DATE,
expected_close_date DATE,
actual_close_date DATE,
status VARCHAR(30) DEFAULT 'DRAFT',
purpose VARCHAR(50),
approved_by UUID REFERENCES admins(id),
disbursed_by UUID REFERENCES admins(id),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
deleted_at TIMESTAMPTZ
```

**`installments`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
loan_id UUID REFERENCES loans(id) NOT NULL,
installment_number INTEGER NOT NULL,
due_date DATE NOT NULL,
amount_due NUMERIC(15,2) NOT NULL,
amount_paid NUMERIC(15,2) DEFAULT 0,
status VARCHAR(20) DEFAULT 'UNPAID',    -- UNPAID, PARTIAL, PAID
paid_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**`repayments`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
loan_id UUID REFERENCES loans(id) NOT NULL,
user_id UUID REFERENCES users(id) NOT NULL,
amount NUMERIC(15,2) NOT NULL,
mpesa_receipt_number VARCHAR(20) UNIQUE NOT NULL,
phone_number VARCHAR(15) NOT NULL,
payment_method VARCHAR(20) DEFAULT 'MPESA',
checkout_request_id VARCHAR(100),
transaction_date TIMESTAMPTZ NOT NULL,
applied_to_installment_id UUID REFERENCES installments(id),
reconciled BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**`penalties`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
loan_id UUID REFERENCES loans(id) NOT NULL,
installment_id UUID REFERENCES installments(id) NOT NULL,
days_overdue INTEGER NOT NULL,
amount NUMERIC(15,2) NOT NULL,
reason TEXT,
waived BOOLEAN DEFAULT FALSE,
waived_by UUID REFERENCES admins(id),
waived_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**`sessions`**
(Defined in Device Tracking section above)

**`audit_logs`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
actor_type VARCHAR(10) NOT NULL,    -- USER or ADMIN
actor_id UUID NOT NULL,
action VARCHAR(100) NOT NULL,
entity_type VARCHAR(50) NOT NULL,
entity_id UUID,
old_values JSONB,
new_values JSONB,
ip_address INET,
user_agent TEXT,
created_at TIMESTAMPTZ DEFAULT NOW()
-- NO updated_at. NO deleted_at. Audit logs are immutable.
```

**`security_events`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
event_type VARCHAR(50) NOT NULL,    -- FAILED_LOGIN, RATE_LIMIT_EXCEEDED, SUSPICIOUS_ACTIVITY, etc.
ip_address INET,
user_id UUID REFERENCES users(id),  -- nullable if pre-auth
device_fingerprint VARCHAR(64),
user_agent TEXT,
metadata JSONB,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**`payment_requests`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) NOT NULL,
loan_id UUID REFERENCES loans(id) NOT NULL,
amount NUMERIC(15,2) NOT NULL,
phone_number VARCHAR(15) NOT NULL,
idempotency_key VARCHAR(64) UNIQUE NOT NULL,
checkout_request_id VARCHAR(100) UNIQUE,
merchant_request_id VARCHAR(100),
status VARCHAR(20) DEFAULT 'PENDING',   -- PENDING, SUCCESS, FAILED, TIMEOUT
daraja_response JSONB,
callback_received_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**`payment_callbacks_raw`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
checkout_request_id VARCHAR(100),
raw_body JSONB NOT NULL,
source_ip INET,
processed BOOLEAN DEFAULT FALSE,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**`notifications`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID REFERENCES users(id) NOT NULL,
title VARCHAR(200) NOT NULL,
body TEXT NOT NULL,
type VARCHAR(50) NOT NULL,
data JSONB,
sent_via VARCHAR(20)[],     -- array: ['PUSH', 'SMS', 'EMAIL']
delivered BOOLEAN DEFAULT FALSE,
read_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW()
```

**`loan_products`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name VARCHAR(100) NOT NULL,
min_amount NUMERIC(15,2) NOT NULL,
max_amount NUMERIC(15,2) NOT NULL,
interest_rate NUMERIC(5,4) NOT NULL,
max_weeks INTEGER NOT NULL,
penalty_type VARCHAR(20) NOT NULL,    -- FLAT or PERCENTAGE
penalty_amount NUMERIC(15,2),
penalty_percentage NUMERIC(5,4),
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

**`admins`**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
full_name VARCHAR(100) NOT NULL,
email VARCHAR(200) UNIQUE NOT NULL,
password_hash VARCHAR(255) NOT NULL,
role VARCHAR(30) NOT NULL,
is_active BOOLEAN DEFAULT TRUE,
last_login_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW(),
deleted_at TIMESTAMPTZ
```

### Required Indexes

Create indexes on all foreign keys and all commonly queried columns:
```sql
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_installments_loan_id ON installments(loan_id);
CREATE INDEX idx_installments_due_date ON installments(due_date) WHERE status = 'UNPAID';
CREATE INDEX idx_repayments_loan_id ON repayments(loan_id);
CREATE INDEX idx_repayments_mpesa_receipt ON repayments(mpesa_receipt_number);
CREATE INDEX idx_sessions_user_id ON sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
```

---

## REDIS ARCHITECTURE

**Version:** Redis 7.x
**Client:** `ioredis` npm package (real, maintained — https://github.com/redis/ioredis)

### Key Naming Conventions

| Purpose | Key Pattern | TTL |
|---------|------------|-----|
| OTP storage | `otp:{phone}` | 300s |
| OTP attempt counter | `otp_attempts:{phone}` | 600s |
| Rate limit — login | `rl:login:{ip}` | 900s |
| Rate limit — general | `rl:api:{ip}` | 60s |
| Token blacklist | `blacklist:{jti}` | Remaining token TTL |
| Idempotency key | `idempotency:{sha256}` | 300s |
| Session cache | `session:{session_id}` | 1800s |
| Loan balance cache | `loan_balance:{loan_id}` | 300s |
| User cache | `user:{user_id}` | 3600s |
| Maintenance mode | `maintenance:active` | No TTL (manual set/del) |
| Abuse IP ban | `ban:ip:{ip}` | 86400s (24hr) |
| Queue metrics | `queue:metrics:{queue_name}` | 60s |

### Queue Names (BullMQ)

| Queue | Workers | Purpose |
|-------|---------|---------|
| `notifications` | 3 | Send push, SMS, email |
| `audit-logs` | 2 | Write audit records asynchronously |
| `payment-reconciliation` | 1 | Daily Daraja reconciliation |
| `penalty-calculation` | 1 | Daily penalty cron |
| `document-processing` | 2 | KYC document resize/store |
| `loan-status-alerts` | 1 | Overdue reminders |

All queues must have:
- Retry: 3 attempts with exponential backoff (1s, 5s, 25s).
- Dead-letter queue: `{queue-name}:failed` — store permanently for manual review.
- Job timeout: 30 seconds. Kill hung jobs.
- Alert admin if any queue depth exceeds 1000 jobs.

---

## NOTIFICATION SYSTEM

**Push:** Firebase Cloud Messaging (FCM) via `firebase-admin` npm package v12.x (real)
**SMS:** Africa's Talking Node.js SDK (`africastalking` npm package — real, maintained)
**Email:** Nodemailer with SMTP (real) or Resend API (`resend` npm package — real, maintained)

### Notification Templates

| Event | Push | SMS | Email |
|-------|------|-----|-------|
| Loan approved | ✓ | ✓ | ✓ |
| Loan disbursed | ✓ | ✓ | ✓ |
| Payment received | ✓ | ✓ | — |
| Installment due tomorrow | ✓ | ✓ | — |
| Installment overdue (day 1) | ✓ | ✓ | — |
| Installment overdue (day 3) | ✓ | ✓ | ✓ |
| Loan closed | ✓ | ✓ | ✓ |
| New device login | ✓ | ✓ | — |
| Password changed | ✓ | ✓ | ✓ |
| Suspicious activity | ✓ | ✓ | ✓ |

All notifications are sent via BullMQ `notifications` queue. The notification service worker dequeues and dispatches. APIs never wait synchronously for notification delivery.

---

## LOGGING AND MONITORING

**Structured Logging:** `pino` npm package v9.x (real — https://getpino.io) — use in all Node.js services
**Log Aggregation:** Grafana Loki (real — https://grafana.com/oss/loki/) — collect logs from all containers
**Metrics:** Prometheus (real — https://prometheus.io) — expose `/metrics` endpoint on each service
**Dashboards:** Grafana (real — https://grafana.com)
**Error Tracking:** Sentry (real — https://sentry.io) — `@sentry/node` npm package

Do NOT use: imaginary logging platforms.

### What to Log

Every HTTP request: `{ method, url, status, latency_ms, user_id, ip, request_id }`
Every authentication event: `{ event_type, user_id, ip, device_fingerprint, success }`
Every payment event: `{ event_type, loan_id, amount, mpesa_receipt, status }`
Every queue job: `{ queue, job_id, status, attempts, latency_ms }`
Every admin action: `{ admin_id, action, entity_type, entity_id, ip }`

### Prometheus Metrics to Expose

```
http_requests_total{method, route, status_code}
http_request_duration_seconds{method, route}
auth_login_attempts_total{result}       # success / failure
payment_initiated_total
payment_success_total
payment_failure_total
queue_depth{queue_name}
queue_job_duration_seconds{queue_name}
db_query_duration_seconds{operation}
redis_cache_hit_total
redis_cache_miss_total
active_websocket_connections
```

### Alerts

Configure Grafana alerts for:
- API p99 latency > 2000ms for 5 consecutive minutes
- Payment failure rate > 10% in 10-minute window
- Failed logins > 100 in 5 minutes (DDoS/brute force)
- Any queue depth > 1000 jobs
- Any service container restart (Docker restart counter)
- Database connection pool exhausted
- Redis memory usage > 80%

---

## BACKUP AND DISASTER RECOVERY

### Backup Schedule

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| PostgreSQL incremental | Hourly | 7 days | Supabase built-in + offsite S3-compatible |
| PostgreSQL full dump | Daily at 03:00 EAT | 30 days | Encrypted, offsite |
| PostgreSQL full dump | Weekly (Sunday) | 12 months | Encrypted, offsite |
| Redis AOF persistence | Continuous | 7 days | Same host + offsite copy daily |
| Uploaded documents | Continuous (Supabase Storage) | Indefinite | Supabase Storage (S3-backed) |
| Audit logs export | Daily | 7 years | Encrypted archive |
| Docker image versions | Per deploy | 10 versions | Container registry |

**Offsite storage:** Use Backblaze B2 (real, cheap, S3-compatible — https://www.backblaze.com/cloud-storage) or AWS S3.

**Encryption:** Encrypt all backup archives with AES-256 before upload. Store encryption keys in a separate secrets manager (HashiCorp Vault — real, https://vaultproject.io — or DigitalOcean Managed Secrets).

### Recovery Objectives

- **RPO (Recovery Point Objective):** Maximum 1 hour of data loss.
- **RTO (Recovery Time Objective):** Full system restoration within 30 minutes.

### Disaster Recovery Runbook

1. **Database compromise:** Immediately revoke all Supabase API keys. Restore from last clean hourly backup. Replay transaction logs from backup to minimize data loss. Force-invalidate all active sessions (flush Redis session keys + add all active JTIs to blacklist with 24hr TTL). Notify all users via SMS.
2. **Container compromise:** Tear down affected container. Pull clean image from registry. Redeploy from last known-good image tag.
3. **Redis compromise:** Flush Redis entirely. Sessions will require re-login (acceptable). Rebuild rate limit counters from zero.
4. **Full server compromise:** Restore from latest Docker Compose config + environment variables (stored in secrets manager, not repository). Restore DB from offsite backup. Restore Redis from AOF backup.
5. **DDoS attack:** Activate Cloudflare Under Attack Mode via API. Enable maintenance mode flag in Redis. Restore once traffic normalizes.

---

## APP VERSION CONTROL

The backend serves a version manifest at `/api/version` endpoint:

```json
{
  "minimum_supported_version": "1.2.0",
  "latest_version": "1.5.1",
  "force_update_below": "1.2.0",
  "update_message": "A required security update is available.",
  "platform": "android"
}
```

On app launch, Flutter app calls this endpoint. Logic:
- If `app_version < minimum_supported_version`: block app, show mandatory update dialog with link to Play Store / App Store.
- If `app_version < latest_version` but >= minimum: show optional update banner.
- If `app_version == latest_version`: no action.

Update the version manifest without redeploying by storing it in Redis or the database. Admins update it via admin dashboard.

---

## DEVOPS AND CI/CD

### Docker Compose (Development + Staging)

Services in `docker-compose.yml`:
- `api-gateway` — Fastify, port 3000
- `auth-service` — Fastify, port 3001
- `loan-service` — Fastify, port 3002
- `payment-service` — Fastify, port 3003
- `notification-service` — Fastify, port 3004
- `queue-worker` — BullMQ workers, no HTTP
- `admin-dashboard` — React Vite, port 5173 (dev) / NGINX port 80 (prod)
- `redis` — Redis 7 Alpine, port 6379
- `nginx` — NGINX reverse proxy, ports 80 and 443
- `prometheus` — Prometheus, port 9090
- `grafana` — Grafana, port 3030
- `loki` — Grafana Loki, port 3100

**Container resource limits (set in docker-compose.yml):**
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.1'
      memory: 128M
```

### NGINX Configuration

```nginx
server {
  listen 443 ssl http2;
  server_name api.oyamicrocredit.co.ke;

  ssl_certificate /etc/letsencrypt/live/api.oyamicrocredit.co.ke/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.oyamicrocredit.co.ke/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_prefer_server_ciphers on;

  client_max_body_size 15M;
  client_body_timeout 30s;
  client_header_timeout 30s;
  keepalive_timeout 65;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header X-Frame-Options DENY always;
  add_header X-Content-Type-Options nosniff always;

  limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
  limit_req zone=api burst=50 nodelay;

  location / {
    proxy_pass http://api-gateway:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Use **Let's Encrypt + Certbot** (real, free SSL — https://certbot.eff.org) for SSL certificates.

### GitHub Actions Pipeline

```yaml
on: [push, pull_request]

jobs:
  lint-and-test:
    - Lint TypeScript (eslint + tsc --noEmit)
    - Run unit tests (Jest or Vitest — both real)
    - Run integration tests against test database (Supabase local dev via supabase CLI)

  security-scan:
    - Audit npm dependencies (npm audit)
    - SAST scan with CodeQL (GitHub native — free)
    - Secret scanning (git-secrets or TruffleHog)

  build:
    - Build Docker images
    - Tag with commit SHA and semantic version

  deploy-staging:
    - Push images to container registry (Docker Hub or GitHub Container Registry)
    - SSH deploy to staging server via appleboy/ssh-action (real GitHub Action)

  deploy-production:
    - Manual approval gate required
    - Deploy only from main branch
    - Health check after deploy
    - Auto-rollback if health check fails within 60 seconds
```

---

## TESTING REQUIREMENTS

**Unit Testing:** Vitest (real — https://vitest.dev) for Node.js services; `flutter_test` (built-in) for Flutter
**Integration Testing:** Supertest (real — https://github.com/ladjs/supertest) for API routes
**Load Testing:** k6 (real — https://k6.io)
**Mobile UI Testing:** `flutter_driver` (deprecated) → use `integration_test` package (Flutter official)
**E2E Admin Dashboard Testing:** Playwright (real — https://playwright.dev)

### Test Scenarios

**Unit tests required for:**
- Phone number normalization and validation (all valid and invalid patterns)
- National ID validation
- OTP generation and TTL expiry logic
- Idempotency key generation (verify two identical payments in same minute produce same key)
- Repayment schedule calculation (verify decimal math is correct)
- Penalty calculation (flat and percentage)
- JWT creation and verification
- Token blacklist check

**Integration tests required for:**
- Full registration → OTP → login flow
- Loan application → approval → disbursement flow
- Payment initiation → Daraja mock → callback → balance update flow
- Duplicate callback idempotency (send same callback twice, verify balance updated once)
- Rate limiting (verify lockout triggers at correct attempt count)
- Session revocation (verify revoked session returns 401)
- IDOR prevention (verify user A cannot access user B's data)

**Load tests required for:**
- 1,000 concurrent logins (verify rate limiter and no session crossover)
- 500 concurrent payment callbacks (verify no duplicate credits)
- 10,000 requests/minute to general API (verify NGINX + Redis rate limiting holds)

---

## FINAL SYSTEM CONSTRAINTS

The system MUST NEVER:
- Use floating-point arithmetic for money. Use `decimal.js` in Node.js and `NUMERIC(15,2)` in PostgreSQL.
- Log passwords, OTPs, or JWT secrets.
- Store JWT secrets or API keys in source code or git repository. Use environment variables loaded from secrets manager.
- Allow unauthenticated access to any endpoint except: `/auth/login`, `/auth/register`, `/auth/otp/send`, `/auth/otp/verify`, `/payments/callback` (IP-restricted), `/api/version`.
- Read user roles from JWT payload. Always read from database.
- Allow direct database access from Flutter app. All data access through the API only.
- Silently fail on payment processing. Every error must be logged, alerted, and placed in dead-letter queue for manual review.
- Use `eval()` or `Function()` constructor anywhere in Node.js codebase.
- Disable SSL certificates validation anywhere (no `rejectUnauthorized: false` in production).
- Store session data in client-accessible localStorage on web. Use HTTP-only cookies only.

---

## CONTACT AND SOCIAL (For Footer and About Screen)

```
OYA Micro-Credit Company Limited
Kilimani, Nairobi — P.O. Box 36513-00200
Phone: +254 709 030 000 | +254 730 030 000
WhatsApp: +254 730 030 000
Email: info@oyamicrocredit.co.ke
Facebook: https://www.facebook.com/profile.php?id=100083051686789
Instagram: https://www.instagram.com/oyamicrocreditkenya
LinkedIn: https://www.linkedin.com/in/oya-micro-credit-070490265

Mission: To help support and grow small businesses across Africa by providing quick,
and convenient access to credit.

Certifications:
- Registered: Companies Act 2015 — Reg No. PVT-AJUXZ57A
- CBK Letter of No Objection — Ref No. BSD/GEN/62
- Office of Data Commissioner — Cert No. 411-169C-C0EE
```