import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControlLabel, Checkbox, CircularProgress, Alert, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import Icon from '@mui/material/Icon';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import styles from './addItemModal.module.css';

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  condition: string;
  status: string;
  location: string;
  photoUrl?: string;
  requiresAdminApproval: boolean;
}

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onItemAdded: () => void;
  editItem?: Equipment | null;
}

const EQUIPMENT_STATUSES = ['Available', 'Reserved', 'CheckedOut', 'UnderRepair', 'Retired'];

const AddItemModal = ({ open, onClose, onItemAdded, editItem }: AddItemModalProps) => {
  const isEdit = !!editItem;

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serialNumber: '',
    condition: '',
    location: '',
    photoUrl: '',
    requiresAdminApproval: false,
    status: 'Available',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form when editing
  useEffect(() => {
    if (editItem) {
      setFormData({
        name: editItem.name,
        type: editItem.type,
        serialNumber: editItem.serialNumber,
        condition: editItem.condition,
        location: editItem.location,
        photoUrl: editItem.photoUrl ?? '',
        requiresAdminApproval: editItem.requiresAdminApproval,
        status: editItem.status === 'Overdue' ? 'CheckedOut' : editItem.status,
      });
    } else {
      setFormData({ name: '', type: '', serialNumber: '', condition: '', location: '', photoUrl: '', requiresAdminApproval: false, status: 'Available' });
    }
    setError(null);
  }, [editItem, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.type || !formData.condition || !formData.location) {
      setError('Name, type, condition, and location are required');
      return;
    }
    if (!isEdit && !formData.serialNumber) {
      setError('Serial number is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEdit) {
        const payload = {
          name: formData.name,
          type: formData.type,
          condition: formData.condition,
          location: formData.location,
          photoUrl: formData.photoUrl.trim() || null,
          requiresAdminApproval: formData.requiresAdminApproval,
          status: formData.status,
        };
        const response = await apiFetch(`${API_BASE}/api/equipment/${editItem!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || 'Failed to update item');
        }
      } else {
        const payload: Record<string, unknown> = {
          name: formData.name,
          type: formData.type,
          serialNumber: formData.serialNumber,
          condition: formData.condition,
          location: formData.location,
          requiresAdminApproval: formData.requiresAdminApproval,
        };
        if (formData.photoUrl.trim()) payload.photoUrl = formData.photoUrl;

        const response = await apiFetch(`${API_BASE}/api/equipment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || 'Failed to add item');
        }
      }

      onItemAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { if (!loading) { setError(null); onClose(); } };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle className={styles.title}>
        <Icon className={styles.titleIcon}>{isEdit ? 'edit' : 'add_box'}</Icon>
        {isEdit ? 'Edit Item' : 'Add New Item'}
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
          className={styles.field}
          placeholder="e.g., Laptop, Tablet, Audio"
        />

        {isEdit ? (
          <TextField
            margin="dense"
            label="Serial Number"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.serialNumber}
            disabled
            className={styles.field}
            helperText="Serial number cannot be changed"
          />
        ) : (
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
            className={styles.field}
          />
        )}

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

        {isEdit && (
          <FormControl fullWidth margin="dense" className={styles.field}>
            <InputLabel>Status</InputLabel>
            <Select
              name="status"
              value={formData.status}
              label="Status"
              onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
              disabled={loading}
            >
              {EQUIPMENT_STATUSES.map(s => (
                <MenuItem key={s} value={s}>{s === 'CheckedOut' ? 'Checked Out' : s === 'UnderRepair' ? 'Under Repair' : s}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

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
          startIcon={loading ? <CircularProgress size={20} /> : <Icon>{isEdit ? 'save' : 'add'}</Icon>}
        >
          {loading ? (isEdit ? 'Saving...' : 'Adding...') : (isEdit ? 'Save Changes' : 'Add Item')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddItemModal;
