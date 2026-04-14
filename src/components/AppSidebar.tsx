import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/think", icon: "📹", label: "Think" },
  { to: "/predict", icon: "👾", label: "Predict" },
  { to: "/act", icon: "👨🏻‍🏫", label: "Act" },
];

const AppSidebar = () => {
  return (
    <aside className="fixed left-0 top-0 h-full w-20 bg-sidebar flex flex-col items-center py-8 border-r border-border z-50">
      <div className="text-2xl font-bold text-primary mb-12">⚽</div>
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-surface-hover hover:text-foreground"
              }`
            }
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-[11px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default AppSidebar;
