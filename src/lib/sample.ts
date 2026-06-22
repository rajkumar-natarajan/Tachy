import { emptyAuth } from "./auth";
import { newBody, newKeyValue, newRequest, uid } from "./factory";
import type { Collection, Environment } from "./types";

export function seedCollections(): Collection[] {
  return [
    {
      id: uid(),
      name: "Tachy Demo API",
      description: "A starter collection wired to public demo endpoints. Try sending a request!",
      variables: [
        newKeyValue({ key: "baseUrl", value: "https://jsonplaceholder.typicode.com" }),
        newKeyValue(),
      ],
      auth: emptyAuth(),
      nodes: [
        {
          id: uid(),
          name: "Posts",
          type: "folder",
          expanded: true,
          children: [
            {
              id: uid(),
              name: "List posts",
              type: "request",
              request: newRequest({
                name: "List posts",
                method: "GET",
                url: "{{baseUrl}}/posts",
                params: [newKeyValue({ key: "_limit", value: "5" }), newKeyValue()],
                testScript: `pm.test("status is 200", function () {\n  pm.response.to.have.status(200);\n});\n\npm.test("returns an array", function () {\n  const data = pm.response.json();\n  pm.expect(data).to.be.a("object");\n});`,
              }),
            },
            {
              id: uid(),
              name: "Get post by id",
              type: "request",
              request: newRequest({
                name: "Get post by id",
                method: "GET",
                url: "{{baseUrl}}/posts/1",
              }),
            },
            {
              id: uid(),
              name: "Create post",
              type: "request",
              request: newRequest({
                name: "Create post",
                method: "POST",
                url: "{{baseUrl}}/posts",
                body: {
                  ...newBody(),
                  mode: "json",
                  raw: `{\n  "title": "Tachy is fast",\n  "body": "Lightning-fast API development",\n  "userId": 1\n}`,
                },
              }),
            },
          ],
        },
        {
          id: uid(),
          name: "Users",
          type: "folder",
          expanded: false,
          children: [
            {
              id: uid(),
              name: "List users",
              type: "request",
              request: newRequest({
                name: "List users",
                method: "GET",
                url: "{{baseUrl}}/users",
              }),
            },
          ],
        },
      ],
    },
  ];
}

export function seedEnvironments(): Environment[] {
  return [
    {
      id: uid(),
      name: "Development",
      color: "#00F0FF",
      variables: [
        newKeyValue({ key: "baseUrl", value: "https://jsonplaceholder.typicode.com" }),
        newKeyValue({ key: "apiKey", value: "dev-secret-key", secret: true }),
        newKeyValue(),
      ],
    },
    {
      id: uid(),
      name: "Production",
      color: "#A855F7",
      variables: [
        newKeyValue({ key: "baseUrl", value: "https://api.example.com" }),
        newKeyValue({ key: "apiKey", value: "prod-secret-key", secret: true }),
        newKeyValue(),
      ],
    },
  ];
}
