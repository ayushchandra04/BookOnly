# Bookify

A movie/concert ticket booking platform: visual seat maps with real-time
status, TTL-based seat holds with auto-release, a waitlist with automatic
seat assignment on cancellation, and QR-coded email tickets.

See [DESIGN.md](./DESIGN.md) for the system design write-up (seat hold/TTL,
concurrency prevention, waitlist cascade, time-limited offers).

## Stack

- **Next.js 16** (App Router) — single full-stack app: React frontend + Route
  Handlers as the backend API
- **MongoDB + Mongoose** — must be a replica set (Atlas free tier qualifies),
  because seat-hold/booking/waitlist logic relies on multi-document
  transactions
- Plain JavaScript throughout, no TypeScript
- **JWT auth** in an httpOnly cookie, roles: `customer` / `organiser` / `admin`
- **`qrcode`** for ticket QR generation, **Nodemailer + Gmail SMTP** for email
- Tailwind CSS

## Project layout

```
app/                     pages (React) + api/ (Route Handlers)
  api/auth/               register, login, logout, me
  api/venues/              admin: create/list/delete venues + seat layout
  api/events/              browse events; [id]/seats, /hold, /waitlist
  api/bookings/            confirm, list, cancel
  api/waitlist/offer/      accept a time-limited waitlist offer
  api/organiser/events/    organiser's events + revenue summary
  api/cron/sweep/          releases expired holds, cascades waitlist offers
lib/
  db.js                   Mongoose connection singleton
  models/                 User, Venue, Event, Seat, Booking, WaitlistEntry
  auth.js, apiAuth.js      session/JWT helpers, role guards
  seatService.js          all concurrency-critical hold/book/cancel/waitlist logic
  email.js, qrcode.js
components/               client components (SeatMap, forms, nav, etc.)
scripts/
  seedAdmin.js            create the first admin account
  cron.js                 node-cron sweep loop for non-serverless deployments
proxy.js                  role-based page redirects (Next 16's middleware replacement)
vercel.json               cron config for the /api/cron/sweep sweep on Vercel
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

- **`MONGODB_URI`** — a MongoDB **replica set** connection string. Easiest
  option: a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
  M0 cluster (Atlas clusters are replica sets by default, even on the free
  tier) — create a cluster, add a database user, allow your IP (or
  `0.0.0.0/0` for simplicity while developing), and copy the connection
  string.
- **`JWT_SECRET`** / **`CRON_SECRET`** — any long random string, e.g.
  `openssl rand -base64 32`.
- **`APP_BASE_URL`** — `http://localhost:3000` for local dev; your deployed
  URL in production.
