type Props = {
  size?: number;
  suffix?: string;
};

export function Wordmark({ size = 22, suffix }: Props) {
  return (
    <div className="flex items-baseline gap-2.5 font-sans">
      <span
        style={{ fontSize: size }}
        className="font-bold tracking-[-0.02em]"
      >
        Chronicle
      </span>
      {suffix && (
        <span
          style={{ fontSize: size * 0.5 }}
          className="font-mono text-ink-3 uppercase tracking-[0.1em]"
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
