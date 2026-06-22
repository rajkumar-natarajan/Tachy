"use client";

import { useStore } from "@/lib/store";
import { Globe, Variable, X } from "lucide-react";
import { useEffect, useState } from "react";
import { KeyValueEditor } from "./KeyValueEditor";
import { Button, Input } from "./ui";

export function EnvironmentEditor() {
  const [envId, setEnvId] = useState<string | null>(null);
  const [globalsMode, setGlobalsMode] = useState(false);
  const environments = useStore((s) => s.environments);
  const updateEnvironment = useStore((s) => s.updateEnvironment);
  const globals = useStore((s) => s.globals);
  const setGlobals = useStore((s) => s.setGlobals);

  useEffect(() => {
    function onEdit(e: Event) {
      const id = (e as CustomEvent).detail as string;
      setEnvId(id);
      setGlobalsMode(false);
    }
    function onGlobals() {
      setGlobalsMode(true);
      setEnvId(null);
    }
    window.addEventListener("tachy:edit-env", onEdit);
    window.addEventListener("tachy:edit-globals", onGlobals);
    return () => {
      window.removeEventListener("tachy:edit-env", onEdit);
      window.removeEventListener("tachy:edit-globals", onGlobals);
    };
  }, []);

  const env = environments.find((e) => e.id === envId);
  const open = globalsMode || !!env;
  if (!open) return null;

  function close() {
    setEnvId(null);
    setGlobalsMode(false);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            {globalsMode ? (
              <Globe size={18} className="text-grape-400" />
            ) : (
              <Variable size={18} className="text-cyan-400" />
            )}
            <div>
              {globalsMode ? (
                <h2 className="text-sm font-semibold text-fg">Global Variables</h2>
              ) : (
                <input
                  value={env!.name}
                  onChange={(e) =>
                    updateEnvironment(env!.id, (x) => ({ ...x, name: e.target.value }))
                  }
                  className="bg-transparent text-sm font-semibold text-fg focus:outline-none"
                />
              )}
              <p className="text-[11px] text-muted">
                {globalsMode
                  ? "Available across all collections and environments"
                  : "Variables for this environment"}
              </p>
            </div>
          </div>
          <button onClick={close} className="rounded-lg p-1.5 text-muted hover:bg-elevated hover:text-fg">
            <X size={18} />
          </button>
        </div>

        {!globalsMode && env && (
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <label className="text-[11px] text-muted">Color</label>
            <input
              type="color"
              value={env.color ?? "#00F0FF"}
              onChange={(e) =>
                updateEnvironment(env.id, (x) => ({ ...x, color: e.target.value }))
              }
              className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent"
            />
            <span className="text-[11px] text-muted">
              {env.variables.filter((v) => v.key).length} variables
            </span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <KeyValueEditor
            items={globalsMode ? globals : env!.variables}
            onChange={(vars) =>
              globalsMode
                ? setGlobals(vars)
                : updateEnvironment(env!.id, (x) => ({ ...x, variables: vars }))
            }
            keyPlaceholder="Variable"
            valuePlaceholder="Value"
            allowSecret
          />
          <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
            Reference these anywhere with <code className="rounded bg-elevated px-1 text-cyan-400">{"{{variableName}}"}</code>.
            Resolution order: global → collection → environment (environment wins).
            Mark sensitive values as secret to mask them.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="primary" onClick={close}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
