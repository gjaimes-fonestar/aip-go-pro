import { createHashRouter, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Devices from '../pages/Devices'
import Dashboard from '../pages/Dashboard'
import NotFound from '../pages/NotFound'
import Placeholder from '../pages/Placeholder'
import Channels from '../pages/Channels'
import Webserver from '../pages/Webserver'

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true,             element: <Navigate to="/devices" replace /> },
      { path: 'devices',         element: <Devices /> },
      { path: 'dashboard',       element: <Dashboard /> },
      { path: 'channels',        element: <Channels /> },
      { path: 'webserver',       element: <Webserver /> },
      { path: 'groups',          element: <Placeholder title="Groups" /> },
      { path: 'areas',           element: <Placeholder title="Areas" /> },
      { path: 'action-control',  element: <Placeholder title="Action Control" /> },
      { path: 'voice',           element: <Placeholder title="Voice" /> },
      { path: 'messages',        element: <Placeholder title="Messages" /> },
      { path: 'multicast',       element: <Navigate to="/devices" replace /> },
      { path: 'sonometers',      element: <Placeholder title="Sonometers" /> },
      { path: 'events',          element: <Placeholder title="Events" /> },
      { path: 'scenes',          element: <Placeholder title="Scenes" /> },
      { path: 'transfers',       element: <Placeholder title="Transfers" /> },
      { path: 'sip-devices',     element: <Placeholder title="SIP Devices" /> },
      { path: 'log',             element: <Placeholder title="Log" /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
