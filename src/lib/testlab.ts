import { emptyAuth } from "./auth";
import { newBody, newKeyValue, newRequest, uid } from "./factory";
import type { AuthConfig, Collection, CollectionNode, Environment, HttpMethod, TachyRequest } from "./types";

/** Stable markers so we only seed the Test Lab once. */
export const TEST_LAB_NAME = "🧪 Tachy Test Lab";
export const LOCAL_ENV_NAME = "Local Mock";

function req(
  name: string,
  method: HttpMethod,
  path: string,
  extra: Partial<TachyRequest> = {},
): CollectionNode {
  return {
    id: uid(),
    name,
    type: "request",
    request: newRequest({
      name,
      method,
      url: `{{baseUrl}}${path}`,
      ...extra,
    }),
  };
}

function folder(name: string, children: CollectionNode[]): CollectionNode {
  return { id: uid(), name, type: "folder", expanded: false, children };
}

function jsonBody(raw: string): Partial<TachyRequest> {
  return { body: { ...newBody(), mode: "json", raw } };
}

function bearerAuth(token: string): { auth: AuthConfig } {
  return { auth: { ...emptyAuth(), type: "bearer", bearer: { token } } };
}

const status2xxTest = `pm.test("Status is 2xx", function () {\n  pm.expect(pm.response.code).to.be.below(300);\n});`;

