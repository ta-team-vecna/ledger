// AdminInventory.tsx
import { useState } from 'react';
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
import { Divider } from '@mui/material';
import styles from './AdminInventory.module.css';
import { useEffect } from 'react';  


const AdminInventory = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
   const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSelectItem = (id: string) => {
  if (selectedItems.includes(id)) {
    setSelectedItems(selectedItems.filter(itemId => itemId !== id));
  } else {
    setSelectedItems([...selectedItems, id]);
  }
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
      statusNumber = 0;  // Available
      break;
    case 'reserved':
      statusNumber = 1;  // Reserved
      break;
    case 'borrow':
      statusNumber = 2;  // CheckedOut
      break;
    case 'repair':
      statusNumber = 3;  // UnderRepair
      break;
    case 'retired':
      statusNumber = 4;  // Retired
      break;
    default:
      return;
  }
  
  try {
    const response = await fetch(`http://localhost:3001/api/equipment/${itemId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusNumber })  // 👈 Send number!
    });
    
    if (response.ok) {
      const fetchResponse = await fetch('http://localhost:3001/api/equipment', {
        credentials: 'include'
      });
      const data = await fetchResponse.json();
      setEquipment(data);
    } else {
      const errorData = await response.json();
      console.error('Update failed:', errorData);
    }
  } catch (error) {
    console.error('Failed to update status:', error);
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
            >
              Add New Item
            </Button>
            
            <Button 
              variant="outlined" 
              className={styles.deleteButton}
              startIcon={<Icon>delete</Icon>}
              disabled={selectedItems.length === 0}
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
                <MenuItem value="available">Available</MenuItem>
                <MenuItem value="borrowed">Borrowed</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
                <MenuItem value="repair">In Repair</MenuItem>
                <MenuItem value="unavailable">Unavailable</MenuItem>
                <MenuItem value="reserved">Reserved</MenuItem>
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
                    label={item.status.toUpperCase()}  // 👈 This is correct
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
    </>
  );
};

export default AdminInventory;