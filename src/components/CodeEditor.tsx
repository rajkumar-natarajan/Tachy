"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useRef } from "react";

const TACHY_THEME = "tachy-dark";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string | number;
  minimap?: boolean;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "json",
  readOnly = false,
  height = "100%",
  minimap = false,
}: Props) {
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme(TACHY_THEME, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "00f0ff" },
        { token: "string.value.json", foreground: "e2e8f0" },
        { token: "number", foreground: "a855f7" },
        { token: "keyword", foreground: "a855f7" },
        { token: "string", foreground: "7ee0c0" },
        { token: "comment", foreground: "5b6b85", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0A1428",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#34507a",
        "editorLineNumber.activeForeground": "#00f0ff",
        "editor.selectionBackground": "#00f0ff25",
        "editor.lineHighlightBackground": "#0f1d3880",
        "editorCursor.foreground": "#00f0ff",
        "editorIndentGuide.background1": "#16294d",
        "editorBracketMatch.border": "#00f0ff60",
        "editorGutter.background": "#0A1428",
      },
    });
    monaco.editor.setTheme(TACHY_THEME);
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      theme={TACHY_THEME}
      onChange={(v) => onChange?.(v ?? "")}
      onMount={handleMount}
      loading={<div className="p-4 text-xs text-muted">Loading editor…</div>}
      options={{
        readOnly,
        minimap: { enabled: minimap },
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        formatOnPaste: true,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        overviewRulerLanes: 0,
        folding: true,
        bracketPairColorization: { enabled: true },
      }}
    />
  );
}