- **`GMAIL_USER`** / **`GMAIL_APP_PASSWORD`** — a Gmail address with 2-Step
  Verification enabled, and an
  [App Password](https://myaccount.google.com/apppasswords) generated for it
  (**not** your normal Gmail password). If left unset, emails are logged to
  the server console instead of sent — useful for developing without email
  set up yet.

### 3. Create an admin account

Public registration only allows signing up as `customer` or `organiser`
(admin accounts manage venues, which isn't something you want open
registration for). Seed the first admin directly:

```bash
npm run seed:admin -- "Admin Name" admin@example.com "somePassword123"
```

### 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`. Log in as the seeded admin to create a venue
(with its seat layout and categories), then log in as an organiser (register
one from the UI) to create an event at that venue, then browse/book as a
customer (register another account).

### 5. Run the sweep scheduler (local / non-Vercel only)

The seat-hold and waitlist-offer TTL sweep also runs lazily on every relevant
read/write (see DESIGN.md), so the app is correct without this — but without
it, an event nobody is actively viewing won't cascade its waitlist offers
promptly. On a persistent server (local dev, Render, Railway):

```bash
npm run cron
```

On Vercel, `vercel.json` configures this as a scheduled Cron Job instead (see
Deployment below) — don't run `npm run cron` there.

## Deployment (Vercel)

1. Push this repo to GitHub and import it in Vercel.
2. Add all the variables from `.env.example` as Vercel project environment
   variables (use your production Gmail/Atlas/secret values;
   `APP_BASE_URL` should be your `https://your-app.vercel.app` URL).
3. Set `CRON_SECRET` — Vercel automatically sends it as
   `Authorization: Bearer <CRON_SECRET>` on requests it makes to your cron
   routes, which `/api/cron/sweep` checks for.
4. Deploy. `vercel.json` registers `/api/cron/sweep` to run once daily
   (`0 3 * * *`) — **Vercel's Hobby (free) plan only permits daily cron jobs**;
   a more frequent expression is rejected at deploy time.
   > This does not affect correctness: expired holds and waitlist offers are
   > swept lazily on every seat-map read and hold attempt (see DESIGN.md), so
   > any event someone is actually looking at self-cleans immediately. The
   > cron is only a backstop for events nobody is currently viewing.
   >
   > If you want that backstop to fire more often than daily, either upgrade
   > to Vercel Pro, or point a free external pinger (e.g.
   > [cron-job.org](https://cron-job.org)) at
   > `POST https://your-app.vercel.app/api/cron/sweep` with an
   > `Authorization: Bearer <CRON_SECRET>` header every 1–5 minutes.

MongoDB Atlas and Gmail App Passwords both need your own free accounts —
sign-up isn't something this repo can automate for you.

## Data model / DB schema

All documents live in one MongoDB database. See `lib/models/*.js` for the
authoritative Mongoose schemas; summary:

| Collection | Key fields | Notes |
|---|---|---|
| `User` | name, email (unique), passwordHash, role | role: customer / organiser / admin |
| `Venue` | name, address, categories[], layout: { rows, cols, seats[] } | layout.seats is a *template*: `{ row, col, label, category }` per seat |
| `Event` | title, description, posterUrl, type, organiserId, venueId, date, time, categoryPricing[], status | one Event = one showtime at one venue. `posterUrl` is an optional https image; blank falls back to a generated gradient poster |
| `Seat` | eventId, row, col, label, category, status, heldBy, holdExpiresAt, bookingId, waitlistEntryId | **one document per physical seat per event** — instantiated from the venue's layout template when the event is created. `status`: available / held / offered / booked |
| `Booking` | eventId, customerId, seatIds[], totalAmount, bookingRef (unique), status, source | source: direct / waitlist |
| `WaitlistEntry` | eventId, category, customerId, status, offerToken, offerSeatId, offerExpiresAt | FIFO queue per (eventId, category), ordered by `createdAt`. status: waiting / offered / expired / booked / cancelled |

Seats are modeled as independent top-level documents (not an array embedded
in `Event`) specifically so that holding/booking a seat is a single atomic
document write — see DESIGN.md for why that's what makes the concurrency
guarantee correct.

## API reference

All endpoints are under `/api`. Auth is a `tbs_session` httpOnly JWT cookie,
set by `/api/auth/login` and `/api/auth/register`. Errors are
`{ "error": "message" }` with an appropriate HTTP status.

### Auth
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | — | `{ name, email, password, role? }` | role: customer \| organiser (default customer) |
| POST | `/api/auth/login` | — | `{ email, password }` | |
| POST | `/api/auth/logout` | — | | |
| GET | `/api/auth/me` | — | | Current session user, or `{ user: null }` |

### Venues (admin manages, admin/organiser read)
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/api/venues` | admin/organiser | | List venues |
| POST | `/api/venues` | admin | `{ name, address, categories[], layout: { rows, cols, seats[] } }` | Create venue + seat layout |
| GET | `/api/venues/:id` | admin/organiser | | |
| DELETE | `/api/venues/:id` | admin | | Fails 409 if any Event references it |

### Events (browse is public)
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/api/events?type=&date=&q=` | — | | Browse/filter scheduled events |
| POST | `/api/events` | organiser | `{ title, description?, posterUrl?, type, venueId, date, time, categoryPricing[] }` | Also instantiates one `Seat` per venue-layout seat. `posterUrl` must be `https://` if given |
| GET | `/api/events/:id` | — | | |
| GET | `/api/events/:id/seats` | — | | Real-time seat map (runs the lazy expiry sweep first) |
| POST | `/api/events/:id/hold` | customer | `{ seatIds[] }` (max 8) | Atomically holds seats, all-or-nothing |
| DELETE | `/api/events/:id/hold` | customer | `{ seatId }` | Release one held seat (deselect) |
| POST | `/api/events/:id/release-beacon` | customer | `{ seatIds[] }` | `navigator.sendBeacon` target for releasing on tab close |
| GET | `/api/events/:id/waitlist` | customer | | This customer's waitlist entries for the event |
| POST | `/api/events/:id/waitlist` | customer | `{ category }` | Join the waitlist for a sold-out category |

### Bookings
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/api/bookings` | customer | | Booking history |
| POST | `/api/bookings` | customer | `{ eventId, seatIds[] }` | Confirms currently-held seats; sends QR email |
| GET | `/api/bookings/:id` | customer (owner) | | |
| POST | `/api/bookings/:id/cancel` | customer (owner) | | Cancels; cascades freed seats to the waitlist |

### Waitlist offers
| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/api/waitlist/offer/:token/accept` | customer (invited) | | Preview an offer (expired or not) |
| POST | `/api/waitlist/offer/:token/accept` | customer (invited) | | Converts the offer into a confirmed Booking |

### Organiser
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/organiser/events` | organiser | This organiser's events |
| GET | `/api/organiser/events/:id/summary` | organiser (owner) | Bookings/seats-sold/revenue, overall and by category |

### Ops
| Method | Path | Auth | Description |
|---|---|---|---|
| GET/POST | `/api/cron/sweep` | `Authorization: Bearer <CRON_SECRET>` if set | Releases expired holds, cascades expired waitlist offers, emails new offers |

## Seat hold & waitlist logic — quick reference

Full write-up in [DESIGN.md](./DESIGN.md). Short version:

- A seat hold is one atomic conditional MongoDB write
  (`status: "available" → "held"`), so two simultaneous requests for the same
  seat can never both succeed — one gets a 409.
- Holding multiple seats at once, confirming a booking, cancelling a booking,
  and accepting a waitlist offer are each wrapped in a MongoDB transaction for
  all-or-nothing correctness.
- TTL expiry is enforced two ways: lazily on every relevant read/write
  (so correctness never depends on a scheduler's timing), and by a scheduled
  sweep (`/api/cron/sweep`) that also drives the waitlist cascade for events
  nobody is currently viewing.
- Cancelling a booking (or an unclaimed waitlist offer expiring) atomically
  offers the freed seat to the oldest `waiting` entry in that event+category's
  FIFO queue, turning it into a time-limited `offered` seat with an emailed
  accept link. If unclaimed in time, the same mechanism cascades it to the
  next person in line.

## Testing without a real MongoDB Atlas account

For local development/review without signing up for Atlas, you can point
`MONGODB_URI` at any MongoDB **replica set** you control — for example a
local `mongod --replSet rs0` (with `rs.initiate()` run once), or a
Docker container configured the same way. It just needs to be a replica set,
since the app relies on multi-document transactions.
