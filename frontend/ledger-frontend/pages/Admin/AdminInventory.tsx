import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import styles from './AdminInventory.module.css'; 
import { useAdminGuard } from '../../hooks/useAdminGuard';

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
import AddItemModal from '../../components/Admin/addItemModal';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

const AdminInventory = () => {
    const { loading: authLoading } = useAdminGuard();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSelectItem = (id: string) => {
  if (selectedItems.includes(id)) {
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  } else {
    setSelectedItems([...selectedItems, id]);
  }
  };

  const verifyAdmin = async () => {
  try {
    const token = localStorage.getItem('token');
    
    // Get current user ID
    const meResponse = await fetch('http://localhost:3001/api/auth/me', {
      credentials: 'include'
    });
    
    if (!meResponse.ok) {
      throw new Error('Not authenticated');
    }
    
    const me = await meResponse.json();
    
    // Verify actual role from truth source
    const usersResponse = await fetch('http://localhost:3001/api/users', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!usersResponse.ok) {
      throw new Error('Failed to verify permissions');
    }
    
    const users = await usersResponse.json();
    const currentUser = users.find((u: any) => u.id === me.userId);
    
    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('Admin privileges required');
    }
    
    return true;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Authentication failed');
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

 const handleActionClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
  setAnchorEl(event.currentTarget);
  setActiveItem(id);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setActiveItem(null);
  };


    const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'Available': '#4caf50',
    'Reserved': '#ffc107',
    'CheckedOut': '#1976d2',         
    'UnderRepair': '#9c27b0',        
    'Retired': '#9e9e9e',             
    'Overdue': '#ff9800',
    'Unavailable': '#f44336'
  };
  return colors[status] || '#999';
};

 const getStatusIcon = (status: string) => {
  const icons: Record<string, string> = {
    'Available': 'check_circle',     
    'Reserved': 'event',
    'CheckedOut': 'sync_alt',        
    'UnderRepair': 'build',          
    'Retired': 'delete_forever',
    'Overdue': 'warning',               
    'Unavailable': 'cancel'
  };
  return icons[status] || 'help';
};

  // Get unique categories for filter

  useEffect(() => {
    const fetchEquipment = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/equipment', {
      credentials: 'include', 
      headers: { 
        'Content-Type': 'application/json'  
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setEquipment(data);
  } catch (error) {
    console.error('Failed to fetch:', error);
  } finally {
    setLoading(false);
  }
};
  
  fetchEquipment();
}, []);


