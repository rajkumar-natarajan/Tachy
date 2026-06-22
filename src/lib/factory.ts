import { nanoid } from "nanoid";
import { emptyAuth } from "./auth";
import type {
  Collection,
  CollectionNode,
  Environment,
  HttpMethod,
  KeyValue,
  RequestBody,
  TachyRequest,
} from "./types";

export const uid = () => nanoid(10);

export function newKeyValue(partial: Partial<KeyValue> = {}): KeyValue {
  return {
    id: uid(),
    key: "",
    value: "",
    description: "",
    enabled: true,
    type: "text",
    secret: false,
    ...partial,
  };
}

export function newBody(): RequestBody {
  return {
    mode: "none",
    raw: "",
    formData: [newKeyValue()],
    urlencoded: [newKeyValue()],
    graphql: { query: "", variables: "{}" },
  };
}

export function newRequest(partial: Partial<TachyRequest> = {}): TachyRequest {
  return {
    id: uid(),
    name: "Untitled Request",
    method: "GET" as HttpMethod,
    url: "",
    params: [newKeyValue()],
    headers: [newKeyValue()],
    auth: emptyAuth(),
    body: newBody(),
    preRequestScript: "",
    testScript: "",
    ...partial,
  };
}

export function newFolder(name = "New Folder"): CollectionNode {
  return { id: uid(), name, type: "folder", children: [], expanded: true };
}

export function newRequestNode(req?: Partial<TachyRequest>): CollectionNode {
  const request = newRequest(req);
  return { id: uid(), name: request.name, type: "request", request };
}

export function newCollection(name = "New Collection"): Collection {
  return {
    id: uid(),
    name,
    description: "",
    variables: [newKeyValue()],
    auth: emptyAuth(),
    nodes: [],
  };
}

export function newEnvironment(name = "New Environment"): Environment {
  return {
    id: uid(),
    name,
    color: "#00F0FF",
    variables: [newKeyValue()],
  };
}

/** Ensure a trailing empty row exists so the UI always has an input to type into. */
export function withTrailingRow(list: KeyValue[]): KeyValue[] {
  const last = list[list.length - 1];
  if (!last || last.key.trim() !== "" || last.value.trim() !== "") {
    return [...list, newKeyValue()];
  }
  return list;
}
