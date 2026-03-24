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
  Chip,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import Icon from '@mui/material/Icon';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import styles from "./RequestModal.module.css";
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';

interface Equipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  status: string;
  requiresAdminApproval: boolean;
}

interface RequestModalProps {
  open: boolean;
  onClose: () => void;
  onRequestSubmitted: () => void;
  preselectedEquipmentId?: string;
}

const RequestModal = ({ open, onClose, onRequestSubmitted, preselectedEquipmentId }: RequestModalProps) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'open'>('all');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    equipmentId: '',
    requestedFromUtc: '',
    requestedToUtc: ''
  });

  // Fetch requestable equipment on open
  useEffect(() => {
    const fetchEquipment = async () => {
      if (!open) return;

      setLoading(true);
      try {
        const response = await apiFetch(`${API_BASE}/api/equipment`);
        if (!response.ok) throw new Error('Failed to fetch equipment');
        const data = await response.json();
        const equipmentItems: Equipment[] = Array.isArray(data) ? data : (data.items ?? []);
        // Exclude permanently unavailable items; users can still request items with future reservations
        const bookable = equipmentItems.filter((item: Equipment) => {
          const s = item.status.toLowerCase();
          return s !== 'underrepair' && s !== 'retired';
        });
        setEquipment(bookable);
        setFilteredEquipment(bookable);
        if (preselectedEquipmentId) {
          setFormData(prev => ({ ...prev, equipmentId: preselectedEquipmentId }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load equipment');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [open, preselectedEquipmentId]);

  // Handle filter change
  const handleFilterChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'all' | 'open' | null) => {
    if (newMode !== null) {
      setFilterMode(newMode);
      if (newMode === 'all') {
        setFilteredEquipment(equipment);
      } else {
        setFilteredEquipment(equipment.filter(item => !item.requiresAdminApproval));
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.equipmentId) {
      errors.equipmentId = 'Please select equipment';
    }

    if (!formData.requestedFromUtc) {
      errors.requestedFromUtc = 'Start date is required';
    } else {
      const startDate = new Date(formData.requestedFromUtc);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.requestedFromUtc = 'Start date cannot be in the past';
      }

      if (startDate.getFullYear() < 2000) {
        errors.requestedFromUtc = 'Invalid start date';
      }
    }

    if (!formData.requestedToUtc) {
      errors.requestedToUtc = 'End date is required';
    } else {
      const endDate = new Date(formData.requestedToUtc);
      const startDate = new Date(formData.requestedFromUtc);

      if (formData.requestedFromUtc && endDate <= startDate) {
        errors.requestedToUtc = 'End date must be after start date';
      }

      if (formData.requestedFromUtc) {
        const maxEndDate = new Date(startDate);
        maxEndDate.setDate(maxEndDate.getDate() + 30);
        
        if (endDate > maxEndDate) {
          errors.requestedToUtc = 'Rental period cannot exceed 30 days';
        }
      }

      if (endDate.getFullYear() > 2100) {
        errors.requestedToUtc = 'Invalid end date';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDateChange = (field: string, value: Date | null) => {
    if (value) {
      setFormData(prev => ({
        ...prev,
        [field]: value.toISOString()
      }));
      if (fieldErrors[field]) {
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
      }
    }
  };

  const handleEquipmentChange = (e: SelectChangeEvent<string>) => {
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
    // Create request; backend handles auto-approval for open items.
    const createResponse = await apiFetch(`${API_BASE}/api/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      if (createData.errors) {
        const backendErrors: Record<string, string> = {};
        Object.keys(createData.errors).forEach(key => {
          backendErrors[key] = createData.errors[key][0];
        });
        setFieldErrors(backendErrors);
      }
      throw new Error(createData.detail || createData.message || 'Failed to submit request');
    }

    const createdStatus = String(createData.status ?? '').toLowerCase();
    if (createdStatus === 'approved') {
      alert('Request created and automatically approved.');
    } else {
      alert('Request submitted successfully. Awaiting admin approval.');
    }

    // Reset form and close
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
              {/* Filter Toggle */}
              <div className={styles.filterContainer}>
                <ToggleButtonGroup
                  size="small"
                  value={filterMode}
                  exclusive
                  onChange={handleFilterChange}
                  aria-label="equipment filter"
                  className={styles.filterGroup}
                >
                  <ToggleButton value="all" aria-label="all equipment">
                    <Icon className={styles.filterIcon}>list</Icon>
                    All
                  </ToggleButton>
                  <ToggleButton value="open" aria-label="requires approval">
                    <Icon className={styles.filterIcon}>lock_open</Icon>
                    Open (No Approval)
                  </ToggleButton>
                </ToggleButtonGroup>
              </div>

              <FormControl fullWidth margin="dense" className={styles.field}>
                <InputLabel>Equipment *</InputLabel>
                <Select
                  value={formData.equipmentId}
                  label="Equipment *"
                  onChange={handleEquipmentChange}
                  disabled={submitting}
                  error={!!fieldErrors.equipmentId}
                >
                  {filteredEquipment.map((item) => (
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
                        {!item.requiresAdminApproval && (
                          <Tooltip title="This item does NOT require admin approval">
                            <Chip
                              icon={<Icon className={styles.openIcon}>lock_open</Icon>}
                              label="Open"
                              size="small"
                              className={styles.openChip}
                            />
                          </Tooltip>
                        )}
                        {item.requiresAdminApproval && (
                          <Tooltip title="This item requires admin approval">
                            <Chip
                              icon={<Icon className={styles.lockedIcon}>lock</Icon>}
                              label="Approval Required"
                              size="small"
                              className={styles.lockedChip}
                            />
                          </Tooltip>
                        )}
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
                minDate={new Date()}
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
                  {equipment.length > 0 && ` ${filteredEquipment.length} items shown (${equipment.length} total)`}
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
            disabled={submitting || loading || filteredEquipment.length === 0}
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