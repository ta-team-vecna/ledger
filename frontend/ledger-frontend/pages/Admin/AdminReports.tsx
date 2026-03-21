    // pages/Admin/AdminReports.tsx
    import { useState, useEffect } from 'react';
    import Topbar from "../../components/topBar/topBar";
    import AdminSidebar from "../../components/adminSideBar/adminSideBar";
    import Icon from '@mui/material/Icon';
    import Button from '@mui/material/Button';
    import ButtonGroup from '@mui/material/ButtonGroup';
    import Accordion from '@mui/material/Accordion';
    import AccordionSummary from '@mui/material/AccordionSummary';
    import AccordionDetails from '@mui/material/AccordionDetails';
    import Alert from '@mui/material/Alert';
    import styles from './AdminReports.module.css';
    import { useAdminGuard } from '../../hooks/useAdminGuard';
    import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
    } from 'recharts';

    interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAtUtc: string;
    }

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

    interface Request {
    id: string;
    userId: string;
    userFullName: string;
    equipmentId: string;
    equipmentName: string;
    equipmentSerialNumber: string;
    status: string;
    requestedAtUtc: string;
    requestedFromUtc: string;
    requestedToUtc: string;
    reviewedAtUtc: string | null;
    checkedOutAtUtc: string | null;
    returnedAtUtc: string | null;
    adminComment: string | null;
    returnConditionNotes: string | null;
    }

    type DataMode = 'equipment' | 'requests';
    type TimeRange = 'week' | 'month' | 'year';

    interface ApiError {
    status: number;
    message: string;
    details?: any;
    }

    const AdminReports = () => {
    const { loading: authLoading } = useAdminGuard();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [dataMode, setDataMode] = useState<DataMode>('equipment');
    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    
    // Data states
    const [users, setUsers] = useState<User[]>([]);
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ApiError | null>(null);
    
    // Chart data states
    const [userChartData, setUserChartData] = useState<{ date: string; count: number }[]>([]);
    const [equipmentChartData, setEquipmentChartData] = useState<{ name: string; count: number; color?: string }[]>([]);
    const [requestsChartData, setRequestsChartData] = useState<{ name: string; count: number; color?: string }[]>([]);

    // Status color mapping
    const statusColors: Record<string, string> = {
        'Available': '#4caf50',
        'Reserved': '#ffc107',
        'CheckedOut': '#1976d2',
        'UnderRepair': '#9c27b0',
        'Retired': '#9e9e9e',
        'Unavailable': '#f44336',
        'Pending': '#ff9800',
        'Approved': '#4caf50',
        'Denied': '#f44336',
        'Rejected': '#f44336',
        'Returned': '#9c27b0'
    };

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/users', {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
            throw { status: response.status, message: response.statusText };
            }
            
            const data = await response.json();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            setError({
            status: err.status || 500,
            message: err.message || 'Failed to fetch users',
            details: err
            });
        }
        };
        fetchUsers();
    }, []);

    // Fetch equipment
    useEffect(() => {
        const fetchEquipment = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/equipment', {
            credentials: 'include'
            });
            
            if (!response.ok) {
            throw { status: response.status, message: response.statusText };
            }
            
            const data = await response.json();
            setEquipment(data);
            
            // Process equipment by status
            const statusCount: Record<string, number> = {};
            data.forEach((item: Equipment) => {
            const status = item.status;
            statusCount[status] = (statusCount[status] || 0) + 1;
            });
            
            const chartData = Object.entries(statusCount).map(([name, count]) => ({
            name,
            count,
            color: statusColors[name] || '#999'
            }));
            setEquipmentChartData(chartData);
            setError(null);
        } catch (err: any) {
            setError({
            status: err.status || 500,
            message: err.message || 'Failed to fetch equipment',
            details: err
            });
        }
        };
        fetchEquipment();
    }, []);

    // Fetch requests
    useEffect(() => {
        const fetchRequests = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/requests/all', {
            credentials: 'include'
            });
            
            if (!response.ok) {
            throw { status: response.status, message: response.statusText };
            }
            
            const data = await response.json();
            const requestsArray = Array.isArray(data) ? data : Object.values(data);
            setRequests(requestsArray);
            
            // Process requests by status
            const statusCount: Record<string, number> = {};
            requestsArray.forEach((req: Request) => {
            const status = req.status;
            statusCount[status] = (statusCount[status] || 0) + 1;
            });
            
            const chartData = Object.entries(statusCount).map(([name, count]) => ({
            name,
            count,
            color: statusColors[name] || '#999'
            }));
            setRequestsChartData(chartData);
            setError(null);
        } catch (err: any) {
            setError({
            status: err.status || 500,
            message: err.message || 'Failed to fetch requests',
            details: err
            });
        }
        };
        fetchRequests();
    }, []);

    // Process user registration data
    useEffect(() => {
        if (users.length === 0) return;

        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }

        const filteredUsers = users.filter(user => {
        const createdAt = new Date(user.createdAtUtc);
        return createdAt >= startDate;
        });

        const groupedByDate: Record<string, number> = {};

        filteredUsers.forEach(user => {
        const date = new Date(user.createdAtUtc);
        let key: string;

        if (timeRange === 'year') {
            key = date.toLocaleString('default', { month: 'short' });
        } else {
            key = date.toLocaleString('default', { month: 'short', day: 'numeric' });
        }

        groupedByDate[key] = (groupedByDate[key] || 0) + 1;
        });

        const chartDataArray = Object.entries(groupedByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });

        setUserChartData(chartDataArray);
    }, [users, timeRange]);

    const renderError = () => {
        if (!error) return null;
        
        return (
        <Alert severity="error" className={styles.errorAlert}>
            <strong>Error {error.status}</strong>: {error.message}
            <Accordion className={styles.errorDetails}>
            <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
                <span>Technical Details</span>
            </AccordionSummary>
            <AccordionDetails>
                <pre className={styles.errorStack}>
                {JSON.stringify(error.details, null, 2)}
                </pre>
            </AccordionDetails>
            </Accordion>
        </Alert>
        );
    };

    if (authLoading) {
        return (
        <>
            <Topbar onMenuClick={() => setSidebarOpen(true)} />
            <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className={styles.loadingContainer}>Verifying access...</div>
        </>
        );
    }

  return (
    <>
      <Topbar onMenuClick={() => setSidebarOpen(true)} />
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.container} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        <div className={styles.header}>
          <h1>Reports & Charts</h1>
          <p className={styles.subheader}>Analytics and insights</p>
        </div>

        {renderError()}

        {/* Mode Selector */}
        <div className={styles.controls}>
          <ButtonGroup variant="outlined" className={styles.modeGroup}>
            <Button
              variant={dataMode === 'equipment' ? 'contained' : 'outlined'}
              onClick={() => setDataMode('equipment')}
            >
              Equipment
            </Button>
            <Button
              variant={dataMode === 'requests' ? 'contained' : 'outlined'}
              onClick={() => setDataMode('requests')}
            >
              Requests
            </Button>
          </ButtonGroup>
        </div>

        {/* Equipment Mode - Side by Side Layout */}
        {dataMode === 'equipment' && (
          <>
            <div className={styles.doubleChartRow}>
              {/* Equipment Pie Chart */}
              <div className={styles.halfChartCard}>
                <h3>Equipment by Status</h3>
                {equipmentChartData.length === 0 ? (
                  <div className={styles.noDataSmall}>
                    <Icon className={styles.noDataIcon}>inventory</Icon>
                    <p>No data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={equipmentChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {equipmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#999'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Equipment Summary Stats */}
              <div className={styles.halfChartCard}>
                <h3>Equipment Summary</h3>
                <div className={styles.statsList}>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>inventory</Icon>
                    <span className={styles.statsListLabel}>Total Items:</span>
                    <span className={styles.statsListValue}>{equipment.length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>check_circle</Icon>
                    <span className={styles.statsListLabel}>Available:</span>
                    <span className={styles.statsListValue}>{equipment.filter(e => e.status === 'Available').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>sync_alt</Icon>
                    <span className={styles.statsListLabel}>Checked Out:</span>
                    <span className={styles.statsListValue}>{equipment.filter(e => e.status === 'CheckedOut').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>build</Icon>
                    <span className={styles.statsListLabel}>Under Repair:</span>
                    <span className={styles.statsListValue}>{equipment.filter(e => e.status === 'UnderRepair').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>delete_forever</Icon>
                    <span className={styles.statsListLabel}>Retired:</span>
                    <span className={styles.statsListValue}>{equipment.filter(e => e.status === 'Retired').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Requests Mode - Side by Side Layout */}
        {dataMode === 'requests' && (
          <>
            <div className={styles.doubleChartRow}>
              {/* Requests Pie Chart */}
              <div className={styles.halfChartCard}>
                <h3>Requests by Status</h3>
                {requestsChartData.length === 0 ? (
                  <div className={styles.noDataSmall}>
                    <Icon className={styles.noDataIcon}>request_page</Icon>
                    <p>No data available</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={requestsChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {requestsChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#999'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Requests Summary Stats */}
              <div className={styles.halfChartCard}>
                <h3>Requests Summary</h3>
                <div className={styles.statsList}>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>assignment</Icon>
                    <span className={styles.statsListLabel}>Total Requests:</span>
                    <span className={styles.statsListValue}>{requests.length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>hourglass_empty</Icon>
                    <span className={styles.statsListLabel}>Pending:</span>
                    <span className={styles.statsListValue}>{requests.filter(r => r.status === 'Pending').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>check_circle</Icon>
                    <span className={styles.statsListLabel}>Approved:</span>
                    <span className={styles.statsListValue}>{requests.filter(r => r.status === 'Approved').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>cancel</Icon>
                    <span className={styles.statsListLabel}>Rejected:</span>
                    <span className={styles.statsListValue}>{requests.filter(r => r.status === 'Rejected' || r.status === 'Denied').length}</span>
                  </div>
                  <div className={styles.statsListItem}>
                    <Icon className={styles.statsListIcon}>assignment_return</Icon>
                    <span className={styles.statsListLabel}>Returned:</span>
                    <span className={styles.statsListValue}>{requests.filter(r => r.status === 'Returned').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* User Registration Chart (Full width) */}
        <div className={styles.chartCard}>
          <h3>User Registrations by {timeRange === 'year' ? 'Month' : 'Day'}</h3>
          
          {/* Time Range Selector */}
          <div className={styles.timeRangeControls}>
            <ButtonGroup size="small" variant="outlined">
              <Button
                variant={timeRange === 'week' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('week')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === 'month' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('month')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === 'year' ? 'contained' : 'outlined'}
                onClick={() => setTimeRange('year')}
              >
                12 Months
              </Button>
            </ButtonGroup>
          </div>

          {userChartData.length === 0 ? (
            <div className={styles.noData}>
              <Icon className={styles.noDataIcon}>people</Icon>
              <p>No user registrations in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={userChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="New Users" fill="#415b80" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Summary Stats */}
        <div className={styles.summaryStats}>
          <div className={styles.statCard}>
            <Icon className={styles.statIcon}>people</Icon>
            <div>
              <h4>Total Users</h4>
              <p>{users.length}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <Icon className={styles.statIcon}>person_add</Icon>
            <div>
              <h4>New Users ({timeRange === 'week' ? '7d' : timeRange === 'month' ? '30d' : '12m'})</h4>
              <p>{userChartData.reduce((sum, item) => sum + item.count, 0)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminReports;