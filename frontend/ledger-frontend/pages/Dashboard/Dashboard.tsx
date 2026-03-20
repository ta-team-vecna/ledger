import { useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { Button } from "@mui/material";
import Topbar from "../../components/topBar/topBar";
import { apiFetch, API_BASE } from '../../src/utils/apiFetch';
import Icon from "@mui/material/Icon";
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import RequestModal from "../../components/modals/RequestModal"

function generateItems() {
  return [];
}

const Dashboard = () => {
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  useEffect(() => {
    apiFetch(`${API_BASE}/api/equipment`)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: unknown[]) => setTotalItems(data.length))
      .catch(() => setTotalItems(null));
  }, []);

  return (
    <>
      <Topbar></Topbar>
      <p className={styles.mainheading}> MANAGE YOUR SCHOOL'S EQUIPMENT </p>
      <p className={styles.subMainHeading}>
        Track, request and organize all your school supplies{" "}
      </p>
      <div className={styles.mainButtonRow}>
        <Button 
        variant="contained"
        onClick={() => setRequestModalOpen(true)}
      >
        Request equipment
      </Button>
        <Button variant="outlined">View inventory</Button>
      </div>
      <div className={styles.ActionButtonList}>
        <Button
          className={styles.ActionButton}
          variant="outlined"
          style={{ marginLeft: "20px" }}
        >
          <div className={styles.ActionButtonTop}>
            <Icon className={styles.ActionButtonTopIcon}>edit</Icon>
            <h3>REQUEST & TRACK </h3>
          </div>
          <small> REQUEST AND TRACK USAGE OF ITEMS</small>
        </Button>

        <Button className={styles.ActionButton} variant="outlined">
          <div className={styles.ActionButtonTop}>
            <Icon className={styles.ActionButtonTopIcon}>inventory_2</Icon>
            <h3>MANAGE INVENTORY </h3>
          </div>
          <small>ORGANIZE AND VIEW SCHOOL INVENTORY</small>
        </Button>

        <Button
          className={styles.ActionButton}
          variant="outlined"
          style={{ marginRight: "20px" }}
        >
          <div className={styles.ActionButtonTop}>
            <Icon className={styles.ActionButtonTopIcon}>bar_chart</Icon>
            <h3>GENERATE REPORTS </h3>
          </div>
          <small>CREATE DETAILED INVENTORY CHARTS</small>
        </Button>
      </div>

      <div className={styles.InventoryOverview}>
                <h2>INVENTORY OVERVIEW</h2>

        <div className={styles.InventoryOverviewStatList}>
          <div className={styles.InventoryOverviewStatListItem}>
            <Icon className={styles.InventoryOveriewListItemIcon}>
              bar_chart
            </Icon>
            <h3>TOTAL ITEMS:</h3>
            <h3>{totalItems ?? "—"}</h3>
          </div>

          <div className={styles.InventoryOverviewStatListItem}>
            <Icon className={styles.InventoryOveriewListItemIcon}>
              check_box
            </Icon>
            <h3>CHECKED OUT:</h3>
            <h3>0</h3>
          </div>

          <div className={styles.InventoryOverviewStatListItem}>
            <Icon
              className={`${styles.InventoryOveriewListItemIcon} ${styles.flipped}`}
            >
              show_chart
            </Icon>
            <h3>LOW STOCK:</h3>
            <h3>0</h3>
          </div>

          <div
            className={styles.InventoryOverviewStatListItem}
          >
            <Icon className={styles.InventoryOveriewListItemIcon}>pending</Icon>
            <h3>PENDING:</h3>
            <h3>0</h3>
          </div>
        </div>
      </div>

      <div className={styles.InventoryQuickCardsLine}>
        <div className={styles.InventoryQuickCard} >
            <h2>RECENT REQUESTS: </h2>
            <Divider component="p" />
            <List className={styles.InventoryQuickCardsList}>
            {generateItems().length === 0 ? (
              <ListItem className={styles.InventoryQuickCardsListItem}>
                <Icon className={styles.QuickCardListItemIcon}>info</Icon>
                <ListItemText primary="No requests yet." />
              </ListItem>
            ) : (
              generateItems()
            )}
            </List>
                    
            </div>    

        <div className={styles.InventoryQuickCard} >
            <h2>LOW STOCK ITEMS: </h2>
            <Divider component="p" />
            <List className={styles.InventoryQuickCardsList}>
            {generateItems().length === 0 ? (
              <ListItem className={styles.InventoryQuickCardsListItem}>
                <Icon className={styles.QuickCardListItemIcon}>info</Icon>
                <ListItemText primary="No low stock items." />
              </ListItem>
            ) : (
              generateItems()
            )}
            </List>
                    
            </div>    
      </div>
            <RequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onRequestSubmitted={() => {
          console.log('Request submitted, refresh list if needed');
          setRequestModalOpen(false);
        }}
      />
    </>
  );
};

export default Dashboard;
