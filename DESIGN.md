# System Design — Bookify

## Seat hold & TTL mechanism

Each seat is its own MongoDB document (`Seat`), not an element embedded in an
`Event` array. That choice is what makes holds atomic: MongoDB only guarantees
atomicity within a single document, so a hold is a single conditional write —
`findOneAndUpdate({ _id, status: "available" }, { status: "held", heldBy, holdExpiresAt })`.
Exactly one concurrent request can match `status: "available"`; every other
concurrent request for the same seat gets `null` back and the API returns
409 Conflict. No locking primitive is needed for the single-seat case because
MongoDB's per-document write serialization *is* the lock.

Selecting multiple seats at once needs all-or-nothing semantics, so `holdSeats`
wraps the per-seat conditional updates in a MongoDB transaction (`session.withTransaction`,
which also retries on transient write conflicts per the driver's documented
pattern). If any seat in the batch is unavailable, the whole transaction aborts
and none of the seats are held — a customer never ends up holding 2 of the 3
seats they selected.

TTL expiry uses two mechanisms together, deliberately avoiding a single point
of failure:

1. **Lazy, on-read expiry.** Every seat-map read and hold attempt first calls
   `sweepExpiredForEvent(eventId)`, flipping any seat with `status: "held"`
   and `holdExpiresAt < now` back to `available` before continuing.
   Correctness never depends on a background job running on schedule — even
   if the scheduler is late or down, the next person who looks at that
   event's seat map triggers the cleanup themselves.
2. **A scheduled sweep** (`/api/cron/sweep`) doing the same cleanup in bulk
   across *all* events, so seats and offers get released even for events
   nobody is viewing. In production (Vercel) `vercel.json`'s cron config
   drives this; on a persistent server (Render/Railway/local dev)
   `scripts/cron.js` runs the equivalent loop with `node-cron`.

The frontend also calls `navigator.sendBeacon` on `pagehide` to proactively
release a customer's held seats when they close the tab or navigate away,
rather than making other customers wait out the full TTL.

## Concurrency prevention

The core guarantee — two customers can never hold or book the same seat — comes
from treating every state transition on a `Seat` document as a conditional
write keyed on its *current* status, never an unconditional "set status to X":

- Hold: `available → held` only if currently `available`.
- Confirm: `held → booked` only if currently `held` **and** `heldBy` matches
  the confirming user.
- Waitlist claim: `waiting → offered` on the `WaitlistEntry`, and `available → offered`
  on the `Seat`, both inside one transaction, so two seats freed at nearly the
  same instant can't both be handed to the same waitlisted customer.

Because these are single conditional writes (or a transaction of several),
there's no lock table, no `SELECT` followed by a racy `UPDATE`, and no "lost
update" — the database itself arbitrates who wins a race for a seat.

## Waitlist auto-assignment flow

A customer joins a `WaitlistEntry` queue scoped to `(eventId, category)`, ordered
FIFO by `createdAt`. A seat becomes available for the waitlist in exactly two
situations: a booking containing it is cancelled, or a previously-offered seat's
offer expires unclaimed. Both paths call the same helper, `tryCreateWaitlistOffer`,
inside a transaction:

```
findOneAndUpdate(
  { eventId, category, status: "waiting" },
  { $set: { status: "offered", offerToken, offerSeatId, offerExpiresAt } },
  { sort: { createdAt: 1 } }
)
```

The `sort` picks the oldest waiting entry; the `$set` claims it in the same
atomic document write. If two seats in the same category free up concurrently,
each cascade call is its own atomic claim against the queue, so the two oldest
distinct waiting customers get the two offers — never the same one twice. If
no one is waiting, the seat is simply released back to `available` instead.

## Time-limited offer handling

Claiming a waitlist spot doesn't book it outright — it creates a time-limited
offer: the seat's status becomes `offered`, `holdExpiresAt` is set to
`now + WAITLIST_OFFER_TTL_MINUTES`, and the customer is emailed a link
containing a single-use `offerToken`. Visiting that link shows the offer
(rejecting it if already expired) and lets the customer convert it into a real
`Booking` via `acceptWaitlistOffer`, which re-checks the seat is still
`status: "offered"` and owned by that `WaitlistEntry` before booking it — so a
click that arrives after the offer has already cascaded away is rejected
rather than double-booking.

If the offer window elapses unclaimed, the same sweep that expires plain
holds also detects `status: "offered"` seats past their `holdExpiresAt`,
marks that `WaitlistEntry` as `expired`, and immediately calls
`tryCreateWaitlistOffer` again for the same seat — cascading to the next
person in the FIFO queue, or releasing it to general availability if the
queue is empty. The whole offer chain runs on the same two mechanisms (lazy
sweep + scheduled sweep) used for ordinary holds, with no bespoke waitlist
scheduling logic needed.
