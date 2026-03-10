import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../../pages/LandPage/LandPage';
// import OtherPage from '../pages/OtherPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  // {
  //   path: '/about',
  //   element: <AboutPage />,
  // },
]);