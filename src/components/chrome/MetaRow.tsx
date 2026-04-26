type Props = {
  k: string;
  v: string;
  mono?: boolean;
};

export function MetaRow({ k, v, mono = true }: Props) {
  return (
    <div
      className={`flex gap-3 items-baseline border-t border-rule-soft pt-1.5 pb-1.5 text-[11px] ${
        mono ? 'font-mono' : 'font-sans'
      }`}
    >
      <span className="text-ink-3 uppercase tracking-[0.06em] min-w-[88px]">
        {k}
      </span>
      <span className="text-ink">
        {v}
      </span>
    </div>
  );
}