export function buildTestLab(): Collection {
  return {
    id: uid(),
    name: TEST_LAB_NAME,
    description:
      "Comprehensive local scenarios served by Tachy's built-in mock server (/api/mock). " +
      "Activate the 'Local Mock' environment, then Send any request. No internet required.",
    variables: [
      newKeyValue({ key: "userId", value: "1" }),
      newKeyValue({ key: "token", value: "tachy-demo-token" }),
      newKeyValue({ key: "apiKey", value: "tachy-demo-key" }),
      newKeyValue(),
    ],
    auth: emptyAuth(),
    nodes: [
      folder("① Smoke", [
        req("Echo (GET)", "GET", "/echo?hello=world", {
          testScript: `pm.test("Echoes method", function () {\n  pm.expect(pm.response.json().method).to.equal("GET");\n});`,
        }),
        req("Echo (POST + body)", "POST", "/echo", {
          ...jsonBody(`{\n  "ping": "pong",\n  "n": 42\n}`),
          testScript: `pm.test("Body echoed back", function () {\n  const data = pm.response.json();\n  pm.expect(data.body.ping).to.equal("pong");\n});`,
        }),
        req("Sample JSON", "GET", "/json", {
          testScript: `${status2xxTest}\n\npm.test("Has product field", function () {\n  pm.expect(pm.response.json()).to.have.property("product");\n});`,
        }),
      ]),

      folder("② Status Codes", [
        req("200 OK", "GET", "/status/200", { testScript: status2xxTest }),
        req("201 Created", "GET", "/status/201"),
        req("204 No Content", "GET", "/status/204"),
        req("301 Moved", "GET", "/status/301"),
        req("400 Bad Request", "GET", "/status/400", {
          testScript: `pm.test("Is 400", function () {\n  pm.response.to.have.status(400);\n});`,
        }),
        req("401 Unauthorized", "GET", "/status/401"),
        req("403 Forbidden", "GET", "/status/403"),
        req("404 Not Found", "GET", "/status/404"),
        req("418 I'm a teapot", "GET", "/status/418"),
        req("429 Too Many Requests", "GET", "/status/429"),
        req("500 Server Error", "GET", "/status/500", {
          testScript: `pm.test("Is 500", function () {\n  pm.response.to.have.status(500);\n});`,
        }),
        req("503 Unavailable", "GET", "/status/503"),
      ]),

      folder("③ Latency", [
        req("Fast (200ms)", "GET", "/delay/200", {
          testScript: `pm.test("Responds under 1s", function () {\n  pm.expect(pm.response.responseTime).to.be.below(1000);\n});`,
        }),
        req("Slow (2s)", "GET", "/delay/2000"),
        req("Very slow (5s)", "GET", "/delay/5000"),
      ]),

      folder("④ Users CRUD", [
        req("List users", "GET", "/users", {
          testScript: `pm.test("Returns a list", function () {\n  const data = pm.response.json();\n  pm.expect(data).to.have.property("total");\n});\npm.environment.set("userId", String(pm.response.json().data[0].id));`,
        }),
        req("Get user by id", "GET", "/users/{{userId}}"),
        req("Create user", "POST", "/users", {
          ...jsonBody(`{\n  "name": "Tachy Tester",\n  "email": "tester@tachy.dev",\n  "role": "editor"\n}`),
          testScript: `pm.test("Created (201)", function () {\n  pm.response.to.have.status(201);\n});\npm.environment.set("userId", String(pm.response.json().data.id));`,
        }),
        req("Update user (PUT)", "PUT", "/users/{{userId}}", {
          ...jsonBody(`{\n  "name": "Updated Name",\n  "active": false\n}`),
        }),
        req("Patch user (PATCH)", "PATCH", "/users/{{userId}}", {
          ...jsonBody(`{\n  "role": "admin"\n}`),
        }),
        req("Delete user", "DELETE", "/users/{{userId}}", {
          testScript: `${status2xxTest}`,
        }),
      ]),

      folder("⑤ Authentication", [
        req("Bearer — success", "GET", "/auth/bearer", {
          ...bearerAuth("{{token}}"),
          testScript: `pm.test("Authenticated", function () {\n  pm.expect(pm.response.json().authenticated).to.be.true;\n});`,
        }),
        req("Bearer — missing (401)", "GET", "/auth/bearer", {
          testScript: `pm.test("Rejected", function () {\n  pm.response.to.have.status(401);\n});`,
        }),
        req("Basic — success (admin/secret)", "GET", "/auth/basic", {
          auth: { ...emptyAuth(), type: "basic", basic: { username: "admin", password: "secret" } },
        }),
        req("Basic — wrong (401)", "GET", "/auth/basic", {
          auth: { ...emptyAuth(), type: "basic", basic: { username: "admin", password: "nope" } },
        }),
        req("API Key — success", "GET", "/auth/apikey", {
          auth: {
            ...emptyAuth(),
            type: "apikey",
            apikey: { key: "X-API-Key", value: "{{apiKey}}", addTo: "header" },
          },
        }),
        req("API Key — missing (401)", "GET", "/auth/apikey"),
      ]),

      folder("⑥ Headers, Cookies & Redirects", [
        req("Inspect headers", "GET", "/headers", {
          headers: [
            newKeyValue({ key: "X-Tachy-Test", value: "true" }),
            newKeyValue({ key: "X-Trace-Id", value: "{{$randomUUID}}" }),
            newKeyValue(),
          ],
        }),
        req("Set cookies", "GET", "/cookies", {
          testScript: `pm.test("Sets a session cookie", function () {\n  pm.expect(pm.response.code).to.equal(200);\n});`,
        }),
        req("Follow redirect (302→echo)", "GET", "/redirect"),
      ]),

      folder("⑦ Negative & Edge", [
        req("Forced 500 error", "GET", "/error", {
          testScript: `pm.test("Surfaces server error", function () {\n  pm.response.to.have.status(500);\n});`,
        }),
        req("Unknown endpoint (404)", "GET", "/does-not-exist"),
        req("Random data", "GET", "/random"),
      ]),

      folder("⑧ GraphQL", [
        req("Query users", "POST", "/graphql", {
          body: {
            ...newBody(),
            mode: "graphql",
            graphql: {
              query: `query {\n  users {\n    id\n    name\n    role\n  }\n}`,
              variables: "{}",
            },
          },
          testScript: `pm.test("Returns data", function () {\n  pm.expect(pm.response.json()).to.have.property("data");\n});`,
        }),
      ]),
    ],
  };
}

export function buildLocalEnv(): Environment {
  return {
    id: uid(),
    name: LOCAL_ENV_NAME,
    color: "#A855F7",
    variables: [
      newKeyValue({ key: "baseUrl", value: "http://localhost:3000/api/mock" }),
      newKeyValue({ key: "token", value: "tachy-demo-token" }),
      newKeyValue({ key: "apiKey", value: "tachy-demo-key", secret: true }),
      newKeyValue({ key: "userId", value: "1" }),
      newKeyValue(),
    ],
  };
}
