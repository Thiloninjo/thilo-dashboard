import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/heute", label: "Heute" },
  { to: "/changelog", label: "Change-Log" },
  { to: "/sops", label: "SOPs" },
  { to: "/ai-edge", label: "AI-Edge" },
  { to: "/personal-dev", label: "Personal Dev" },
];

export function Nav() {
  return (
    <nav className="flex items-center px-7 py-4 border-b border-border sticky top-0 z-10 backdrop-blur-xl bg-surface/80">
      <div className="text-base font-extrabold tracking-tight bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent">
        THILO
      </div>
      <div className="flex gap-0.5 ml-auto bg-surface-raised rounded-xl p-0.5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-1.5 text-xs rounded-lg transition-all ${
                isActive
                  ? "bg-accent/15 text-accent-light font-semibold shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                  : "text-text-muted hover:text-text-secondary"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
