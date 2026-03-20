import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import styles from './AdminInventory.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import { apiFetch } from '../../src/utils/apiFetch';
import AddItemModal from '../../components/Admin/addItemModal';

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

const AdminInventory = () => {
  const { loading: authLoading } = useAdminGuard();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  // Data State
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [equipRes, reqRes] = await Promise.all([
        apiFetch('http://localhost:3001/api/equipment'),
        apiFetch('http://localhost:3001/api/requests/all')
      ]);
      
      const equipData = await equipRes.json();
      const reqData = await reqRes.json();
      
      setEquipment(equipData);
      setRequests(Array.isArray(reqData) ? reqData : Object.values(reqData));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'CheckedOut': 'Checked Out',
    'UnderRepair': 'Under Repair',
    'Available': 'Available',
    'Reserved': 'Reserved',
    'Retired': 'Retired',
    'Overdue': 'Overdue',
    'Unavailable': 'Unavailable'
  };
  return statusMap[status] || status;
};

const isItemInUse = (itemId: string): boolean => {
  const item = equipment.find(e => e.id === itemId);
  if (!item) return false;
  
  // Check if item is checked out
  if (item.status === 'CheckedOut') return true;
  
  // Check if there's an active request
  const activeRequest = requests.find(r => 
    r.equipmentId === itemId && 
    r.status === 'Approved' && 
    !r.returnedAtUtc &&
    new Date() >= new Date(r.requestedFromUtc) && 
    new Date() <= new Date(r.requestedToUtc)
  );
  
  return !!activeRequest;
};  

  // Calculate display status based on equipment and requests
