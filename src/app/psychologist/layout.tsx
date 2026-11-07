import { AppShell } from "@/components/layout/app-shell";

const NAV = [
  { href: "/psychologist/dashboard", label: "Dashboard" },
  { href: "/academy", label: "Academy" },
  { href: "/psychologist/profile", label: "Profile" },
];

export default function PsychologistLayout({ children }: LayoutProps<"/psychologist">) {
  return (
    <AppShell home="/psychologist/dashboard" nav={NAV}>
      {children}
    </AppShell>
  );
}
