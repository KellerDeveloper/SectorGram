import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import styles from "./Auth.module.css";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleGoogleSuccess(credentialResponse: { credential?: string }) {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      setError("Не получен токен от Google");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle(idToken);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа через Google");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <img src="/logo.png" alt="Sector" className={styles.logo} />
        </div>
        <p className={styles.subtitle}>Вход в мессенджер</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            autoComplete="current-password"
            required
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>
        {googleClientId && (
          <div className={styles.form}>
            <div className={styles.googleWrap}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Ошибка входа через Google")}
                useOneTap={false}
                theme="filled_black"
                size="large"
                text="continue_with"
              />
            </div>
          </div>
        )}
        <p className={styles.footer}>
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </div>
    </div>
  );
}
