import { createBrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LandPage/LoginPage';
// import OtherPage from '../pages/OtherPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage/>,
  }
  // {
  //   path: '/about',
  //   element: <AboutPage />,
  // },
]);
