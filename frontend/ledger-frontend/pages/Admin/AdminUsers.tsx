import { useState, useEffect } from 'react';
import PageLayout from '../../components/PageLayout/PageLayout';
import AddUserModal from '../../components/Admin/addUserModal';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Avatar from '@mui/material/Avatar';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import styles from './AdminUsers.module.css';
import { useAdminGuard } from '../../hooks/useAdminGuard';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Pagination from '../../components/Pagination/Pagination';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
  role?: string;
}

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  createdAtUtc: string;
}

const AdminUsers = () => {
  const { loading: authLoading } = useAdminGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserIdFromAuth, setCurrentUserIdFromAuth] = useState<string | null>(null);

  


  
  const fetchUsers = async (currentPage = page) => {
    try {
      const response = await apiFetch(`${API_BASE}/api/users?page=${currentPage}&pageSize=${PAGE_SIZE}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const items: UserResponse[] = data.items ?? [];

      const transformedUsers = items.map((user: UserResponse) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: new Date(user.createdAtUtc).toISOString().split('T')[0],
        isAdmin: user.role === 'Admin'
      }));

      setUsers(transformedUsers);
      setTotalPages(data.totalPages ?? 1);
      setTotalCount(data.totalCount ?? 0);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load users
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(page); }, [page]);

  // Load current user ID
  useEffect(() => {
    const fetchCurrentUserId = async () => {
      try {
        const response = await apiFetch(`${API_BASE}/api/auth/me`);
        if (response.ok) {
          const data = await response.json();
          setCurrentUserIdFromAuth(data.userId);
        }
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUserId();
  }, []);

  if (authLoading) {
    return (
      <PageLayout type="admin">
        <div className={styles.loadingContainer}>
          <div>Verifying access...</div>
        </div>
      </PageLayout>
    );
  }


    const handleSelectAll = () => {
      if (selectedUsers.length === filteredUsers.length) {
        setSelectedUsers([]);
      } else {
        setSelectedUsers(filteredUsers.map(user => user.id));
      }
    };

    const handleSelectUser = (id: string) => {
      if (selectedUsers.includes(id)) {
        setSelectedUsers(selectedUsers.filter(userId => userId !== id));
      } else {
        setSelectedUsers([...selectedUsers, id]);
      }
    };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  const handleRoleChange = async (userId: string, currentIsAdmin: boolean) => {
  const newRole = currentIsAdmin ? 0 : 1;
  const action = currentIsAdmin ? 'DEMOTE' : 'PROMOTE';
  
  if (!confirm(`Are you sure you want to ${action} this user?`)) return;

  try {
    const meResponse = await apiFetch(`${API_BASE}/api/auth/me`);
    const me = await meResponse.json();
    
    const usersResponse = await apiFetch(`${API_BASE}/api/users`);
    
    if (!usersResponse.ok) {
      throw new Error('Failed to verify permissions');
    }
    
    const userList: UserResponse[] = await usersResponse.json();
    const currentUser = userList.find((u: UserResponse) => u.id === me.userId);
    
    // Double-check I'm actually admin
    if (!currentUser || currentUser.role !== 'Admin') {
      throw new Error('You must be an admin to change roles');
    }

    // Now actually perform the role change
    const response = await apiFetch(`${API_BASE}/api/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update role');
    }

    // Refresh the user list to get updated data
    await fetchUsers();
    
    // Check if this was the current user
    const updatedUsersResponse = await apiFetch(`${API_BASE}/api/users`);
    const updatedUsers: UserResponse[] = await updatedUsersResponse.json();
    const updatedCurrentUser = updatedUsers.find((u: UserResponse) => u.id === me.userId);

    if (updatedCurrentUser?.id === userId) {
      alert('Your role has been changed. Logging you out...');
      
      await apiFetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST'
      });
      
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  } catch (error) {
    console.error(`Failed to ${action} user:`, error);
    alert(`Failed to ${action} user. Please try again.`);
  }
};

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      fullName.includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || 
      (roleFilter === 'admin' && user.isAdmin) ||
      (roleFilter === 'user' && !user.isAdmin);
    
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <PageLayout type="admin">
        <div className={styles.loadingContainer}>
          <div>Loading users...</div>
        </div>
      </PageLayout>
    );
  }

  const handleDeleteSelected = async () => {
  if (selectedUsers.length === 0) return;
  
  setDeleting(true);
  
  try {
    // VERIFY admin status before deletion
    const meResponse = await apiFetch(`${API_BASE}/api/auth/me`);
    const me = await meResponse.json();
    
    const usersResponse = await apiFetch(`${API_BASE}/api/users`);
    
    if (!usersResponse.ok) {
      throw new Error('Failed to verify permissions');
    }
    
    const userList: UserResponse[] = await usersResponse.json();
    const currentUser = userList.find((u: UserResponse) => u.id === me.userId);
    
    if (!currentUser || currentUser.role !== 'Admin') {
      alert('You must be an admin to delete users');
      setDeleteConfirmOpen(false);
      setDeleting(false);
      return;
    }

    // Check if trying to delete yourself
    if (selectedUsers.includes(currentUser.id)) {
      alert('You cannot delete your own account');
      setDeleteConfirmOpen(false);
      setDeleting(false);
      return;
    }

    // Delete each selected user
    const deletePromises = selectedUsers.map(id => 
      apiFetch(`${API_BASE}/api/users/${id}`, {
        method: 'DELETE'
      })
    );
    
    const results = await Promise.all(deletePromises);
    
    // Check if any deletions failed
    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      console.error(`${failed.length} users failed to delete`);
      alert(`${failed.length} users could not be deleted. They may not exist or you lack permission.`);
    }
    
    // Refresh the user list
    await fetchUsers();
    
    // Clear selection and exit select mode
    setSelectedUsers([]);
    setSelectMode(false);
    setDeleteConfirmOpen(false);
    
  } catch (error) {
    console.error('Failed to delete users:', error);
    alert('Failed to delete users. Please try again.');
  } finally {
    setDeleting(false);
  }
};



const exportToCSV = () => {
  // Prepare the data for export
  const data = filteredUsers.map(user => ({
    'First Name': user.firstName,
    'Last Name': user.lastName,
    'Email': user.email,
    'Role': user.isAdmin ? 'Admin' : 'User',
    'Created At': user.createdAt
  }));
  
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToPDF = async () => {
  const tableElement = document.getElementById('users-table-container');
  if (!tableElement) return;
  
  try {
    const originalTable = tableElement.querySelector('table');
    if (!originalTable) return;
    
    // Clone the table
    const tableClone = originalTable.cloneNode(true) as HTMLElement;
    
    // Create a temporary container with Material UI styling
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '100%';
    tempContainer.style.backgroundColor = '#f5f5f5';  // Material UI background
    tempContainer.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    tempContainer.style.padding = '24px';
    
    // Add a header with Material UI styling
    const header = document.createElement('div');
    header.style.marginBottom = '24px';
    header.style.padding = '16px';
    header.style.backgroundColor = '#ffffff';
    header.style.borderRadius = '12px';
    header.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
    
    const title = document.createElement('h1');
    title.textContent = 'Users Report';
    title.style.color = '#415b80';
    title.style.fontSize = '24px';
    title.style.fontWeight = '600';
    title.style.margin = '0 0 8px 0';
    title.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    
    const date = document.createElement('p');
    date.textContent = `Generated: ${new Date().toLocaleString()}`;
    date.style.color = '#666';
    date.style.fontSize = '14px';
    date.style.margin = '0';
    date.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    
    const filterInfo = document.createElement('p');
    let filterText = `Showing ${filteredUsers.length} of ${users.length} users`;
    if (searchTerm) filterText += ` | Search: "${searchTerm}"`;
    if (roleFilter !== 'all') filterText += ` | Role: ${roleFilter === 'admin' ? 'Admins' : 'Regular Users'}`;
    filterInfo.textContent = filterText;
    filterInfo.style.color = '#666';
    filterInfo.style.fontSize = '12px';
    filterInfo.style.margin = '8px 0 0 0';
    filterInfo.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    
    header.appendChild(title);
    header.appendChild(date);
    header.appendChild(filterInfo);
    tempContainer.appendChild(header);
    
    // Style the table with Material UI design
    tableClone.style.width = '100%';
    tableClone.style.borderCollapse = 'collapse';
    tableClone.style.backgroundColor = '#ffffff';
    tableClone.style.borderRadius = '12px';
    tableClone.style.overflow = 'hidden';
    tableClone.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)';
    
    // Style thead
    const thead = tableClone.querySelector('thead');
    if (thead) {
      const headerRows = thead.querySelectorAll('tr');
      headerRows.forEach(row => {
        row.style.backgroundColor = '#415b80';
        const cells = row.querySelectorAll('th');
        cells.forEach(cell => {
          cell.style.color = '#ffffff';
          cell.style.fontWeight = '600';
          cell.style.fontSize = '14px';
          cell.style.padding = '16px';
          cell.style.textAlign = 'left';
          cell.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
          cell.style.borderBottom = '1px solid #e0e0e0';
        });
      });
    }
    
    // Style tbody
    const tbody = tableClone.querySelector('tbody');
    if (tbody) {
      const rows = tbody.querySelectorAll('tr');
      rows.forEach((row, index) => {
        row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafafa';
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          cell.style.padding = '16px';
          cell.style.fontSize = '13px';
          cell.style.color = '#333';
          cell.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
          cell.style.borderBottom = '1px solid #e0e0e0';
        });
      });
    }
    
    // Style the checkbox cells (if any)
    const checkboxes = tableClone.querySelectorAll('.MuiCheckbox-root, input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const cell = checkbox.closest('td');
      if (cell) {
        cell.style.textAlign = 'center';
        cell.style.width = '48px';
      }
    });
    
    tempContainer.appendChild(tableClone);
    
    // Add footer
    const footer = document.createElement('div');
    footer.style.marginTop = '24px';
    footer.style.padding = '16px';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '12px';
    footer.style.color = '#999';
    footer.style.fontFamily = 'Roboto, "Helvetica Neue", sans-serif';
    footer.textContent = 'Generated by School Inventory Management System';
    tempContainer.appendChild(footer);
    
    document.body.appendChild(tempContainer);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture the entire container
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      backgroundColor: '#f5f5f5',
      logging: false
    });
    
    document.body.removeChild(tempContainer);
    
    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    const imgWidth = 280;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    doc.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
    doc.save(`users_report_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to generate PDF');
  }
};

  return (
    <PageLayout type="admin">
      <div className={styles.usersContainer}>
        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.controlsLeft}>
            <Button 
              variant="contained" 
              className={styles.addButton}
              startIcon={<Icon>person_add</Icon>}
              onClick={() => setAddModalOpen(true)}
            >
              Add User
            </Button>
            
            <Button 
              variant="outlined" 
              className={styles.deleteButton}
              startIcon={<Icon>delete</Icon>}
              disabled={selectedUsers.length === 0}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              Delete ({selectedUsers.length})
            </Button>
            <Button 
              variant={selectMode ? 'contained' : 'outlined'}
              onClick={() => setSelectMode(!selectMode)}
              startIcon={<Icon>checklist</Icon>}
            >
              {selectMode ? 'Exit Selection' : 'Select Mode'}
            </Button>
          <Button
            variant="outlined" 
            startIcon={<Icon>download</Icon>}
            onClick={exportToCSV}
          >
            Export as CSV
          </Button>
          <Button
            variant="outlined" 
            startIcon={<Icon>print</Icon>}
            onClick={exportToPDF}
          >
            Export as PDF
          </Button>
          </div>

          <div className={styles.controlsRight}>
            <TextField
              size="small"
              placeholder="Search users by name or email..."
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
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                label="Role"
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <MenuItem value="all">All Users</MenuItem>
                <MenuItem value="admin">Admins</MenuItem>
                <MenuItem value="user">Regular Users</MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        {/* Users Table */}
        <div className={styles.tableContainer}  id="users-table-container">
          <table className={styles.usersTable}>
            <thead>
              <tr>
                {selectMode && (
                  <th className={styles.checkboxCell}>
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length}
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < filteredUsers.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>User</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Admin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={selectedUsers.includes(user.id) ? styles.selectedRow : ''}>
                  {selectMode && (
                    <td className={styles.checkboxCell}>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                      />
                    </td>
                  )}
                  <td>
                    <div className={styles.userCell}>
                      <Avatar className={styles.userAvatar}>
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </Avatar>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={styles.userEmail}>{user.email}</span>
                  </td>
                  <td>
                    <span className={styles.createdAt}>{formatDate(user.createdAt)}</span>
                  </td>
                  <td>
                    <Checkbox
                      checked={user.isAdmin}
                      disabled
                      className={styles.adminCheckbox}
                      icon={<Icon className={styles.checkboxIcon}>check_box_outline_blank</Icon>}
                      checkedIcon={<Icon className={styles.checkboxIconChecked}>check_box</Icon>}
                    />
                  </td>
                  <td>
                  <div className={styles.actionButtons}>
                    <Button
                      disabled={user.id === currentUserIdFromAuth}
                      size="small"
                      variant="outlined"
                      className={`${styles.actionButton} ${user.isAdmin ? styles.demoteButton : styles.promoteButton}`}
                      startIcon={<Icon>{user.isAdmin ? 'admin_panel_settings' : 'person_add'}</Icon>}
                      onClick={() => handleRoleChange(user.id, user.isAdmin)}
                    >
                      {user.isAdmin ? 'DEMOTE' : 'PROMOTE'}
                    </Button>
                  </div>
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with counts */}
        <div className={styles.tableFooter}>
          <span>Showing {filteredUsers.length} of {users.length} on this page</span>
          {selectedUsers.length > 0 && (
            <span className={styles.selectedCount}>
              {selectedUsers.length} selected
            </span>
          )}
        </div>
        <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Add User Modal */}
        <AddUserModal
      open={addModalOpen}
      onClose={() => setAddModalOpen(false)}
      onUserAdded={() => {
        console.log('User added, refresh list');
        fetchUsers();  
        setAddModalOpen(false);
      }}
    />

    <Dialog
  open={deleteConfirmOpen}
  onClose={() => !deleting && setDeleteConfirmOpen(false)}
>
  <DialogTitle>Confirm Delete</DialogTitle>
  <DialogContent>
    <p>Are you sure you want to delete {selectedUsers.length} selected user{selectedUsers.length !== 1 ? 's' : ''}?</p>
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
    </PageLayout>
  );
};

export default AdminUsers;