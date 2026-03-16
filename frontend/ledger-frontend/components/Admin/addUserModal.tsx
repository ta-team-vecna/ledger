// components/Admin/AddUserModal.tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import Icon from '@mui/material/Icon';
import styles from './addUserModal.module.css';

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  onUserAdded: () => void;
}

const AddUserModal = ({ open, onClose, onUserAdded }: AddUserModalProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error messages from backend
        if (data.errors) {
          // If backend returns validation errors
          const backendErrors: Record<string, string> = {};
          Object.keys(data.errors).forEach(key => {
            backendErrors[key.toLowerCase()] = data.errors[key][0];
          });
          setFieldErrors(backendErrors);
          throw new Error('Validation failed');
        } else {
          throw new Error(data.message || 'Failed to create user');
        }
      }

      // Reset form on success
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      });
      
      onUserAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: ''
      });
      setFieldErrors({});
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown={loading}
    >
      <DialogTitle className={styles.title}>
        <Icon className={styles.titleIcon}>person_add</Icon>
        Add New User
      </DialogTitle>
      
      <DialogContent className={styles.content}>
        {error && (
          <Alert severity="error" className={styles.alert} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          margin="dense"
          name="firstName"
          label="First Name *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.firstName}
          onChange={handleChange}
          disabled={loading}
          error={!!fieldErrors.firstName}
          helperText={fieldErrors.firstName}
          className={styles.field}
        />

        <TextField
          margin="dense"
          name="lastName"
          label="Last Name *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.lastName}
          onChange={handleChange}
          disabled={loading}
          error={!!fieldErrors.lastName}
          helperText={fieldErrors.lastName}
          className={styles.field}
        />

        <TextField
          margin="dense"
          name="email"
          label="Email *"
          type="email"
          fullWidth
          variant="outlined"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          error={!!fieldErrors.email}
          helperText={fieldErrors.email}
          className={styles.field}
        />

        <TextField
          margin="dense"
          name="password"
          label="Password *"
          type={showPassword ? 'text' : 'password'}
          fullWidth
          variant="outlined"
          value={formData.password}
          onChange={handleChange}
          disabled={loading}
          error={!!fieldErrors.password}
          helperText={fieldErrors.password || 'Minimum 6 characters'}
          className={styles.field}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                  disabled={loading}
                >
                  <Icon>{showPassword ? 'visibility_off' : 'visibility'}</Icon>
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </DialogContent>

      <DialogActions className={styles.actions}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          className={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          className={styles.submitButton}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Icon>add</Icon>}
        >
          {loading ? 'Creating...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserModal;