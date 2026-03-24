    // pages/Admin/AdminReports.tsx
    import { useState, useEffect } from 'react';
    import Icon from '@mui/material/Icon';
    import Button from '@mui/material/Button';
    import ButtonGroup from '@mui/material/ButtonGroup';
    import Accordion from '@mui/material/Accordion';
    import PageLayout from '../../components/PageLayout/PageLayout';
    import AccordionSummary from '@mui/material/AccordionSummary';
    import AccordionDetails from '@mui/material/AccordionDetails';
    import Alert from '@mui/material/Alert';
    import styles from './AdminReports.module.css';
    import { useAdminGuard } from '../../hooks/useAdminGuard';
    import html2canvas from 'html2canvas';
    import Papa from 'papaparse';
  import jsPDF from 'jspdf';
  import 'jspdf-autotable';
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

    interface ExportData {
  [key: string]: string | number;
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


// Add export functions inside the component
const exportToCSV = (data: ExportData[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToPDF = async (elementId: string, title: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let yPos = 20;
  
  // Add title
  doc.setFontSize(18);
  doc.text(title, 14, yPos);
  yPos += 15;
  
  // Add timestamp
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
  yPos += 15;
  
  // Use html2canvas to capture the chart
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff'
  });
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 180;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  if (yPos + imgHeight > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};

// Add this state for export loading
const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

// Prepare data for export
const prepareEquipmentExportData = () => {
  return equipment.map(item => ({
    'Item Name': item.name,
    'Type': item.type,
    'Serial Number': item.serialNumber,
    'Status': item.status,
    'Location': item.location,
    'Condition': item.condition,
    'Requires Approval': item.requiresAdminApproval ? 'Yes' : 'No'
  }));
};

const prepareRequestsExportData = () => {
  return requests.map(req => ({
    'User': req.userFullName,
    'Equipment': req.equipmentName,
    'Serial Number': req.equipmentSerialNumber,
    'Status': req.status,
    'Requested Date': new Date(req.requestedAtUtc).toLocaleDateString(),
    'From': new Date(req.requestedFromUtc).toLocaleDateString(),
    'To': new Date(req.requestedToUtc).toLocaleDateString(),
    'Reviewed': req.reviewedAtUtc ? new Date(req.reviewedAtUtc).toLocaleDateString() : 'Pending',
    'Checked Out': req.checkedOutAtUtc ? new Date(req.checkedOutAtUtc).toLocaleDateString() : '-',
    'Returned': req.returnedAtUtc ? new Date(req.returnedAtUtc).toLocaleDateString() : '-',
    'Admin Comment': req.adminComment || '-',
    'Return Notes': req.returnConditionNotes || '-'
  }));
};



const exportUsersCSV = () => {
  // Transform chart data for CSV
  const data = userChartData.map(item => ({
    'Date': item.date,
    'New Users': item.count
  }));
  
  // Add summary row
  data.push({
    'Date': `TOTAL (${timeRange === 'week' ? '7 days' : timeRange === 'month' ? '30 days' : '12 months'})`,
    'New Users': userChartData.reduce((sum, item) => sum + item.count, 0)
  });
  
  exportToCSV(data, `user_registrations_${timeRange}_${new Date().toISOString().split('T')[0]}`);
};


// Export Users Section PDF (chart + stats)
const exportUsersPDF = async () => {
  const element = document.getElementById('user-registration-chart');
  if (!element) {
    alert('User registration section not found');
    return;
  }
  
  try {
    const doc = new jsPDF();
    let yPos = 20;
    
    // Title
    doc.setFontSize(18);
    doc.text('User Registration Report', 14, yPos);
    yPos += 15;
    
    // Timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, yPos);
    yPos += 15;
    
    // Period info
    doc.setFontSize(12);
    let periodText = '';
    switch (timeRange) {
      case 'week': periodText = 'Last 7 Days'; break;
      case 'month': periodText = 'Last 30 Days'; break;
      case 'year': periodText = 'Last 12 Months'; break;
    }
    doc.text(`Period: ${periodText}`, 14, yPos);
    yPos += 10;
    
    // Total users
    doc.text(`Total Users: ${users.length}`, 14, yPos);
    yPos += 7;
    doc.text(`New Users in Period: ${userChartData.reduce((sum, item) => sum + item.count, 0)}`, 14, yPos);
    yPos += 20;
    
    // Capture the chart
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff'
    });
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 180;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    if (yPos + imgHeight > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.addImage(imgData, 'PNG', 15, yPos, imgWidth, imgHeight);
    doc.save(`user_registration_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to generate PDF');
  }
};

const getExportLabel = () => {
  if (exporting === 'csv') return 'Exporting...';
  return `Export ${dataMode === 'equipment' ? 'Equipment' : 'Requests'} CSV`;
};

const getPDFLabel = () => {
  if (exporting === 'pdf') return 'Preparing...';
  return `Export ${dataMode === 'equipment' ? 'Equipment' : 'Requests'} PDF`;
};

  return (
    <>
    <PageLayout type='admin'>

      <div className={styles.container} style={{ 
        marginLeft: sidebarOpen ? '240px' : '0',
        transition: 'margin-left 0.3s ease'
      }}>
        <div className={styles.header}>
          <h1>Reports & Charts</h1>
          <p className={styles.subheader}>Analytics and insights</p>
        </div>

        <div className={styles.exportButtons}>
   

</div>
        
        {renderError()}

        {/* Mode Selector */}
        <div className={styles.controls}>
  <div className={styles.controlsLeft}>
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
  
  <div className={styles.controlsRight}>
    <Button
      variant="outlined"
      startIcon={<Icon>download</Icon>}
      onClick={() => {
        setExporting('csv');
        const data = dataMode === 'equipment' 
          ? prepareEquipmentExportData() 
          : prepareRequestsExportData();
        exportToCSV(data, `${dataMode}_report_${new Date().toISOString().split('T')[0]}`);
        setExporting(null);
      }}
      disabled={exporting !== null}
    >
      {getExportLabel()}
    </Button>

    <Button
      variant="outlined"
      startIcon={<Icon>print</Icon>}
      onClick={() => {
        setExporting('pdf');
        const elementId = dataMode === 'equipment' ? 'equipment-chart' : 'requests-chart';
        const title = dataMode === 'equipment' ? 'Equipment Report' : 'Requests Report';
        exportToPDF(elementId, title);
        setExporting(null);
      }}
      disabled={exporting !== null}
    >
      {getPDFLabel()}
    </Button>
  </div>
</div>  

       
       {/* Equipment Mode - Side by Side Layout */}
{dataMode === 'equipment' && (
  <div id="equipment-chart" className={styles.doubleChartRow}>
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
)}

{/* Requests Mode - Side by Side Layout */}
{dataMode === 'requests' && (
  <div id="requests-chart" className={styles.doubleChartRow}>
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
)}

        {/* User Registration Section with Export */}
<div id="user-registration-chart" className={styles.userSection}>
  {/* User Registration Section with Export */}
<div id="user-registration-chart" className={styles.userSection}>
  <div className={styles.userSectionHeader}>
    <div className={styles.leftSection}>
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
    </div>
    
    <h3>User Registrations by {timeRange === 'year' ? 'Month' : 'Day'}</h3>
    
    <div className={styles.rightSection}>
      <div className={styles.userExportButtons}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon>download</Icon>}
          onClick={() => exportUsersCSV()}
        >
          {timeRange === 'week' && 'Last 7 Days CSV'}
          {timeRange === 'month' && 'Last 30 Days CSV'}
          {timeRange === 'year' && 'Last 12 Months CSV'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon>print</Icon>}
          onClick={() => exportUsersPDF()}
        >
          Export as PDF 
        </Button>
      </div>
    </div>
  </div>
</div>

  {/* Chart */}
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
        
      </div>
    </PageLayout>
    </>
  );
};

export default AdminReports;