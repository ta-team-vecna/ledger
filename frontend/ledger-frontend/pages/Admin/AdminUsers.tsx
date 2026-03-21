import { useState, useEffect } from 'react';
import Topbar from "../../components/topBar/topBar";
import AdminSidebar from "../../components/adminSideBar/adminSideBar";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [currentUserIdFromAuth, setCurrentUserIdFromAuth] = useState<string | null>(null);

  


  
  const fetchUsers = async () => {
    try {
      const response = await apiFetch(`${API_BASE}/api/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: UserResponse[] = await response.json();
      
      const transformedUsers = data.map((user: UserResponse) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: new Date(user.createdAtUtc).toISOString().split('T')[0],
        isAdmin: user.role === 'Admin'
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load users
  useEffect(() => {
    fetchUsers();
  }, []);

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
      <>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>
          <div>Verifying access...</div>
        </div>
      </>
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
      <>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={styles.loadingContainer}>
          <div>Loading users...</div>
        </div>
      </>
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


  return (
    <>
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.usersContainer} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
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
        <div className={styles.tableContainer}>
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
          <span>Showing {filteredUsers.length} of {users.length} users</span>
          {selectedUsers.length > 0 && (
            <span className={styles.selectedCount}>
              {selectedUsers.length} selected
            </span>
          )}
        </div>
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
    </>
  );
};

export default AdminUsers;