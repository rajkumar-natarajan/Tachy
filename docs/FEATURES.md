# Features

A complete tour of what Tachy can do today, with how-to notes for each area.

## Contents

- [Requests & tabs](#requests--tabs)
- [URL, params & variables](#url-params--variables)
- [Headers](#headers)
- [Authorization](#authorization)
- [Request body](#request-body)
- [Scripts (pre-request & tests)](#scripts-pre-request--tests)
- [Response viewer](#response-viewer)
- [Collections](#collections)
- [Environments & variables](#environments--variables)
- [History](#history)
- [Code generation](#code-generation)
- [Import & export](#import--export)
- [Command palette & shortcuts](#command-palette--shortcuts)
- [Theming](#theming)

---

## Requests & tabs

- Open multiple requests at once as **tabs**. `⌘T` opens a new tab, `⌘W` closes
  the current one.
- Each tab keeps its own unsaved edits until you save with `⌘S`.
- Send the active request with the **Send** button or `⌘↵`.

## URL, params & variables

- Choose any HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).
- The URL bar supports `{{variable}}` interpolation from any active scope.
- **Query params** edit as a key/value table that stays in sync with the URL
  query string — edit either side and the other updates.

## Headers

- Add headers via the key/value editor.
- Common header **presets** speed up entry (e.g. `Content-Type`, `Accept`,
  `Authorization`).
- Values support `{{variable}}` interpolation.

## Authorization

Configure per-request under the **Auth** tab:

| Type | Behavior |
|---|---|
| **None** | No auth applied |
| **Bearer** | `Authorization: Bearer <token>` |
| **Basic** | `Authorization: Basic base64(user:pass)` |
| **API Key** | Sent as a header **or** query parameter (your choice) |
| **JWT** | Builds a JWT-bearing header |
| **OAuth 2.0** | Bearer token from your OAuth values |
| **Digest** | Digest auth header construction |

Tokens can reference environment variables, e.g. set the Bearer token to
`{{token}}`.

## Request body

Pick a body mode under the **Body** tab:

- **JSON** — Monaco editor with **beautify** and syntax validation.
- **Text / XML / HTML / JavaScript** — raw editors with the right language mode.
- **form-data** — key/value pairs (multipart).
- **x-www-form-urlencoded** — key/value pairs URL-encoded.
- **GraphQL** — query + variables editor.
- **Binary** — send a raw payload.

## Scripts (pre-request & tests)

Tachy runs a **Postman-compatible `pm` sandbox**:

- **Pre-request script** runs before the request is built — useful for computing
  timestamps, signing, or setting variables.
- **Test script** runs against the response — assert status, shape, timing, etc.
- A **snippet library** provides one-click common assertions.

Full API reference: [SCRIPTING.md](SCRIPTING.md).

```js
// Test script example
pm.test("status is 200", () => pm.response.to.have.status(200));
const body = pm.response.json();
pm.test("has id", () => pm.expect(body).to.have.property("id"));
pm.environment.set("userId", body.id);
```

## Response viewer

After a send you get rich response tabs:

| Tab | Shows |
|---|---|
| **Pretty** | Formatted JSON/code with syntax highlighting |
| **Raw** | Unformatted body |
| **Preview** | Rendered HTML in a sandboxed iframe |
| **Headers** | All response headers |
| **Cookies** | Parsed `Set-Cookie` values |
| **Tests** | Pass/fail results from your test script |
| **Timeline** | Request/response metadata |

The status bar reports **status code**, **time** (server-measured), and
**size**. You can **filter/search** the body, and **copy** or **download** it.

## Collections

- Organize requests into **collections** with nested **folders**.
- **Add, duplicate, delete, rename** any node.
- **Search** across all collections to jump to a request fast.
- Save the active request back to its node with `⌘S`.

## Environments & variables

- Maintain multiple **environments** (e.g. Development, Production, Local Mock).
- Plus a **globals** set shared across everything.
- Resolution order (later wins):
  `globals < collection < environment < request-local`.
- Mark variables as **secret** to mask them in the UI.
- **Dynamic variables** are available anywhere:
  `{{$timestamp}}`, `{{$randomUUID}}`, `{{$randomInt}}`, and more.

Switch the active environment from the selector in the top bar.

## History

Every sent request is recorded automatically with its response snapshot. History
is **searchable**, so you can re-open or re-run past calls.

## Code generation

Generate ready-to-paste client code for the current request:

- **cURL**
- **JavaScript** (`fetch`)
- **Python** (`requests`)
- **Go**
- **Java**

## Import & export

- **Import** Postman **Collection v2.1** files.
- **Import** a **cURL** command and have it parsed into a request.
- **Export** your collections to share or back up.

## Command palette & shortcuts

`⌘K` / `Ctrl+K` opens a fuzzy command palette to navigate and run actions.

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command palette |
| `⌘↵` / `Ctrl+Enter` | Send request |
| `⌘T` / `Ctrl+T` | New tab |
| `⌘W` / `Ctrl+W` | Close tab |
| `⌘S` / `Ctrl+S` | Save request |

## Theming

- Toggle **dark / light** from the top bar.
- Built on a CSS-variable token system with the Tachy brand palette (navy, cyan,
  grape).
