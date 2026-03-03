import { Outlet, NavLink, useMatch } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { IconCalendar } from "./TabIcons";
import styles from "./MainLayout.module.css";

const tabs = [{ to: "/events", label: "События", Icon: IconCalendar }] as const;

export function MainLayout() {
  const isChatRoom = useMatch("/chat/:id");

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
            end
            title={label}
          >
            <span className={styles.tabIcon} aria-hidden>
              <Icon className={styles.tabIconSvg} />
            </span>
            <span className={styles.tabLabel}>{label}</span>
          </NavLink>
        ))}
      </aside>
      <main className={`${styles.main} ${isChatRoom ? styles.mainChatOpen : ""}`}>
        <Outlet />
      </main>
      <div className={`${styles.bottomNav} ${isChatRoom ? styles.bottomNavHidden : ""}`}>
        <BottomNav />
      </div>
    </div>
  );
}
