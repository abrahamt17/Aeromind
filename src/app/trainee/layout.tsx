import { AppShell } from "@/components/layout/app-shell";

const NAV = [
  { href: "/trainee/dashboard", label: "Dashboard" },
  { href: "/professionals", label: "Find a professional" },
  { href: "/academy", label: "Academy" },
  { href: "/trainee/development", label: "Development" },
  { href: "/trainee/profile", label: "Profile" },
];

export default function TraineeLayout({ children }: LayoutProps<"/trainee">) {
  return (
    <AppShell home="/trainee/dashboard" nav={NAV}>
      {children}
    </AppShell>
  );
}
