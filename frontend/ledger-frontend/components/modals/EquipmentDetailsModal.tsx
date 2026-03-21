import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Icon from '@mui/material/Icon';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import styles from './EquipmentDetailsModal.module.css';

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

interface Reservation {
  fromUtc: string;
  toUtc: string;
  status: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  equipment: Equipment;
  onRequest: () => void;
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  Available:   { color: '#4caf50', icon: 'check_circle',   label: 'Available' },
  Reserved:    { color: '#ffc107', icon: 'event',          label: 'Reserved' },
  CheckedOut:  { color: '#1976d2', icon: 'sync_alt',       label: 'Checked Out' },
  UnderRepair: { color: '#9c27b0', icon: 'build',          label: 'Under Repair' },
  Retired:     { color: '#9e9e9e', icon: 'delete_forever', label: 'Retired' },
  Overdue:     { color: '#ff9800', icon: 'warning',        label: 'Overdue' },
  Unavailable: { color: '#f44336', icon: 'cancel',         label: 'Unavailable' },
};

const TYPE_ICONS: Record<string, string> = {
  Laptop: 'laptop', Tablet: 'tablet', Audio: 'headphones',
  Lab: 'science', AV: 'videocam', Tool: 'build',
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

const canRequest = (status: string) =>
  !['underrepair', 'retired', 'unavailable'].includes(status.toLowerCase());

const EquipmentDetailsModal = ({ open, onClose, equipment, onRequest }: Props) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingRes, setLoadingRes] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setLoadingRes(true);
      try {
        const res = await apiFetch(`${API_BASE}/api/equipment/${equipment.id}/reservations`);
        if (res.ok) setReservations(await res.json());
      } catch {
        // non-critical
      } finally {
        setLoadingRes(false);
      }
    };
    fetch();
  }, [open, equipment.id]);

  const statusCfg = STATUS_CONFIG[equipment.status] ?? STATUS_CONFIG['Unavailable'];
  const typeIcon = TYPE_ICONS[equipment.type] ?? 'inventory';
  const requestable = canRequest(equipment.status);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle className={styles.title}>
        <Icon className={styles.titleIcon}>{typeIcon}</Icon>
        {equipment.name}
      </DialogTitle>

      <DialogContent className={styles.content}>
        {/* Photo */}
        {equipment.photoUrl && (
          <div className={styles.photoWrapper}>
            <img src={equipment.photoUrl} alt={equipment.name} className={styles.photo} />
          </div>
        )}

        {/* Status badge */}
        <div className={styles.statusRow}>
          <Chip
            icon={<Icon style={{ fontSize: 14 }}>{statusCfg.icon}</Icon>}
            label={statusCfg.label}
            style={{
              backgroundColor: `${statusCfg.color}20`,
              color: statusCfg.color,
              border: `1px solid ${statusCfg.color}`,
              fontWeight: 600,
            }}
          />
          {equipment.requiresAdminApproval ? (
            <Chip
              icon={<Icon style={{ fontSize: 14 }}>lock</Icon>}
              label="Requires Admin Approval"
              style={{ backgroundColor: '#f4433618', color: '#f44336', border: '1px solid #f44336' }}
            />
          ) : (
            <Chip
              icon={<Icon style={{ fontSize: 14 }}>lock_open</Icon>}
              label="Auto-Approved"
              style={{ backgroundColor: '#4caf5018', color: '#4caf50', border: '1px solid #4caf50' }}
            />
          )}
        </div>

        {/* Details grid */}
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <Icon className={styles.detailIcon}>category</Icon>
            <div>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>{equipment.type}</span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <Icon className={styles.detailIcon}>qr_code</Icon>
            <div>
              <span className={styles.detailLabel}>Serial Number</span>
              <span className={styles.detailValue}>{equipment.serialNumber}</span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <Icon className={styles.detailIcon}>place</Icon>
            <div>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>{equipment.location}</span>
            </div>
          </div>
          <div className={styles.detailItem}>
            <Icon className={styles.detailIcon}>star_rate</Icon>
            <div>
              <span className={styles.detailLabel}>Condition</span>
              <span className={styles.detailValue}>{equipment.condition}</span>
            </div>
          </div>
        </div>

        <Divider className={styles.divider} />

        {/* Reservations */}
        <div className={styles.reservationsSection}>
          <h4 className={styles.sectionTitle}>
            <Icon className={styles.sectionIcon}>event_busy</Icon>
            Reserved Dates
          </h4>

          {loadingRes ? (
            <div className={styles.resLoading}>
              <CircularProgress size={20} />
              <span>Loading reservations...</span>
            </div>
          ) : reservations.length === 0 ? (
            <p className={styles.noReservations}>
              <Icon style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>event_available</Icon>
              No upcoming reservations — equipment is freely requestable.
            </p>
          ) : (
            <div className={styles.reservationList}>
              {reservations.map((r, i) => {
                const resCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG['Reserved'];
                return (
                  <div key={i} className={styles.reservationItem}>
                    <Icon className={styles.resIcon} style={{ color: resCfg.color }}>
                      {resCfg.icon}
                    </Icon>
                    <span className={styles.resDates}>
                      {fmt(r.fromUtc)} — {fmt(r.toUtc)}
                    </span>
                    <Chip
                      label={resCfg.label}
                      size="small"
                      style={{
                        backgroundColor: `${resCfg.color}20`,
                        color: resCfg.color,
                        border: `1px solid ${resCfg.color}`,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>

      <DialogActions className={styles.actions}>
        <Button onClick={onClose} variant="outlined">Close</Button>
        <Button
          onClick={onRequest}
          variant="contained"
          disabled={!requestable}
          startIcon={<Icon>add_circle</Icon>}
        >
          Request This Item
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EquipmentDetailsModal;
