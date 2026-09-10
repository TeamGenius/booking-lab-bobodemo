# Booking Lab — BOBO / Gift Booking sandbox

Prototype UI and in-memory backend for **LP-2112 — Booking on Behalf of Others (BOBO)**. Nothing here talks to Square, SendGrid, HumanGo, or the production HPH database — the goal is to iterate on the customer-facing flow before wiring it into `HPH.Core.API` + `HPH.Admin.Web`.

Canonical references:

- PRD — [Booking on Behalf of (BOBO)](https://humango.atlassian.net/wiki/spaces/PM/pages/837255170)
- Technical Implementation Spec — [BOBO Technical Implementation Spec](https://humango.atlassian.net/wiki/spaces/HL/pages/898269186)
- Epic — [LP-2112](https://humango.atlassian.net/browse/LP-2112)

## Contents

| Path                 | Description                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `booking-lab-web/`   | Vite + React 19 + Mantine v8 + urql frontend. Router-driven pages for Purchaser and Recipient flows.                    |
| `booking-lab-server/`| `graphql-yoga` (Node + TypeScript) backend with an in-memory session store. Restart wipes all sessions.                 |
| `render.yaml`        | Render Blueprint that deploys both services in one click (see [Deploy](#deploy)).                                       |

## Local development

Requires Node 20+.

```bash
# From the repo root
npm install            # installs both workspaces
npm run dev            # concurrent: server on :4000, web on :5173
```

- Web: <http://localhost:5173/>
- GraphQL: <http://localhost:4000/graphql>

Individual workspaces:

```bash
npm run dev:server     # graphql-yoga only
npm run dev:web        # Vite only
```

## Configuration

| Variable            | Where     | Default                          | Purpose                                                                                                 |
| ------------------- | --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `PORT`              | server    | `4000`                           | HTTP port for graphql-yoga.                                                                             |
| `CORS_ORIGINS`      | server    | `http://localhost:5173`          | Comma-separated allow-list. Use `*` for a public demo.                                                  |
| `VITE_GRAPHQL_URL`  | web build | `http://localhost:4000/graphql`  | GraphQL endpoint baked into the Vite build. Set this to the deployed server URL in production.          |

## What the sandbox demonstrates

The flow implements PRD **Step 3 — "Who is this for?"** with three modes:

| Mode                   | Meaning                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `SELF`                 | Purchaser = Recipient = Athlete (self-serve).                                                                   |
| `GIFT_SCHEDULE_NOW`    | **Phase 1A** — Purchaser picks the slot on the Recipient's behalf. Server-side: `finalizeBooking(isGiftBooking:true)`. |
| `GIFT_SCHEDULE_LATER`  | **Phase 1B / MVP** — Purchaser pays now, Recipient signs in and schedules later. Server-side: `finalizeGiftBooking` + `claimGiftBooking`. |

Key behaviors mirrored from the Tech Spec:

- Purchaser identity is JWT-driven (Business Rule 3, Spec §7.4, §10 Resolved Decision #1).
- `claimGiftBooking` rejects self-gift when `caller.userId == purchaser.userId` (Spec §9).
- Recipient flow locks included modules (**FR-6**) and suppresses pricing (**FR-7**).
- The claim URL is the raw `BookingId` GUID — security relies on GUID entropy + auth on `claimGiftBooking` (Spec §9, §10 Resolved Decision #7).

### Static GitHub Pages claim links

Production resolves the `BookingId` GUID through the authenticated Core API. The GitHub
Pages build has no shared database, so its generated recipient links append a versioned,
base64url-encoded snapshot containing only the booking, site, and service IDs. The browser
validates those IDs against the seeded catalog before hydrating the mock booking. This keeps
the recipient demo portable across browser profiles and devices without putting names,
emails, payment details, or prices in the URL.

Older demo links containing only a GUID cannot be reconstructed outside the purchaser's
browser and must be regenerated. The optional Node server also uses process memory, so it is
not a durable substitute for the production database.

Tooltips in the UI cite the specific PRD / Spec sections they enforce.

## Non-goals

This is a sandbox. It intentionally does **not**:

- persist data across restarts,
- integrate with Square, SendGrid, HumanGo, or `HPH.Core.API`,
- issue real JWTs (identity is simulated via a session-store field),
- enforce production auth on the GraphQL endpoint,
- implement discount tier logic, scheduling optimization, or receipt snapshotting (per PRD §2 Non-Goals).

Refer to the PRD and Tech Spec above for the production behavior this UX will eventually plug into.
