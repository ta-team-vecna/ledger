import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './UserInventory.module.css';
import RequestModal from '../../components/modals/RequestModal';
import EquipmentDetailsModal from '../../components/modals/EquipmentDetailsModal';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import Pagination from '../../components/Pagination/Pagination';

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

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  Available:   { color: '#4caf50', icon: 'check_circle',      label: 'Available' },
  Reserved:    { color: '#ffc107', icon: 'event',             label: 'Reserved' },
  CheckedOut:  { color: '#1976d2', icon: 'sync_alt',          label: 'Checked Out' },
  UnderRepair: { color: '#9c27b0', icon: 'build',             label: 'Under Repair' },
  Retired:     { color: '#9e9e9e', icon: 'delete_forever',    label: 'Retired' },
  Overdue:     { color: '#ff9800', icon: 'warning',           label: 'Overdue' },
  Unavailable: { color: '#f44336', icon: 'cancel',            label: 'Unavailable' },
};

const TYPE_ICONS: Record<string, string> = {
  Laptop:  'laptop',
  Tablet:  'tablet',
  Audio:   'headphones',
  Lab:     'science',
  AV:      'videocam',
  Tool:    'build',
};

const canRequest = (status: string) =>
  !['underrepair', 'retired', 'unavailable'].includes(status.toLowerCase());

const UserInventory = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`${API_BASE}/api/equipment?page=${page}&pageSize=${PAGE_SIZE}`);
        if (!res.ok) throw new Error('Failed to fetch equipment');
        const data = await res.json();
        setEquipment(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEquipment();
  }, [page]);

  const types = ['all', ...Array.from(new Set(equipment.map(e => e.type)))];
  const locations = ['all', ...Array.from(new Set(equipment.map(e => e.location)))];

  const filtered = equipment.filter(item => {
    const matchesSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;

    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const handleRequestClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setRequestModalOpen(true);
  };

  const handleDetailsClick = (item: Equipment) => {
    setSelectedEquipment(item);
    setDetailsModalOpen(true);
  };

  const handleRequestFromDetails = () => {
    setDetailsModalOpen(false);
    setRequestModalOpen(true);
  };

  return (
    <PageLayout type="user">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <Icon className={styles.titleIcon}>inventory_2</Icon>
            Equipment Inventory
          </h1>
          <p className={styles.subtitle}>Browse available equipment and submit a reservation request.</p>
        </div>

        {/* Filters */}
        <div className={styles.controls}>
          <TextField
            size="small"
            placeholder="Search by name, serial, type, location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Icon style={{ fontSize: 18, color: 'var(--hover-color)' }}>search</Icon>
                </InputAdornment>
              ),
            }}
            className={styles.searchField}
          />

          <FormControl size="small" className={styles.filterSelect}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="all">All Statuses</MenuItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" className={styles.filterSelect}>
            <InputLabel>Category</InputLabel>
            <Select value={typeFilter} label="Category" onChange={e => setTypeFilter(e.target.value)}>
              {types.map(t => (
                <MenuItem key={t} value={t}>{t === 'all' ? 'All Categories' : t}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" className={styles.filterSelect}>
            <InputLabel>Location</InputLabel>
            <Select value={locationFilter} label="Location" onChange={e => setLocationFilter(e.target.value)}>
              {locations.map(l => (
                <MenuItem key={l} value={l}>{l === 'all' ? 'All Locations' : l}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Count */}
        <div className={styles.countBar}>
          <span>{filtered.length} of {equipment.length} on this page</span>
          {(statusFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all' || searchTerm) && (
            <Button
              size="small"
              variant="text"
              startIcon={<Icon>clear</Icon>}
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); setLocationFilter('all'); }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.loadingContainer}>
            <CircularProgress />
            <span>Loading equipment...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <Icon className={styles.emptyIcon}>search_off</Icon>
            <p>No equipment matches your filters.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(item => {
              const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG['Unavailable'];
              const typeIcon = TYPE_ICONS[item.type] ?? 'inventory';
              const requestable = canRequest(item.status);

              return (
                <div key={item.id} className={styles.card}>
                  {/* Photo / Icon */}
                  <div className={styles.cardPhoto}>
                    {item.photoUrl ? (
                      <img src={item.photoUrl} alt={item.name} className={styles.photo} />
                    ) : (
                      <Icon className={styles.placeholderIcon}>{typeIcon}</Icon>
                    )}
                  </div>

                  {/* Body */}
                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <Chip
                        label={item.type}
                        size="small"
                        className={styles.typeChip}
                      />
                      <Chip
                        icon={<Icon style={{ fontSize: 13 }}>{statusCfg.icon}</Icon>}
                        label={statusCfg.label}
                        size="small"
                        style={{
                          backgroundColor: `${statusCfg.color}20`,
                          color: statusCfg.color,
                          border: `1px solid ${statusCfg.color}`,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <h3 className={styles.cardName}>{item.name}</h3>

                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>
                        <Icon className={styles.metaIcon}>place</Icon>
                        {item.location}
                      </span>
                      <span className={styles.metaItem}>
                        <Icon className={styles.metaIcon}>star_rate</Icon>
                        {item.condition}
                      </span>
                      {item.requiresAdminApproval ? (
                        <span className={styles.metaItem} style={{ color: '#f44336' }}>
                          <Icon className={styles.metaIcon}>lock</Icon>
                          Requires approval
                        </span>
                      ) : (
                        <span className={styles.metaItem} style={{ color: '#4caf50' }}>
                          <Icon className={styles.metaIcon}>lock_open</Icon>
                          Auto-approved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={styles.cardActions}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Icon>info</Icon>}
                      onClick={() => handleDetailsClick(item)}
                      className={styles.detailsButton}
                    >
                      Details
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<Icon>add_circle</Icon>}
                      onClick={() => handleRequestClick(item)}
                      disabled={!requestable}
                      className={styles.requestButton}
                    >
                      Request
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {/* Modals */}
      <RequestModal
        open={requestModalOpen}
        onClose={() => { setRequestModalOpen(false); }}
        onRequestSubmitted={() => { }}
        preselectedEquipmentId={selectedEquipment?.id}
      />

      {selectedEquipment && (
        <EquipmentDetailsModal
          open={detailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          equipment={selectedEquipment}
          onRequest={handleRequestFromDetails}
        />
      )}
    </PageLayout>
  );
};

export default UserInventory;
