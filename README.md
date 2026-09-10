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

Tooltips in the UI cite the specific PRD / Spec sections they enforce.

## Deploy

### Option A — Render Blueprint (recommended, both services on free tier)

1. Sign in to <https://dashboard.render.com> with a Render account that has access to `TeamGenius`.
2. **New +** → **Blueprint** → point at this repo (`TeamGenius/booking-lab-bobodemo`).
3. Render reads [`render.yaml`](./render.yaml) and provisions:
   - `booking-lab-server` — Node web service running `npm start` (graphql-yoga).
   - `booking-lab-web` — static site built by `npm run build` and served from `dist/`.
4. After the first deploy:
   - Copy the server's public URL (e.g. `https://booking-lab-server.onrender.com`) and set `VITE_GRAPHQL_URL=https://booking-lab-server.onrender.com/graphql` on the **booking-lab-web** service, then trigger a redeploy so Vite bakes the URL into the bundle.
   - Set `CORS_ORIGINS` on **booking-lab-server** to the static site URL (or leave `*` for a public demo).

Free-plan caveats: the server sleeps after 15 min of inactivity and cold-starts on the next request. Sessions are in-memory, so any restart wipes them — this is fine for a demo.

### Option B — Vercel (web) + Railway/Fly.io (server)

- **Web**: import the repo into Vercel, set **Root Directory** to `booking-lab-web`, build command `npm run build`, output directory `dist`, and env var `VITE_GRAPHQL_URL` pointing at the deployed server.
- **Server**: deploy `booking-lab-server/` as a Node service on Railway or Fly.io with `npm start`, `PORT` from the platform, and `CORS_ORIGINS` set to the Vercel URL.

Serverless functions (Vercel/Netlify Functions) are **not** recommended for the server — every invocation is a fresh process, so the in-memory session store would be wiped between requests.

### Option C — Single container (advanced)

Build the Vite bundle and serve it as static assets from the same graphql-yoga process. Not implemented here; would require adding a static-file middleware to the server and dropping the separate `booking-lab-web` deploy.

## Non-goals

This is a sandbox. It intentionally does **not**:

- persist data across restarts,
- integrate with Square, SendGrid, HumanGo, or `HPH.Core.API`,
- issue real JWTs (identity is simulated via a session-store field),
- enforce production auth on the GraphQL endpoint,
- implement discount tier logic, scheduling optimization, or receipt snapshotting (per PRD §2 Non-Goals).

Refer to the PRD and Tech Spec above for the production behavior this UX will eventually plug into.
