import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Checkbox, CircularProgress, Alert } from '@mui/material';
import Icon from '@mui/material/Icon';
import { apiFetch } from '../../src/utils/apiFetch';
import styles from './addItemModal.module.css';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onItemAdded: () => void;
}

interface EquipmentPayload {
  name: string;
  type: string;
  serialNumber: string;
  condition: string;
  location: string;
  requiresAdminApproval: boolean;
  photoUrl?: string;
}

const AddItemModal = ({ open, onClose, onItemAdded }: AddItemModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serialNumber: '',
    condition: '',
    location: '',
    photoUrl: '',
    requiresAdminApproval: false
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const verifyAdmin = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // First, get current user ID from the lying endpoint
      const meResponse = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include'
      });
      
      if (!meResponse.ok) {
        throw new Error('Not authenticated');
      }
      
      const me = await meResponse.json();
      
      // Then verify actual role from the TRUTH source
      const usersResponse = await fetch('http://localhost:3001/api/users', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!usersResponse.ok) {
        throw new Error('Failed to verify permissions');
      }
      
      const users = await usersResponse.json();
      const currentUser = users.find((u: any) => u.id === me.userId);
      
      if (!currentUser || currentUser.role !== 'Admin') {
        throw new Error('You must be an admin to add items');
      }
      
      return true;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.type || !formData.serialNumber || !formData.condition || !formData.location) {
      setError('All fields except Photo URL are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, VERIFY we're actually admin using the truth source
      await verifyAdmin();

      const token = localStorage.getItem('token');
      
      // Prepare payload - photoUrl is optional, so omit if empty
      const payload: EquipmentPayload = {
        name: formData.name,
        type: formData.type,
        serialNumber: formData.serialNumber,
        condition: formData.condition,
        location: formData.location,
        requiresAdminApproval: formData.requiresAdminApproval
      };

      // Only include photoUrl if provided
      if (formData.photoUrl.trim()) {
        payload.photoUrl = formData.photoUrl;
      }

      const response = await apiFetch('http://localhost:3001/api/equipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item');
      }

      // Reset form and close modal
      setFormData({
        name: '',
        type: '',
        serialNumber: '',
        condition: '',
        location: '',
        photoUrl: '',
        requiresAdminApproval: false
      });
      
      onItemAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className={styles.title}>
        <Icon className={styles.titleIcon}>add_box</Icon>
        Add New Item
      </DialogTitle>
      
      <DialogContent className={styles.content}>
        {error && (
          <Alert severity="error" className={styles.error} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Item Name *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          disabled={loading}
          required
          className={styles.field}
        />

        <TextField
          margin="dense"
          name="type"
          label="Category/Type *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.type}
          onChange={handleChange}
          disabled={loading}
          required
          className={styles.field}
          placeholder="e.g., Laptop, Tablet, Audio"
        />

        <TextField
          margin="dense"
          name="serialNumber"
          label="Serial Number *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.serialNumber}
          onChange={handleChange}
          disabled={loading}
          required
          className={styles.field}
        />

        <TextField
          margin="dense"
          name="condition"
          label="Condition *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.condition}
          onChange={handleChange}
          disabled={loading}
          required
          className={styles.field}
          placeholder="e.g., New, Good, Fair, Poor"
        />

        <TextField
          margin="dense"
          name="location"
          label="Location *"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.location}
          onChange={handleChange}
          disabled={loading}
          required
          className={styles.field}
          placeholder="e.g., Storage A, Lab 101"
        />

        <TextField
          margin="dense"
          name="photoUrl"
          label="Photo URL (Optional)"
          type="url"
          fullWidth
          variant="outlined"
          value={formData.photoUrl}
          onChange={handleChange}
          disabled={loading}
          className={styles.field}
          placeholder="https://example.com/image.jpg"
        />

        <FormControlLabel
          control={
            <Checkbox
              name="requiresAdminApproval"
              checked={formData.requiresAdminApproval}
              onChange={handleChange}
              disabled={loading}
            />
          }
          label="Requires Admin Approval for checkout"
          className={styles.checkbox}
        />
      </DialogContent>

      <DialogActions className={styles.actions}>
        <Button onClick={handleClose} disabled={loading} className={styles.cancelButton}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          className={styles.submitButton}
          startIcon={loading ? <CircularProgress size={20} /> : <Icon>add</Icon>}
        >
          {loading ? 'Adding...' : 'Add Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddItemModal;