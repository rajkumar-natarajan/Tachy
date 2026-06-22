import type { TachyResponse, TestResult } from "./types";

/**
 * A lightweight, Postman-compatible scripting sandbox.
 * Runs pre-request and test scripts with a `pm` API.
 *
 * NOTE: This uses the Function constructor to execute user scripts in the
 * browser. Scripts are authored by the user themselves (same trust model as
 * Postman's local sandbox), and never come from third parties.
 */

export interface SandboxResult {
  logs: string[];
  tests: TestResult[];
  /** variable mutations the script requested, by scope */
  setEnv: Record<string, string>;
  setGlobal: Record<string, string>;
  error?: string;
}

interface SandboxInput {
  script: string;
  response?: TachyResponse;
  variables: Map<string, string>;
}

export function runScript({ script, response, variables }: SandboxInput): SandboxResult {
  const logs: string[] = [];
  const tests: TestResult[] = [];
  const setEnv: Record<string, string> = {};
  const setGlobal: Record<string, string> = {};

  if (!script || !script.trim()) {
    return { logs, tests, setEnv, setGlobal };
  }

  let parsedJson: unknown;
  const responseApi = response
    ? {
        code: response.status,
        status: response.statusText,
        responseTime: response.timeMs,
        text: () => response.body,
        json: () => {
          if (parsedJson === undefined) parsedJson = JSON.parse(response.body);
          return parsedJson;
        },
        headers: {
          get: (name: string) =>
            response.headers[Object.keys(response.headers).find(
              (h) => h.toLowerCase() === name.toLowerCase(),
            ) ?? ""],
        },
        to: {
          have: {
            status: (expected: number | string) => {
              const ok =
                typeof expected === "number"
                  ? response.status === expected
                  : response.statusText === expected;
              if (!ok)
                throw new Error(
                  `expected status ${expected} but got ${response.status}`,
                );
            },
          },
        },
      }
    : undefined;

  function expect(actual: unknown) {
    const api = {
      to: {
        equal: (expected: unknown) => {
          if (actual !== expected)
            throw new Error(`expected ${json(actual)} to equal ${json(expected)}`);
        },
        eql: (expected: unknown) => {
          if (json(actual) !== json(expected))
            throw new Error(`expected ${json(actual)} to deep-equal ${json(expected)}`);
        },
        be: {
          a: (type: string) => {
            if (typeof actual !== type)
              throw new Error(`expected type ${type} but got ${typeof actual}`);
          },
          above: (n: number) => {
            if (!(Number(actual) > n))
              throw new Error(`expected ${actual} to be above ${n}`);
          },
          below: (n: number) => {
            if (!(Number(actual) < n))
              throw new Error(`expected ${actual} to be below ${n}`);
          },
          true: (() => {
            if (actual !== true) throw new Error(`expected ${actual} to be true`);
          }) as unknown,
          ok: (() => {
            if (!actual) throw new Error(`expected ${actual} to be ok`);
          }) as unknown,
        },
        include: (needle: unknown) => {
          if (typeof actual === "string" && typeof needle === "string") {
            if (!actual.includes(needle))
              throw new Error(`expected "${actual}" to include "${needle}"`);
          } else if (Array.isArray(actual)) {
            if (!actual.includes(needle))
              throw new Error(`expected array to include ${json(needle)}`);
          } else {
            throw new Error(`cannot run include on ${typeof actual}`);
          }
        },
        exist: (() => {
          if (actual === null || actual === undefined)
            throw new Error(`expected value to exist`);
        }) as unknown,
        have: {
          property: (prop: string) => {
            if (
              actual === null ||
              typeof actual !== "object" ||
              !(prop in (actual as object))
            )
              throw new Error(`expected object to have property "${prop}"`);
          },
          lengthOf: (n: number) => {
            const len = (actual as { length?: number })?.length;
            if (len !== n)
              throw new Error(`expected length ${n} but got ${len}`);
          },
        },
      },
    };
    return api;
  }

  const pm = {
    response: responseApi,
    environment: {
      get: (k: string) => variables.get(k),
      set: (k: string, v: unknown) => {
        setEnv[k] = String(v);
        variables.set(k, String(v));
      },
    },
    globals: {
      get: (k: string) => variables.get(k),
      set: (k: string, v: unknown) => {
        setGlobal[k] = String(v);
        variables.set(k, String(v));
      },
    },
    variables: {
      get: (k: string) => variables.get(k),
      set: (k: string, v: unknown) => variables.set(k, String(v)),
    },
    expect,
    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (e) {
        tests.push({ name, passed: false, error: (e as Error).message });
      }
    },
  };

  const console = {
    log: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
    error: (...args: unknown[]) => logs.push("ERROR: " + args.map(stringify).join(" ")),
    warn: (...args: unknown[]) => logs.push("WARN: " + args.map(stringify).join(" ")),
    info: (...args: unknown[]) => logs.push(args.map(stringify).join(" ")),
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("pm", "console", "expect", script);
    fn(pm, console, expect);
  } catch (e) {
    return { logs, tests, setEnv, setGlobal, error: (e as Error).message };
  }

  return { logs, tests, setEnv, setGlobal };
}

function json(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function stringify(v: unknown): string {
  if (typeof v === "string") return v;
  return json(v);
}
