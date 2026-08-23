import type { SVGProps } from "react";

function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </Svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.5-5.5 7-5.5s7 2 7 5.5" />
    </Svg>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3 3-4.5 6-4.5s6 1.5 6 4.5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6" />
      <path d="M17.5 14.7c2 .5 3.5 2 3.5 4.3" />
    </Svg>
  );
}

export function BookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H20v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
      <path d="M5 4.5v15" />
      <path d="M5 19.5A1.5 1.5 0 0 1 6.5 21H20" />
    </Svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </Svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </Svg>
  );
}

export function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
      <path d="M18.5 14.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" />
    </Svg>
  );
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M3 21h18" />
      <path d="M6 21v-6" />
      <path d="M12 21V8" />
      <path d="M18 21v-10" />
    </Svg>
  );
}

export function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props} strokeWidth={2}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props} strokeWidth={2}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function ChatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Svg>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Svg>
  );
}

export function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Svg>
  );
}

export function XCircleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </Svg>
  );
}

export function SendIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
}

export function FilterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </Svg>
  );
}

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function RobotIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <circle cx="9" cy="14" r="1.5" />
      <circle cx="15" cy="14" r="1.5" />
      <path d="M12 2v4" />
      <path d="M10 2h4" />
      <path d="M1 13h1M22 13h1" />
    </Svg>
  );
}

export function CrownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M2 4l3 12h14l3-12-6 7-4-5-4 5-6-7z" />
      <path d="M5 20h14" />
    </Svg>
  );
}

export function GiftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <rect x="5" y="12" width="14" height="8" rx="1" />
      <path d="M12 8v12" />
      <path d="M12 8c-2-2-5-2.5-5 0s3 2 5 2" />
      <path d="M12 8c2-2 5-2.5 5 0s-3 2-5 2" />
    </Svg>
  );
}
