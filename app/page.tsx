import Link from "next/link";
import { Wordmark } from "@/components/Logo";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Wordmark />
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-slate-50" />
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Connect students and tutors across Bangladesh.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Tutor-Connect gives students and parents a personal dashboard to manage profiles and academic
              details — so the right tutor always has the right context before a session begins.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-5 py-2.5 text-base">
                Get started — Sign in with Google
              </Link>
              <a href="#features" className="btn-secondary px-5 py-2.5 text-base">See what's inside</a>
            </div>
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">One platform, tailored to each role</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Sign in with Google and pick your role on first login. Each role lands on a dashboard built for it.
        </p>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <RoleCard
            color="brand"
            title="Student"
            points={["Update your name, contact & district", "Add current class, institution & subjects", "Tell tutors exactly where you need help"]}
          />
          <RoleCard
            color="emerald"
            title="Parent"
            points={["Manage your own account", "Add & manage multiple student profiles", "One account for every child you book for"]}
          />
        </div>
      </section>
    </div>
  );
}

function RoleCard({
  title,
  points,
  color,
}: {
  title: string;
  points: string[];
  color: "brand" | "emerald" | "amber";
}) {
  const colors = {
    brand: "from-brand-500 to-brand-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-600",
  };
  return (
    <div className="card p-6">
      <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${colors[color]} px-3 py-1.5 text-sm font-semibold text-white`}>
        {title}
      </div>
      <ul className="space-y-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
