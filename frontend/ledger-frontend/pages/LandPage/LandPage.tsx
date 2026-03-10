import styles from './LandPage.module.css'; 
import Button from '../../components/Button/Button'


const HomePage = () => {
  return (
    <>
    <div>
      <h2 className={styles.centered}>Добре дошли!</h2>
    </div>
    <h2>Няколко бутона</h2>
    <Button type="danger" disabled>Delete</Button> 
    <Button type="confirm">Save</Button>             
    <Button>Click me</Button>              
    <Button type="warning">Careful</Button>
    </>
  )
}

export default HomePage