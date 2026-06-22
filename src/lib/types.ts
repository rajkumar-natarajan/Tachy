// Core domain types for Tachy

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type BodyMode =
  | "none"
  | "json"
  | "text"
  | "xml"
  | "html"
  | "javascript"
  | "form-data"
  | "urlencoded"
  | "graphql"
  | "binary";

export type AuthType =
  | "none"
  | "inherit"
  | "bearer"
  | "basic"
  | "apikey"
  | "jwt"
  | "oauth2"
  | "digest";

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
  /** for form-data: text or file */
  type?: "text" | "file";
  secret?: boolean;
}

export interface AuthConfig {
  type: AuthType;
  bearer?: { token: string };
  basic?: { username: string; password: string };
  apikey?: { key: string; value: string; addTo: "header" | "query" };
  jwt?: { algorithm: string; secret: string; payload: string; headerPrefix: string };
  oauth2?: { accessToken: string; headerPrefix: string };
}

export interface GraphQLBody {
  query: string;
  variables: string;
}

export interface RequestBody {
  mode: BodyMode;
  raw: string;
  formData: KeyValue[];
  urlencoded: KeyValue[];
  graphql: GraphQLBody;
}

export interface TachyRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  auth: AuthConfig;
  body: RequestBody;
  preRequestScript: string;
  testScript: string;
}

export interface TachyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  contentType: string;
  timeMs: number;
  sizeBytes: number;
  cookies: { name: string; value: string }[];
  redirected: boolean;
  finalUrl: string;
  error?: string;
  testResults?: TestResult[];
  consoleLogs?: string[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface CollectionNode {
  id: string;
  name: string;
  type: "folder" | "request";
  request?: TachyRequest;
  children?: CollectionNode[];
  expanded?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  variables: KeyValue[];
  auth: AuthConfig;
  nodes: CollectionNode[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
  color?: string;
}

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  status: number;
  timeMs: number;
  at: number;
}

export interface RequestTab {
  id: string;
  request: TachyRequest;
  response?: TachyResponse;
  loading?: boolean;
  dirty?: boolean;
  /** id of collection node this tab is bound to (for saving) */
  sourceNodeId?: string;
}

export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];
