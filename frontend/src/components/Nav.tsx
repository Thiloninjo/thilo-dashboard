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
    <nav className="liquid-glass-nav flex items-center px-7 py-4 sticky top-0 z-10">
      <div className="text-base font-extrabold tracking-tight text-white/90">
        THILO
      </div>
      <div className="flex gap-0.5 ml-auto bg-white/5 rounded-2xl p-1">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-4 py-1.5 text-xs rounded-xl transition-all ${
                isActive
                  ? "bg-white/15 text-white font-semibold shadow-[0_0_20px_rgba(255,255,255,0.08)]"
                  : "text-white/50 hover:text-white/70"
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
