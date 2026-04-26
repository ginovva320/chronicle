import type { ReactNode } from 'react';

export function Field({
  children,
  label,
  help,
  error
}: {
  children: ReactNode;
  label: string;
  help?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-ink">
        {label}
      </div>
      {help && (
        <div className="font-mono text-[10px] text-ink-3 mt-0.5">
          {help}
        </div>
      )}
      <div className="pt-2.5">
        {children}
      </div>
      {error && (
        <div className="font-mono text-[11px] text-destructive mt-1.5">
          ✕ {error}
        </div>
      )}
    </label>
  );
}

export function ArchivalInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full font-mono text-[13px] text-ink bg-transparent border-0 border-b border-ink px-0 py-2 outline-none focus:border-b-2 focus:border-accent transition-colors [color-scheme:light]"
    />
  );
}

export function ArchivalTextarea({
  value,
  onChange,
  placeholder,
  rows = 4
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full font-sans text-[14px] text-ink bg-transparent border-0 border-b border-ink px-0 py-2 outline-none focus:border-b-2 focus:border-accent transition-colors resize-vertical min-h-[120px]"
    />
  );
}
