"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/* ---------------- Button ---------------- */

type ButtonVariant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-500 text-navy-950 font-semibold hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]",
  ghost: "text-fg/80 hover:bg-elevated hover:text-fg",
  outline: "border border-border text-fg hover:bg-elevated",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
  subtle: "bg-elevated text-fg hover:bg-border/60",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-6 text-base gap-2",
  icon: "h-8 w-8 justify-center",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-lg font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/* ---------------- Input ---------------- */

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full rounded-lg bg-elevated border border-border px-3 text-sm text-fg placeholder:text-muted/60 transition-colors focus:border-cyan-500/60 focus:bg-surface",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

/* ---------------- Select ---------------- */

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-9 rounded-lg bg-elevated border border-border px-2.5 text-sm text-fg transition-colors focus:border-cyan-500/60 cursor-pointer appearance-none",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/* ---------------- Badge ---------------- */

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- IconButton ---------------- */

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, active, ...props }, ref) => (
    <button
      ref={ref}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-95",
        active && "bg-elevated text-cyan-400",
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";

/* ---------------- Spinner ---------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-[spin_0.7s_linear_infinite]", className)}
      viewBox="0 0 24 24"
      fill="none"
      width="16"
      height="16"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Segmented tabs ---------------- */

export function SegTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; badge?: number }[];
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5 overflow-x-auto no-scrollbar", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "text-cyan-400"
              : "text-muted hover:text-fg",
          )}
        >
          <span className="flex items-center gap-1.5">
            {o.label}
            {o.badge ? (
              <span className="rounded-full bg-cyan-500/20 px-1.5 text-[10px] text-cyan-400">
                {o.badge}
              </span>
            ) : null}
          </span>
          {value === o.value && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-cyan-500" />
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center animate-fade-in">
      {icon && <div className="text-muted/50">{icon}</div>}
      <div>
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {description && (
          <p className="mt-1 max-w-xs text-xs text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
