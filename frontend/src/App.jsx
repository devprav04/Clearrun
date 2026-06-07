import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Instruments from './pages/Instruments';
import InstrumentDetail from './pages/InstrumentDetail';
import Maintenance from './pages/Maintenance';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import Vendors from './pages/Vendors';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/instruments" element={<ProtectedRoute><Layout><Instruments /></Layout></ProtectedRoute>} />
      <Route path="/instruments/:id" element={<ProtectedRoute><Layout><InstrumentDetail /></Layout></ProtectedRoute>} />
      <Route path="/maintenance" element={<ProtectedRoute><Layout><Maintenance /></Layout></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['manager']}><Layout><Reports /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['manager']}><Layout><Settings /></Layout></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute roles={['manager']}><Layout><AuditLog /></Layout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['manager']}><Layout><UserManagement /></Layout></ProtectedRoute>} />
      <Route path="/vendors" element={<ProtectedRoute><Layout><Vendors /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
