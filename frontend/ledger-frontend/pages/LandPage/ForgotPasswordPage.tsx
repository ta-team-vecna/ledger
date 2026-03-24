import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import styles from './AuthPage.module.css';
import { Button, TextField, Link, Alert } from '@mui/material';
import { API_BASE } from '../../src/utils/apiFetch';
import ledgerDarkLogo from '../../src/assets/ledger-dark.svg';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Request failed');
      setResetToken(data.resetToken ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      <img src={ledgerDarkLogo} alt="Ledger" className={styles.authLogo} />
      <h1>FORGOT PASSWORD</h1>
      <p>Enter your email to receive a reset link</p>

      {resetToken ? (
        <div style={{ width: '90%', textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Reset token generated. Use it on the reset password page.
          </Alert>
          <div style={{ background: '#f1f5f9', borderRadius: 8, padding: '12px', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 13, marginBottom: 16 }}>
            {resetToken}
          </div>
          <Link component={RouterLink} to={`/reset-password?token=${resetToken}`} className={styles.customLink}>
            Go to Reset Password →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {error && <Alert severity="error" sx={{ width: '90%', mb: 2 }}>{error}</Alert>}
          <TextField
            className={styles.TextInput}
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Button
            variant="contained"
            className={styles.customButton}
            size="large"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      )}

      <Link component={RouterLink} to="/login" className={styles.customLink} style={{ marginTop: 16 }}>
        ← Back to Login
      </Link>
    </div>
  );
};

export default ForgotPasswordPage;
