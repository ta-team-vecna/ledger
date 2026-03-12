import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LandPage/LoginPage';
import Dashboard from '../../pages/Dashboard/Dashboard'
// import OtherPage from '../pages/OtherPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage/>,
  },
  {
    path:"/dashboard",
    element:<Dashboard/>
  }
  // {
  //   path: '/about',
  //   element: <AboutPage />,
  // },
]);