# Mock server & Test Lab

Tachy includes a **built-in mock API** so you can exercise every request scenario
locally with no external services. It lives at **`/api/mock/*`** and is
implemented by a single catch-all route
([`src/app/api/mock/[[...path]]/route.ts`](../src/app/api/mock/[[...path]]/route.ts)).

- **Base URL:** `http://localhost:3000/api/mock`
- **Storage:** in-memory (resets when the dev server restarts). The user store is
  kept on `globalThis` so it survives hot reloads during a session.
- **Verbs:** all of `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`
  are routed to the same handler.

## Endpoint reference

### `GET /` (index)

Returns a service banner listing all available endpoints.

### `ANY /echo`

Reflects your request back: method, path, query, headers, parsed body, and a
`receivedAt` timestamp. JSON and `x-www-form-urlencoded` bodies are parsed; other
content types are returned as text.

```json
{
  "method": "POST",
  "path": "/echo",
  "query": { "foo": "bar" },
  "headers": { "...": "..." },
  "body": { "hello": "world" },
  "receivedAt": "2025-..."
}
```

### `GET /json`

A fixed sample payload with nested objects and arrays — handy for testing the
pretty viewer and assertions.

### `GET /status/:code`

Responds with the HTTP status you ask for (clamped to 100–599; defaults to 200).

```
GET /status/404  → 404 Not Found
GET /status/418  → 418 I'm a teapot
GET /status/500  → 500 Internal Server Error
```

### `GET /delay/:ms`

Waits `:ms` milliseconds (clamped to 0–15000) before responding. Use it to test
timeouts and to see the response-time metric move.

### `GET /headers`

Returns all headers the server received, plus a count.

### `GET /cookies`

Sets two demo cookies (`tachy_session` — httpOnly, `tachy_theme=dark`) so you can
inspect the **Cookies** response tab.

### `GET /redirect`

Returns a `302` to `/api/mock/echo`. Useful for testing redirect following.

### `GET /error`

Always returns a `500` with an error payload — for negative-path tests.

### `GET /random`

Returns a randomly generated user record (faker-style names/emails/roles).

### Users CRUD — `/users` and `/users/:id`

A full in-memory CRUD resource, seeded with three users (Ada Lovelace, Alan
Turing, Grace Hopper).

| Method | Path | Result |
|---|---|---|
| `GET` | `/users` | `{ data: [...], total }` |
| `POST` | `/users` | Creates a user → `201` `{ data, message }` |
| `GET` | `/users/:id` | Single user, or `404` |
| `PUT` / `PATCH` | `/users/:id` | Merges updates → updated user |
| `DELETE` | `/users/:id` | Removes and returns the user |

Create body shape (all optional):

```json
{ "name": "New User", "email": "new@tachy.dev", "role": "viewer", "active": true }
```

`role` is one of `admin` · `editor` · `viewer`.

### Authentication — `/auth/*`

Real `200` / `401` checks so you can verify the Auth tab end-to-end.

| Endpoint | Requirement | Valid credential |
|---|---|---|
| `GET /auth/bearer` | `Authorization: Bearer <token>` | any non-empty token |
| `GET /auth/basic` | Basic auth | **admin / secret** |
| `GET /auth/apikey` | `X-API-Key` header | **tachy-demo-key** |

Failures return `401` with a `WWW-Authenticate` header and a helpful message.

### `POST /graphql`

A minimal GraphQL-ish responder. If your `query` mentions `user` it returns one
user; `users` returns the list; anything else returns a tiny schema stub.

```graphql
{ users { id name email } }
```

## The 🧪 Tachy Test Lab collection

On first run Tachy seeds a **🧪 Tachy Test Lab** collection
([`src/lib/testlab.ts`](../src/lib/testlab.ts)) with ready-to-run requests —
each with assertions and, where useful, variable chaining. It's organized into
folders:

1. **① Smoke** — `/echo`, `/json` basics
2. **② Status Codes** — 200 / 404 / 418 / 500 via `/status/:code`
3. **③ Latency** — `/delay/:ms`
4. **④ Users CRUD** — create → read → update → delete, chaining `{{userId}}`
5. **⑤ Authentication** — bearer / basic / apikey, success and failure
6. **⑥ Headers / Cookies / Redirects**
7. **⑦ Negative / Edge** — forced errors and unknown routes
8. **⑧ GraphQL**

### Local Mock environment

A **Local Mock** environment is seeded alongside it
([`buildLocalEnv()`](../src/lib/testlab.ts)) with:

| Variable | Value |
|---|---|
| `baseUrl` | `http://localhost:3000/api/mock` |
| `token` | a demo bearer token |
| `apiKey` | `tachy-demo-key` *(secret)* |
| `userId` | seeded/used by the CRUD chain |

Select **Local Mock** in the top-bar environment selector, open a Test Lab
request, and hit **Send**.

## Trying it from the terminal

The mock server also responds to plain `curl`:

```bash
curl -s localhost:3000/api/mock/json | jq
curl -s -X POST localhost:3000/api/mock/users \
  -H 'content-type: application/json' \
  -d '{"name":"Test User","role":"editor"}'
curl -i localhost:3000/api/mock/status/418
curl -s localhost:3000/api/mock/auth/basic -u admin:secret
curl -s localhost:3000/api/mock/auth/apikey -H 'x-api-key: tachy-demo-key'
```
