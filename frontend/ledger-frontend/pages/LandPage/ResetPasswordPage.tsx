import { useState } from 'react';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import styles from './AuthPage.module.css';
import { Button, TextField, Link, Alert } from '@mui/material';
import { API_BASE } from '../../src/utils/apiFetch';
import ledgerDarkLogo from '../../src/assets/ledger-dark.svg';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginCard}>
      <img src={ledgerDarkLogo} alt="Ledger" className={styles.authLogo} />
      <h1>RESET PASSWORD</h1>
      <p>Enter your reset token and a new password</p>

      {success ? (
        <Alert severity="success" sx={{ width: '90%', mt: 2 }}>
          Password reset successfully! Redirecting to login...
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {error && <Alert severity="error" sx={{ width: '90%', mb: 2 }}>{error}</Alert>}
          <TextField
            className={styles.TextInput}
            label="Reset Token"
            value={token}
            onChange={e => setToken(e.target.value)}
            required
            helperText="Paste the token from the forgot password page"
          />
          <TextField
            className={styles.TextInput}
            label="New Password"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
          />
          <TextField
            className={styles.TextInput}
            label="Confirm Password"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          <Button
            variant="contained"
            className={styles.customButton}
            size="large"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}

      <Link component={RouterLink} to="/login" className={styles.customLink} style={{ marginTop: 16 }}>
        ← Back to Login
      </Link>
    </div>
  );
};

export default ResetPasswordPage;
