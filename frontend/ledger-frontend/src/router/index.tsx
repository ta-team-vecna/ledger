import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../../pages/HomePage';
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