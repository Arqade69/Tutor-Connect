import { redirect } from "next/navigation";
import { getCurrentUser, dashboardFor } from "@/lib/session";
import { Sidebar, type NavGroup } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

function explore(includeAi = true): NavGroup {
  return {
    heading: "Explore & Learning",
    items: [
      { label: "Find a Tutor", href: "/dashboard/tutors", icon: "search" },
      ...(includeAi ? [{ label: "TutorBot AI", href: "/dashboard/tutorbot", icon: "robot" as const }] : []),
      { label: "My Bookings", href: "/dashboard/bookings", icon: "calendar" },
      { label: "Chat Room", href: "/dashboard/chat", icon: "chat" },
    ],
  };
}

function navFor(role: string, home: string): NavGroup[] {
  if (role === "admin") {
    return [
      {
        items: [
          { label: "Admin Overview", href: `${home}?tab=overview` },
          { label: "Analytics & Revenue", href: `${home}?tab=analytics` },
          { label: "Tutor Verifications", href: `${home}?tab=verifications` },
          { label: "User Policy & Safety", href: `${home}?tab=users` },
          { label: "Reward Points & Pricing", href: `${home}?tab=settings` },
        ],
      },
      {
        heading: "Modules & Explore",
        items: [
          { label: "Find a Tutor", href: "/dashboard/tutors", icon: "search" },
          { label: "All Bookings", href: "/dashboard/bookings", icon: "calendar" },
          { label: "Chat Room", href: "/dashboard/chat", icon: "chat" },
        ],
      },
    ];
  }

  if (role === "parent") {
    return [
      {
        items: [
          { label: "Dashboard", href: home, icon: "dashboard" },
          { label: "My Profile", href: `${home}#profile`, icon: "user" },
          { label: "Student Profiles", href: `${home}#profiles`, icon: "users" },
        ],
      },
      explore(false),
    ];
  }

  if (role === "tutor") {
    return [
      {
        items: [
          { label: "Dashboard", href: home, icon: "dashboard" },
          { label: "My Profile", href: `${home}#profile`, icon: "user" },
          { label: "Availability", href: `${home}#schedule`, icon: "calendar" },
        ],
      },
      {
        heading: "Tutoring & Messages",
        items: [
          { label: "Analytics", href: "/dashboard/tutor/analytics", icon: "chart" },
          { label: "TutorBot AI", href: "/dashboard/tutorbot", icon: "robot" },
          { label: "My Sessions", href: "/dashboard/bookings", icon: "calendar" },
          { label: "Chat Room", href: "/dashboard/chat", icon: "chat" },
        ],
      },
    ];
  }

  // student
  return [
    {
      items: [
        { label: "Dashboard", href: home, icon: "dashboard" },
        { label: "My Profile", href: `${home}#profile`, icon: "user" },
        { label: "Academic Info", href: `${home}#academic`, icon: "book" },
      ],
    },
    explore(),
  ];
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/clear-session");
  if (!user.onboarded) redirect("/onboarding");
  if (user.status === "suspended") redirect("/login?error=suspended");

  const home = dashboardFor(user.role);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Sidebar
        role={user.role}
        name={user.name}
        email={user.email}
        image={user.image}
        homeHref={home}
        groups={navFor(user.role, home)}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-end">
            <NotificationBell />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