const handleDeleteSelected = async () => {
  if (selectedItems.length === 0) return;
  
  setDeleting(true);
  
  try {
    await verifyAdmin();
    
    const token = localStorage.getItem('token');
    
    // Delete each selected item with auth header
    const deletePromises = selectedItems.map(id => 
      fetch(`http://localhost:3001/api/equipment/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      })
    );
    
    const results = await Promise.all(deletePromises);
    
    // Check if any deletions failed
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      console.error(`${failed.length} items failed to delete`);
      alert(`${failed.length} items could not be deleted. You may not have permission.`);
    }
    
    // Refresh the equipment list
    await fetchEquipment();
    
    // Clear selection and exit select mode
    setSelectedItems([]);
    setSelectMode(false);
    setDeleteConfirmOpen(false);
    
  } catch (error) {
    console.error('Failed to delete items:', error);
    alert(error instanceof Error ? error.message : 'Failed to delete items');
  } finally {
    setDeleting(false);
  }
};

const fetchEquipment = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/equipment', {
        credentials: 'include', 
        headers: { 
          'Content-Type': 'application/json'  
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setEquipment(data);
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper to get icon based on type
  const getIconForType = (type: string) => {
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

const handleAction = async (action: string, itemId: string | null) => {
  if (!itemId) return;
  
  let statusNumber = 0;
  
  switch(action) {
    case 'available':
      statusNumber = 0;
      break;
    case 'reserved':
      statusNumber = 1;
      break;
    case 'borrow':
      statusNumber = 2;
      break;
    case 'repair':
      statusNumber = 3;
      break;
    case 'retired':
      statusNumber = 4;
      break;
    default:
      return;
  }
  
  try {
    await verifyAdmin();
    
    const token = localStorage.getItem('token');
    
    const response = await fetch(`http://localhost:3001/api/equipment/${itemId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 👈 Add token header
      },
      body: JSON.stringify({ status: statusNumber })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update status');
    }
    
    // Refresh the equipment list
    await fetchEquipment();
    
  } catch (error) {
    console.error('Failed to update status:', error);
    alert(error instanceof Error ? error.message : 'Failed to update status');
  }
  
  handleActionClose();
};


  // Map backend data to your table format
  const mappedItems = equipment.map(item => ({
    id: item.id,
    category: item.type,
    name: item.name,
    assignedTo: item.location, // Adjust based on your needs
    status: item.status,
    dueDate: null, // You'll need to calculate from requests
    icon: getIconForType(item.type)
  }));

  // Use mappedItems instead of mockItems
  const categories = ['all', ...new Set(mappedItems.map(item => item.category))];

  const filteredItems = mappedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Update selection handlers to use string IDs
  const handleSelectAll = () => {
    if (selectedItems.length === mappedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mappedItems.map(item => item.id));
    }
  };

  // Add loading state UI
  if (loading) {
    return <div>Loading inventory...</div>;
  }
     if (authLoading) {
    return (
      <>
        <Topbar isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>
          <div>Verifying access...</div>
        </div>
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
  Add New Item
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
              placeholder="Search items, categories, people..."
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
    <MenuItem value="all">All Status</MenuItem>
    <MenuItem value="Available">Available</MenuItem>
    <MenuItem value="CheckedOut">Checked out</MenuItem>
    <MenuItem value="UnderRepair">Under Repair</MenuItem>
    <MenuItem value="Reserved">Reserved</MenuItem>
    <MenuItem value="Retired">Retired</MenuItem>
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
                    {cat === 'all' ? 'All Categories' : cat}
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
                    checked={selectedItems.length === mappedItems.length}
indeterminate={selectedItems.length > 0 && selectedItems.length < mappedItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>Category</th>
                <th>Item Name</th>
                <th>Status</th>
                <th>Location  </th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
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
                 <Chip
  icon={<Icon className={styles.statusIcon}>{getStatusIcon(item.status)}</Icon>}
  label={formatStatus(item.status).toUpperCase()}
  size="small"
  className={styles.statusChip}
  style={{
    backgroundColor: `${getStatusColor(item.status)}20`,
    color: getStatusColor(item.status),
    borderColor: getStatusColor(item.status)
  }}
/>
                  </td>
                  <td>
                    <div className={styles.assignedCell}>
                      {item.assignedTo !== 'None' && item.assignedTo !== 'Lost' && item.assignedTo !== 'In Repair' && (
                        <Avatar className={styles.assignedAvatar}>
                          {item.assignedTo.charAt(0)}
                        </Avatar>
                      )}
                      <span className={
                        item.assignedTo === 'None' || item.assignedTo === 'Lost' || item.assignedTo === 'In Repair' 
                          ? styles.unassigned 
                          : ''
                      }>
                        {item.assignedTo}
                      </span>
                    </div>
                  </td>
                  <td>
                    {item.dueDate ? (
                      <span className={item.status === 'overdue' ? styles.overdueDate : ''}>
                        {item.dueDate}
                      </span>
                    ) : (
                      <span className={styles.noDate}>—</span>
                    )}
                  </td>
                  <td>
                    <Button
  size="small"
  variant="outlined"
  className={styles.actionButton}
  onClick={(e) => handleActionClick(e, item.id)}
  endIcon={<Icon>arrow_drop_down</Icon>}
                  >
                    Change
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={activeItem === item.id}
                    onClose={handleActionClose}
                  >
                    <MenuItem onClick={() => handleAction('borrow', activeItem)}>
                  <Icon className={styles.menuIcon}>sync_alt</Icon> Mark Borrowed
                </MenuItem>
                <MenuItem onClick={() => handleAction('available', activeItem)}>
                  <Icon className={styles.menuIcon}>check_circle</Icon> Mark Available
                </MenuItem>
                <MenuItem onClick={() => handleAction('repair', activeItem)}>
                  <Icon className={styles.menuIcon}>build</Icon> Mark In Repair
                </MenuItem>
                <MenuItem onClick={() => handleAction('reserved', activeItem)}>
                  <Icon className={styles.menuIcon}>event</Icon> Reserve
                </MenuItem>
                <MenuItem onClick={() => handleAction('retired', activeItem)}>
                  <Icon className={styles.menuIcon}>delete_forever</Icon> Retire
                </MenuItem>
                    </Menu>
                  </td>
                </tr>
              ))}
              
            </tbody>
          </table>
        </div>

        {/* Footer with counts */}
        <div className={styles.tableFooter}>
          <span>Showing {filteredItems.length} of {mappedItems.length} items</span>
          {selectedItems.length > 0 && (
            <span className={styles.selectedCount}>
              {selectedItems.length} selected
            </span>
          )}
        </div>
      </div>
      <AddItemModal
  open={addModalOpen}
  onClose={() => setAddModalOpen(false)}
  onItemAdded={fetchEquipment}
/>
          <Dialog
  open={deleteConfirmOpen}
  onClose={() => !deleting && setDeleteConfirmOpen(false)}
>
  <DialogTitle>Confirm Delete</DialogTitle>
  <DialogContent>
    <p>Are you sure you want to delete {selectedItems.length} selected item{selectedItems.length !== 1 ? 's' : ''}?</p>
    <p style={{ color: '#f44336', fontSize: '0.9em', marginTop: '10px' }}>
      <Icon style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '5px' }}>warning</Icon>
      This action cannot be undone.
    </p>
  </DialogContent>
  <DialogActions>
    <Button 
      onClick={() => setDeleteConfirmOpen(false)} 
      disabled={deleting}
    >
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