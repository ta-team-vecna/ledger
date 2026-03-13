import { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import styles from "./AuthPage.module.css";
import { Button, TextField, Link, Alert } from "@mui/material";
import { useAuth } from "../../src/context/useAuth";

const RegisterPage = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await register(firstName, lastName, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={styles.topBar}>
        <p>SCHOOL INVENTORY MANAGEMENT SYSTEM</p>
      </div>
      <div className={styles.loginCard} style={{ height: "auto", paddingTop: "24px", paddingBottom: "24px" }}>
        <h1>CREATE ACCOUNT</h1>
        <p>Fill in the details to register</p>
        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {error && <Alert severity="error" sx={{ width: "90%", mb: 2 }}>{error}</Alert>}
          <TextField
            className={styles.TextInput}
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button
            variant="contained"
            className={styles.customButton}
            size="large"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </form>
        <Link component={RouterLink} to="/login" className={styles.customLink} id="login-link">
          Already have an account? Log in
        </Link>
        <div className={styles.customLinkDiv}></div>
      </div>
    </>
  );
};

export default RegisterPage;
