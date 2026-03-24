import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import styles from "./AuthPage.module.css";
import { Button, TextField, Link, Alert } from "@mui/material";
import { useAuth } from "../../src/context/useAuth";
import ledgerDarkLogo from "../../src/assets/ledger-dark.svg";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.loginCard}>
        <img src={ledgerDarkLogo} alt="Ledger" className={styles.authLogo} />
        <h1>WELCOME BACK!</h1>
        <p>Please sign into your account</p>
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {error && <Alert severity="error" sx={{ width: "90%", mb: 2 }}>{error}</Alert>}
          <TextField
            className={styles.TextInput}
            id="outlined-email-input"
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            id="outlined-password-input"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            variant="contained"
            className={styles.customButton}
            size="large"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <Link component={RouterLink} to="/register" className={styles.customLink} id="register-link">
          Register here
        </Link>
        <Link component={RouterLink} to="/forgot-password" className={styles.customLink} style={{ marginTop: 8, fontSize: '0.85rem' }}>
          Forgot password?
        </Link>
        <div className={styles.customLinkDiv}></div>
      </div>
    </>
  );
};

export default LoginPage;