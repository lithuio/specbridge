export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path
          d="M8 23V14m16 9V14M8 19c0-12 16-12 16 0M6 23h20"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <span>
          SpecBridge<span className="brand-subtitle">需求 · 确认 · 交付</span>
        </span>
      )}
    </span>
  );
}
