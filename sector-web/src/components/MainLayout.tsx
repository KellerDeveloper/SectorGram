import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { IconChat, IconCalendar, IconStories, IconProfile } from "./TabIcons";
import styles from "./MainLayout.module.css";

const tabs = [
  { to: "/", label: "Чаты", Icon: IconChat },
  { to: "/events", label: "События", Icon: IconCalendar },
  { to: "/stories", label: "Истории", Icon: IconStories },
  { to: "/profile", label: "Профиль", Icon: IconProfile },
] as const;

export function MainLayout() {
  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar} aria-label="Меню">
        {tabs.map(({ to, label, Icon }) => (
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
              <Icon className={styles.tabIconSvg} />
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
