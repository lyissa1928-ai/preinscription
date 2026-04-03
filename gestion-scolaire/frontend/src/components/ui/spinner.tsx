export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-[var(--foreground-muted)]">
      <div
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 animate-spin"
        style={{ borderColor: 'var(--color-border-subtle)', borderTopColor: 'var(--color-primary)' }}
      />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}

