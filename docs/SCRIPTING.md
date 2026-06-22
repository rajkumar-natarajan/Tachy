# Scripting

Tachy ships a lightweight, **Postman-compatible `pm` sandbox** for pre-request
and test scripts. Scripts are plain JavaScript executed in the browser via the
`Function` constructor — the same local trust model as Postman's sandbox
([`src/lib/sandbox.ts`](../src/lib/sandbox.ts)).

Each request has two script slots:

- **Pre-request script** — runs before the request is built. Use it to set
  variables, compute timestamps, or sign requests.
- **Test script** — runs after the response arrives. Use it to assert status,
  body shape, timing, and to chain variables into later requests.

Three globals are injected: `pm`, `console`, and `expect`.

## `pm.test(name, fn)`

Registers a named test. If `fn` throws, the test fails with the error message;
otherwise it passes. Results appear in the response **Tests** tab.

```js
pm.test("status is 200", () => {
  pm.response.to.have.status(200);
});
```

## `pm.expect(actual)`

A chai-style assertion builder. Available matchers:

| Assertion | Passes when |
|---|---|
| `.to.equal(v)` | strict `===` equality |
| `.to.eql(v)` | deep (JSON) equality |
| `.to.be.a(type)` | `typeof actual === type` |
| `.to.be.above(n)` | `actual > n` |
| `.to.be.below(n)` | `actual < n` |
| `.to.be.true` | `actual === true` |
| `.to.be.ok` | `actual` is truthy |
| `.to.include(x)` | string contains substring / array contains item |
| `.to.exist` | not `null`/`undefined` |
| `.to.have.property(p)` | object has own property `p` |
| `.to.have.lengthOf(n)` | `actual.length === n` |

```js
const body = pm.response.json();
pm.test("has 3 users", () => pm.expect(body.data).to.have.lengthOf(3));
pm.test("name is a string", () => pm.expect(body.data[0].name).to.be.a("string"));
pm.test("includes admin", () => pm.expect(body.data[0].role).to.include("admin"));
```

## `pm.response`

Available only in **test scripts** (the response exists by then):

| Member | Description |
|---|---|
| `pm.response.code` | numeric status code |
| `pm.response.status` | status text |
| `pm.response.responseTime` | server-measured time in ms |
| `pm.response.text()` | raw body string |
| `pm.response.json()` | parsed JSON body (cached) |
| `pm.response.headers.get(name)` | case-insensitive header lookup |
| `pm.response.to.have.status(code\|text)` | assert status code or text |

```js
pm.test("fast enough", () => pm.expect(pm.response.responseTime).to.be.below(1000));
pm.test("json content type", () =>
  pm.expect(pm.response.headers.get("content-type")).to.include("application/json"));
```

## Variables

Three scopes are exposed. Setting a variable updates the live resolution map for
the current run, and `environment`/`globals` mutations are persisted back to the
store.

| API | Scope |
|---|---|
| `pm.environment.get(k)` / `pm.environment.set(k, v)` | active environment |
| `pm.globals.get(k)` / `pm.globals.set(k, v)` | globals |
| `pm.variables.get(k)` / `pm.variables.set(k, v)` | run-local (not persisted) |

Values are coerced to strings on `set`.

```js
// Chain a created id into the next request as {{userId}}
const body = pm.response.json();
pm.environment.set("userId", body.data.id);
```

## `console`

`console.log`, `console.info`, `console.warn`, and `console.error` all append to
the script log shown in the Tests tab. Objects are JSON-stringified.

```js
console.log("user id:", pm.response.json().data.id);
```

## Putting it together

A typical "create then verify" test script:

```js
pm.test("created", () => pm.response.to.have.status(201));

const body = pm.response.json();
pm.test("has id", () => pm.expect(body.data).to.have.property("id"));
pm.test("role saved", () => pm.expect(body.data.role).to.equal("editor"));

// make the id available to the next request in the folder
pm.environment.set("userId", body.data.id);
console.log("stored userId =", body.data.id);
```

## Error handling

If a script throws **outside** a `pm.test` callback (a syntax or runtime error),
the whole script is reported as failed with the error message, and no partial
variable writes from after the throw are applied. Wrap assertions in `pm.test` so
one failure doesn't abort the rest.

## Snippet library

The script editors include a snippet menu for common patterns (status checks,
JSON property assertions, saving a variable) so you can insert boilerplate with
one click.
