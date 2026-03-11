import styles from "./LoginPage.module.css";
import { Button } from "@mui/material";
import {TextField} from '@mui/material';
import {Link} from '@mui/material';

const LoginPage = () => {
  return (
    <>
      <div className={styles.topBar}>
        <p>SCHOOL INVENTORY MANAGEMENT SYSTEM</p>
      </div>
      <div className={styles.loginCard}>
        <h1>WELCOME BACK!</h1>
        <p>PLEASE SIGN INTO YOUR ACCOUNT!</p>
            <TextField
          className= {styles.TextInput}
          id="outlined-email-input"
          label="Email adress"
          type="email"
        />
        
        <TextField
          className= {styles.TextInput}
          id="outlined-password-input"
          label="Password"
          type="password"
        />
        <Link href="#" className={styles.customLink} id="forgot-password-link" >Forgot password?</Link>
        <Button variant="contained" className={styles.customButton} size="large">Log in</Button>
                <Link href="#" className={styles.customLink} id="forgot-password-link" >Register here</Link>
        <div className={styles.customLinkDiv}>
        </div>
      </div> 
    </>
  )
}

export default LoginPage