import { PortalShell } from "@/components/shared/portal-shell";

const items = [
  { href: "/citizen/dashboard", label: "Dashboard" },
  { href: "/citizen/map", label: "Live Map" },
  { href: "/citizen/offline", label: "Gemma Offline" },
  { href: "/citizen/resources", label: "Resources" },
  { href: "/citizen/sos", label: "SOS" },
  { href: "/citizen/news", label: "News & Alerts" }
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      items={items}
      subtitle="Alerts, safe-zone routing, offline Gemma guidance, and SOS assistance."
      title="Citizen Portal"
    >
      {children}
    </PortalShell>
  );
}
