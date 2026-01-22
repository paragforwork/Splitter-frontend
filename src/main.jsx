import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'

import Home from './pages/home.jsx'
import Signup from './pages/signup.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google';
import Dashboard from './pages/dashboard.jsx'
import PrivateRoute from './components/privateRoutes.jsx'
import Group from './pages/group.jsx'

const router = createBrowserRouter([
  {
    path: "/signup",
    element: <Signup />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/dashboard",
        element: <Dashboard />,
      },
      {
        path: "/groups/:id",
        element: <Group />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/signup" replace />
  }
]);
  


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="729693554498-n1vcots54eelcjr21bd3h5irqh1qq8kk.apps.googleusercontent.com">
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>,
)
