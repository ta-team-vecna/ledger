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
import styles from "./AdminInventory.module.css";

// Mock data for demonstration
const mockItems = [
  { id: 1, category: 'Laptop', name: 'MacBook Pro 16"', assignedTo: 'Sarah Johnson', status: 'borrowed', dueDate: '2026-03-20', icon: 'laptop' },
  { id: 2, category: 'Laptop', name: 'Dell XPS 13', assignedTo: 'None', status: 'available', dueDate: null, icon: 'laptop' },
  { id: 3, category: 'Tablet', name: 'iPad Pro 12.9"', assignedTo: 'Prof. Chen', status: 'borrowed', dueDate: '2026-03-25', icon: 'tablet' },
  { id: 4, category: 'Audio', name: 'Sony Headphones', assignedTo: 'Mike Chen', status: 'overdue', dueDate: '2026-03-10', icon: 'headphones' },
  { id: 5, category: 'Lab', name: 'Microscope Set', assignedTo: 'Science Dept', status: 'reserved', dueDate: '2026-04-01', icon: 'science' },
  { id: 6, category: 'AV', name: 'Projector', assignedTo: 'In Repair', status: 'repair', dueDate: null, icon: 'videocam' },
  { id: 7, category: 'Laptop', name: 'Lenovo ThinkPad', assignedTo: 'None', status: 'available', dueDate: null, icon: 'laptop' },
  { id: 8, category: 'Tablet', name: 'Samsung Tab S9', assignedTo: 'Lost', status: 'unavailable', dueDate: null, icon: 'tablet' },
  { id: 9, category: 'Audio', name: 'AirPods Pro', assignedTo: 'Emma Wilson', status: 'borrowed', dueDate: '2026-03-18', icon: 'headphones' },
  { id: 10, category: 'Lab', name: 'Arduino Kit', assignedTo: 'Robotics Club', status: 'borrowed', dueDate: '2026-03-30', icon: 'memory' },
  { id: 11, category: 'Tool', name: '3D Printer', assignedTo: 'In Repair', status: 'repair', dueDate: null, icon: 'print' },
  { id: 12, category: 'AV', name: 'Camera Kit', assignedTo: 'None', status: 'available', dueDate: null, icon: 'camera' },
  { id: 13, category: 'Laptop', name: 'HP EliteBook', assignedTo: 'John Smith', status: 'borrowed', dueDate: '2026-03-22', icon: 'laptop' },
  { id: 14, category: 'Tablet', name: 'Microsoft Surface', assignedTo: 'Design Dept', status: 'reserved', dueDate: '2026-04-05', icon: 'tablet' },
  { id: 15, category: 'Audio', name: 'Conference Mic', assignedTo: 'None', status: 'available', dueDate: null, icon: 'mic' },
];

const AdminInventory = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const handleSelectAll = () => {
    if (selectedItems.length === mockItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(mockItems.map(item => item.id));
    }
  };

  const handleSelectItem = (id: number) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(itemId => itemId !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, id: number) => {
    setAnchorEl(event.currentTarget);
    setActiveItem(id);
  };

  const handleActionClose = () => {
    setAnchorEl(null);
    setActiveItem(null);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: '#4caf50',
      borrowed: '#1976d2',
      overdue: '#ff9800',
      repair: '#9c27b0',
      unavailable: '#f44336',
      reserved: '#ffc107'
    };
    return colors[status as keyof typeof colors] || '#999';
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      available: 'check_circle',
      borrowed: 'sync_alt',
      overdue: 'warning',
      repair: 'build',
      unavailable: 'cancel',
      reserved: 'event'
    };
    return icons[status as keyof typeof icons] || 'help';
  };

  // Get unique categories for filter
  const categories = ['all', ...new Set(mockItems.map(item => item.category))];

  const filteredItems = mockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

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
                      checked={selectedItems.length === mockItems.length}
                      indeterminate={selectedItems.length > 0 && selectedItems.length < mockItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>Category</th>
                <th>Item Name</th>
                <th>Status</th>
                <th>Assigned To</th>
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
                      label={item.status.toUpperCase()}
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
                      <MenuItem onClick={handleActionClose}>
                        <Icon className={styles.menuIcon}>sync_alt</Icon> Mark Borrowed
                      </MenuItem>
                      <MenuItem onClick={handleActionClose}>
                        <Icon className={styles.menuIcon}>check_circle</Icon> Mark Available
                      </MenuItem>
                      <MenuItem onClick={handleActionClose}>
                        <Icon className={styles.menuIcon}>build</Icon> Mark In Repair
                      </MenuItem>
                      <MenuItem onClick={handleActionClose}>
                        <Icon className={styles.menuIcon}>event</Icon> Reserve
                      </MenuItem>
                      <Divider />
                      <MenuItem onClick={handleActionClose} className={styles.deleteMenuItem}>
                        <Icon className={styles.menuIcon}>delete</Icon> Delete
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
          <span>Showing {filteredItems.length} of {mockItems.length} items</span>
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