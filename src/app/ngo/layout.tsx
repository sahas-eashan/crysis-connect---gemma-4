import { PortalShell } from "@/components/shared/portal-shell";

const items = [
  { href: "/ngo/dashboard", label: "Dashboard" },
  { href: "/ngo/resources", label: "Resources" },
  { href: "/ngo/requests", label: "Requests" },
  { href: "/ngo/map", label: "Operations Map" },
  { href: "/ngo/sos-queue", label: "SOS Queue" },
  { href: "/ngo/field-copilot", label: "Field Copilot" },
  { href: "/ngo/news", label: "Field Updates" }
];

export default function NgoLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      items={items}
      subtitle="Manage resources, accept SOS requests, coordinate responders, and use Gemma field guidance."
      title="NGO Portal"
    >
      {children}
    </PortalShell>
  );
}
