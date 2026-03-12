import styles from "./Dashboard.module.css";
import { Button } from "@mui/material";
import Topbar from "../../components/topBar/topBar";
import Icon from "@mui/material/Icon";
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import ListItemText from '@mui/material/ListItemText';
import { Link } from "react-router-dom";

function generateItems() {
  const items = [];
  for (let i = 0; i < 3; i++) {
    items.push(
      <ListItem className={styles.InventoryQuickCardsListItem} key={`item-${i}`}>
        <Icon className={styles.QuickCardListItemIcon}>pending</Icon>
        <ListItemText primary="Single-line item" />
      </ListItem>
    );
    // Add divider after each item except the last
    if (i < 2) {
      items.push(<Divider key={`divider-${i}`} component="li" />);
    }
    // Then add a link
    if (i == 2){
    items.push(<Link to="#" className={styles.InventoryQuickCardsListItemLink}>View all requests</Link>)
    }
  }
  return items;
}

const Dashboard = () => {
  return (
    <>
      <Topbar></Topbar>
      <p className={styles.mainheading}> MANAGE YOUR SCHOOL'S EQUIPMENT </p>
      <p className={styles.subMainHeading}>
        Track, request and organize all your school supplies{" "}
      </p>
      <div className={styles.mainButtonRow}>
        <Button variant="contained">Request equipment</Button>
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
            <h3>0</h3>
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
            {generateItems()}
            </List>
                    
            </div>    

        <div className={styles.InventoryQuickCard} >
            <h2>LOW STOCK ITEMS: </h2>
            <Divider component="p" />
            <List className={styles.InventoryQuickCardsList}>
            {generateItems()}
            </List>
                    
            </div>    
      </div>
    </>
  );
};

export default Dashboard;
