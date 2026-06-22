import type { Collection, Environment, KeyValue } from "./types";

/**
 * Variable resolution with proper scoping order (lowest → highest priority):
 *   global  <  collection  <  environment  <  local/runtime
 *
 * Supports {{variable}} syntax and a handful of dynamic helpers:
 *   {{$timestamp}} {{$isoTimestamp}} {{$randomInt}} {{$guid}} {{$randomUUID}}
 */

export interface ResolveContext {
  globals?: KeyValue[];
  collection?: Collection | null;
  environment?: Environment | null;
  locals?: Record<string, string>;
}

function kvToMap(kv: KeyValue[] | undefined, target: Map<string, string>) {
  if (!kv) return;
  for (const item of kv) {
    if (item.enabled && item.key) target.set(item.key, item.value);
  }
}

export function buildScope(ctx: ResolveContext): Map<string, string> {
  const map = new Map<string, string>();
  kvToMap(ctx.globals, map);
  kvToMap(ctx.collection?.variables, map);
  kvToMap(ctx.environment?.variables, map);
  if (ctx.locals) {
    for (const [k, v] of Object.entries(ctx.locals)) map.set(k, v);
  }
  return map;
}

function dynamic(name: string): string | null {
  switch (name) {
    case "$timestamp":
      return String(Math.floor(Date.now() / 1000));
    case "$isoTimestamp":
      return new Date().toISOString();
    case "$randomInt":
      return String(Math.floor(Math.random() * 1000));
    case "$guid":
    case "$randomUUID":
      return crypto.randomUUID();
    default:
      return null;
  }
}

/** Resolve all {{var}} occurrences in a string. Unknown vars are left intact. */
export function resolve(input: string, scope: Map<string, string>): string {
  if (!input) return input;
  return input.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (full, rawName) => {
    const name = String(rawName).trim();
    const dyn = dynamic(name);
    if (dyn !== null) return dyn;
    if (scope.has(name)) return scope.get(name)!;
    return full;
  });
}

/** Find all {{var}} tokens used in a string. */
export function extractVars(input: string): string[] {
  const out: string[] = [];
  const re = /\{\{\s*([^}]+?)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1].trim());
  return out;
}

export function resolveContextScope(ctx: ResolveContext) {
  return buildScope(ctx);
}
