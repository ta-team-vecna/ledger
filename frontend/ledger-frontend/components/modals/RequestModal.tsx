// components/RequestModal.tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Chip
} from '@mui/material';
import Icon from '@mui/material/Icon';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import styles from "./RequestModal.module.css";

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
}

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
  userId?: string; // Optional - for admin mode vs user mode
}

const RequestModal = ({ open, onClose, onRequestSubmitted, userId }: RequestModalProps) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    equipmentId: '',
    requestedFromUtc: '',
    requestedToUtc: ''
  });

  // Fetch available equipment on mount
  useEffect(() => {
    const fetchEquipment = async () => {
      if (!open) return;
      
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3001/api/equipment', {
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error('Failed to fetch equipment');
        
        const data = await response.json();
        // Filter to only available equipment
        const available = data.filter((item: Equipment) => 
          item.status.toLowerCase() === 'available'
        );
        setEquipment(available);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [open]);

  // CUSTOM VALIDATION because backend can't be trusted
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Equipment validation
    if (!formData.equipmentId) {
      errors.equipmentId = 'Please select equipment';
    }

    // Date validation - Start date
    if (!formData.requestedFromUtc) {
      errors.requestedFromUtc = 'Start date is required';
    } else {
      const startDate = new Date(formData.requestedFromUtc);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.requestedFromUtc = 'Start date cannot be in the past';
      }

      // Sanity check: not before year 2000 
      if (startDate.getFullYear() < 2000) {
        errors.requestedFromUtc = 'Invalid start date';
      }
    }

    // Date validation - End date
    if (!formData.requestedToUtc) {
      errors.requestedToUtc = 'End date is required';
    } else {
      const endDate = new Date(formData.requestedToUtc);
      const startDate = new Date(formData.requestedFromUtc);

      if (formData.requestedFromUtc && endDate <= startDate) {
        errors.requestedToUtc = 'End date must be after start date';
      }

      // Max rental period: 30 days
      if (formData.requestedFromUtc) {
        const maxEndDate = new Date(startDate);
        maxEndDate.setDate(maxEndDate.getDate() + 30);
        
        if (endDate > maxEndDate) {
          errors.requestedToUtc = 'Rental period cannot exceed 30 days';
        }
      }

      // Sanity check: not after year 2100 
      if (endDate.getFullYear() > 2100) {
        errors.requestedToUtc = 'Invalid end date';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDateChange = (field: string, value: Date | null) => {
    if (value) {
      // Store in UTC format that backend expects
      setFormData(prev => ({
        ...prev,
        [field]: value.toISOString()
      }));
      // Clear field error
      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleEquipmentChange = (e: any) => {
    setFormData(prev => ({ ...prev, equipmentId: e.target.value }));
    if (fieldErrors.equipmentId) {
      setFieldErrors(prev => ({ ...prev, equipmentId: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:3001/api/requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle backend validation errors (even though i don't trust them)
        if (data.errors) {
          const backendErrors: Record<string, string> = {};
          Object.keys(data.errors).forEach(key => {
            backendErrors[key] = data.errors[key][0];
          });
          setFieldErrors(backendErrors);
        }
        throw new Error(data.message || 'Failed to submit request');
      }

      // Success
      setFormData({
        equipmentId: '',
        requestedFromUtc: '',
        requestedToUtc: ''
      });
      
      onRequestSubmitted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        equipmentId: '',
        requestedFromUtc: '',
        requestedToUtc: ''
      });
      setFieldErrors({});
      setError(null);
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown={submitting}
      >
        <DialogTitle className={styles.title}>
          <Icon className={styles.titleIcon}>assignment</Icon>
          Request Equipment
        </DialogTitle>

        <DialogContent className={styles.content}>
          {error && (
            <Alert severity="error" className={styles.alert} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading ? (
            <div className={styles.loadingEquipment}>
              <CircularProgress size={24} />
              <span>Loading available equipment...</span>
            </div>
          ) : equipment.length === 0 ? (
            <Alert severity="info" className={styles.alert}>
              No equipment available for request at this time.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth margin="dense" className={styles.field}>
                <InputLabel>Equipment *</InputLabel>
                <Select
                  value={formData.equipmentId}
                  label="Equipment *"
                  onChange={handleEquipmentChange}
                  disabled={submitting}
                  error={!!fieldErrors.equipmentId}
                >
                  {equipment.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      <div className={styles.equipmentOption}>
                        <span>{item.name}</span>
                        <span className={styles.equipmentSerial}>
                          {item.serialNumber}
                        </span>
                        <Chip 
                          label={item.type} 
                          size="small" 
                          className={styles.equipmentType}
                        />
                      </div>
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.equipmentId && (
                  <FormHelperText error>{fieldErrors.equipmentId}</FormHelperText>
                )}
              </FormControl>

              <DatePicker
                label="Start Date *"
                value={formData.requestedFromUtc ? new Date(formData.requestedFromUtc) : null}
                onChange={(date) => handleDateChange('requestedFromUtc', date)}
                disabled={submitting}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    className: styles.field,
                    error: !!fieldErrors.requestedFromUtc,
                    helperText: fieldErrors.requestedFromUtc,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Icon className={styles.dateIcon}>event</Icon>
                        </InputAdornment>
                      )
                    }
                  }
                }}
                minDate={new Date()} // Can't start in the past
              />

              <DatePicker
                label="End Date *"
                value={formData.requestedToUtc ? new Date(formData.requestedToUtc) : null}
                onChange={(date) => handleDateChange('requestedToUtc', date)}
                disabled={submitting}
                minDate={formData.requestedFromUtc ? new Date(formData.requestedFromUtc) : new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'dense',
                    className: styles.field,
                    error: !!fieldErrors.requestedToUtc,
                    helperText: fieldErrors.requestedToUtc,
                    InputProps: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Icon className={styles.dateIcon}>event</Icon>
                        </InputAdornment>
                      )
                    }
                  }
                }}
              />

              <div className={styles.validationNote}>
                <Icon className={styles.noteIcon}>info</Icon>
                <small>
                  Maximum rental period: 30 days.
                  {equipment.length > 0 && ` ${equipment.length} items available.`}
                </small>
              </div>
            </>
          )}
        </DialogContent>

        <DialogActions className={styles.actions}>
          <Button 
            onClick={handleClose} 
            disabled={submitting}
            className={styles.cancelButton}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting || loading || equipment.length === 0}
            className={styles.submitButton}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Icon>send</Icon>}
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default RequestModal;