const getDisplayStatus = (item: Equipment): string => {
  // First, trust what the equipment table says about its CURRENT state
  if (item.status === 'CheckedOut') return 'CheckedOut';
  if (item.status === 'UnderRepair') return 'UnderRepair';
  if (item.status === 'Retired') return 'Retired';
  if (item.status === 'Unavailable') return 'Unavailable';
  
  // Only use requests for future/predicted states
  const itemRequests = requests.filter(r => r.equipmentId === item.id);
  const activeRequest = itemRequests
    .sort((a, b) => new Date(b.requestedAtUtc).getTime() - new Date(a.requestedAtUtc).getTime())
    .find(r => r.status !== 'Returned' && r.status !== 'Rejected');

  if (!activeRequest) return item.status;

  const now = new Date();
  const start = new Date(activeRequest.requestedFromUtc);
  const end = new Date(activeRequest.requestedToUtc);

  if (activeRequest.returnedAtUtc) return 'Returned';
  
  if (activeRequest.status === 'Approved') {
    if (now < start) return 'Reserved';
    if (now > end) return 'Overdue';
    return 'Available';
  }
  
  return item.status;
};
  // Get icon for equipment type
  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'Laptop': 'laptop',
      'Tablet': 'tablet',
      'Audio': 'headphones',
      'Lab': 'science',
      'AV': 'videocam',
      'Tool': 'build'
    };
    return icons[type] || 'inventory';
  };

  // Check if item can be modified
  const canModifyItem = (itemId: string): { allowed: boolean; reason?: string } => {
    const item = equipment.find(e => e.id === itemId);
    if (!item) return { allowed: false, reason: 'Item not found' };

  useEffect(() => {
  fetchEquipment();
}, []);

  // Handle status change
  const handleStatusChange = async (action: string) => {
    if (!activeItem) return;
    
    const item = equipment.find(e => e.id === activeItem);
    if (!item) return;

    const { allowed, reason } = canModifyItem(activeItem);
    if (!allowed) {
      alert(reason || 'Cannot modify this item');
      handleActionClose();
      return;
    }

    // Check for future reservations
    const futureRequest = requests.find(r => 
      r.equipmentId === activeItem && 
      r.status === 'Approved' && 
      !r.returnedAtUtc &&
      new Date(r.requestedFromUtc) > new Date()
    );

    if (futureRequest) {
      const confirmChange = window.confirm(
        'This item has an approved future reservation'
      );
      if (!confirmChange) {
        handleActionClose();
        return;
      }
    }

    // Check if trying to set to Available while checked out
    if (action === 'available' && item.status === 'CheckedOut') {
      const confirmReturn = window.confirm(
        'Item is currently checked out. Mark as available?'
      );
      if (!confirmReturn) {
        handleActionClose();
        return;
      }
    }

    // Prevent retiring non-available items
    if (action === 'retired' && item.status !== 'Available') {
      alert('Cannot retire an item that is not available');
      handleActionClose();
      return;
    }

    const statusNumber = STATUS_NUMBER[action];
    if (statusNumber === undefined) return;

    try {
      const response = await apiFetch(`http://localhost:3001/api/equipment/${activeItem}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusNumber })
      });

      if (!response.ok) throw new Error('Failed to update status');
      
      await fetchData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      handleActionClose();
    }
  };

  // Handle delete selected
  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    
    setDeleting(true);
    try {
      const deletePromises = selectedItems.map(id =>
        apiFetch(`http://localhost:3001/api/equipment/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        alert(`${failed.length} items could not be deleted`);
      }
      
      await fetchData();
      setSelectedItems([]);
      setSelectMode(false);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error('Failed to delete items:', error);
      alert('Failed to delete items');
    } finally {
      setDeleting(false);
    }
  };

  // Selection handlers
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(i => i.id));
    }
  };

  // Menu handlers
  const handleActionClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setActiveItem(id);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setActiveItem(null);
  };

  // Transform data for display
  const displayItems = equipment.map(item => ({
    id: item.id,
    category: item.type,
    name: item.name,
    location: item.location,
    status: getDisplayStatus(item),
    icon: getTypeIcon(item.type)
  }));

  const categories = ['all', ...new Set(displayItems.map(i => i.category))];

  const filteredItems = displayItems.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (authLoading || loading) {
    return (
      <>
        <Topbar isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>Loading...</div>
      </>
    );
  }

  return (
    <>
      <Topbar isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.inventoryContainer} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.controlsLeft}>
            <Button
              variant="contained"
              className={styles.addButton}
              startIcon={<Icon>add</Icon>}
              onClick={() => setAddModalOpen(true)}
            >
              Add Item
            </Button>
            
            <Button
              variant="outlined"
              className={styles.deleteButton}
              startIcon={<Icon>delete</Icon>}
              disabled={selectedItems.length === 0}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete ({selectedItems.length})
            </Button>

            <Button
              variant={selectMode ? 'contained' : 'outlined'}
              onClick={() => setSelectMode(!selectMode)}
              startIcon={<Icon>checklist</Icon>}
            >
              {selectMode ? 'Exit Selection' : 'Select Mode'}
            </Button>
          </div>

          <div className={styles.controlsRight}>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon className={styles.searchIcon}>search</Icon>
                  </InputAdornment>
                ),
              }}
              className={styles.searchField}
            />

            <FormControl size="small" className={styles.filterSelect}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>{config.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" className={styles.filterSelect}>
              <InputLabel>Category</InputLabel>
              <Select
                value={categoryFilter}
                label="Category"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat === 'all' ? 'All' : cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Inventory Table */}
        <div className={styles.tableContainer}>
          <table className={styles.inventoryTable}>
            <thead>
              <tr>
                {selectMode && (
                  <th className={styles.checkboxCell}>
                    <Checkbox
                      checked={selectedItems.length === filteredItems.length}
                      indeterminate={selectedItems.length > 0 && selectedItems.length < filteredItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>Category</th>
                <th>Item Name</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG['Unavailable'];
                const { allowed, reason } = canModifyItem(item.id);
                
                return (
                  <tr key={item.id} className={selectedItems.includes(item.id) ? styles.selectedRow : ''}>
                    {selectMode && (
                      <td className={styles.checkboxCell}>
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </td>
                    )}
                    <td>
                      <div className={styles.categoryCell}>
                        <Icon className={styles.categoryIcon}>{item.icon}</Icon>
                        <span>{item.category}</span>
                      </div>
                    </td>
                    <td className={styles.itemName}>{item.name}</td>
                    <td>
                      {isItemInUse(item.id) ? (
                        <Chip
                          icon={<Icon className={styles.statusIcon}>block</Icon>}
                          label="CHECKED OUT/RESERVED"
                          size="small"
                          className={styles.statusChip}
                          style={{
                            backgroundColor: '#f4433620',
                            color: '#f44336',
                            borderColor: '#f44336'
                          }}
                        />
                      ) : (
                        <Chip
                          icon={<Icon className={styles.statusIcon}>{statusConfig.icon}</Icon>}
                          label={statusConfig.label}
                          size="small"
                          className={styles.statusChip}
                          style={{
                            backgroundColor: `${statusConfig.color}20`,
                            color: statusConfig.color,
                            borderColor: statusConfig.color
                          }}
                        />
                      )}
                    </td>
                    <td>{item.location}</td>
                    <td>
                      <Tooltip title={!allowed ? reason : ''} arrow>
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            className={styles.actionButton}
                            onClick={(e) => handleActionClick(e, item.id)}
                            endIcon={<Icon>arrow_drop_down</Icon>}
                            disabled={!allowed}
                          >
                            Change
                          </Button>
                        </span>
                      </Tooltip>
                      <Menu
                        anchorEl={anchorEl}
                        open={activeItem === item.id}
                        onClose={handleActionClose}
                      >
                        <MenuItem onClick={() => handleStatusChange('available')}>
                          <Icon className={styles.menuIcon}>check_circle</Icon> Available
                        </MenuItem>
                        <MenuItem onClick={() => handleStatusChange('repair')}>
                          <Icon className={styles.menuIcon}>build</Icon> Repair
                        </MenuItem>
                        <MenuItem onClick={() => handleStatusChange('retired')}>
                          <Icon className={styles.menuIcon}>delete_forever</Icon> Retire
                        </MenuItem>
                      </Menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className={styles.tableFooter}>
          <span>Showing {filteredItems.length} of {displayItems.length} items</span>
          {selectedItems.length > 0 && (
            <span className={styles.selectedCount}>
              {selectedItems.length} selected
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddItemModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onItemAdded={fetchData}
      />

      <Dialog open={deleteConfirmOpen} onClose={() => !deleting && setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <p>Delete {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''}?</p>
          <p style={{ color: '#f44336' }}>
            <Icon style={{ fontSize: '16px', verticalAlign: 'middle' }}>warning</Icon>
            This cannot be undone.
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSelected}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <Icon>delete</Icon>}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AdminInventory;