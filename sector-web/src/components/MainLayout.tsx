import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import styles from "./MainLayout.module.css";

const tabs = [
  { to: "/", label: "Чаты", icon: "💬" },
  { to: "/events", label: "События", icon: "📅" },
  { to: "/stories", label: "Истории", icon: "📷" },
  { to: "/profile", label: "Профиль", icon: "👤" },
] as const;

export function MainLayout() {
  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar} aria-label="Меню">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
            }
            end={to === "/"}
            title={label}
          >
            <span className={styles.tabIcon} aria-hidden>
              {icon}
            </span>
            <span className={styles.tabLabel}>{label}</span>
          </NavLink>
        ))}
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
      <div className={styles.bottomNav}>
        <BottomNav />
      </div>
    </div>
  );
}
