import { Link } from "react-router-dom";
import styles from "./AppLogo.module.css";

export function AppLogo() {
  return (
    <Link to="/" className={styles.link} aria-label="Sector — на главную">
      <img src="/logo.png" alt="" className={styles.img} />
      <span className={styles.text}>Sector</span>
    </Link>
  );
}
