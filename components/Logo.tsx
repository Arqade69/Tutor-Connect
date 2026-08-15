export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="url(#tc-grad)" />
      <path
        d="M14 18.5h20M24 18.5V35M18.5 35h11"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="33.5" cy="30.5" r="2.5" fill="#fde68a" />
      <defs>
        <linearGradient id="tc-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
      <Logo />
      Tutor<span className="text-brand-600">-Connect</span>
    </span>
  );
}
