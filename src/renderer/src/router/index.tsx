import { createHashRouter, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import Devices from '../pages/Devices'
import Dashboard from '../pages/Dashboard'
import NotFound from '../pages/NotFound'
import Placeholder from '../pages/Placeholder'
import Channels from '../pages/Channels'
import Webserver from '../pages/Webserver'
import Calendar from '../pages/Calendar'
import Messages from '../pages/Messages'
import Events from '../pages/Events'
import Scenes from '../pages/Scenes'
import Streams from '../pages/Streams'

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
      { path: 'calendar',         element: <Calendar /> },
      { path: 'streams',         element: <Streams /> },
      { path: 'messages',        element: <Messages /> },
      { path: 'multicast',       element: <Navigate to="/devices" replace /> },
      { path: 'sonometers',      element: <Placeholder title="Sonometers" /> },
      { path: 'events',          element: <Events /> },
      { path: 'scenes',          element: <Scenes /> },
      { path: 'transfers',       element: <Placeholder title="Transfers" /> },
      { path: 'sip-devices',     element: <Placeholder title="SIP Devices" /> },
      { path: 'log',             element: <Placeholder title="Log" /> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
