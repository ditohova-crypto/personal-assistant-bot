import { Routes, Route } from 'react-router'
import Dashboard from './pages/Dashboard'
import Chat from './pages/Chat'
import SettingsPage from './pages/SettingsPage'
import Login from "./pages/Login"
import NotFound from "./pages/NotFound"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
