import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import './index.css';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Users = lazy(() => import('./pages/Users'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

function PageLoader() {
  return <div className="loading">Loading page...</div>;
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<PrivateRoute><Products /></PrivateRoute>} />
              <Route path="inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />
              <Route path="orders" element={
                <PrivateRoute roles={['ROLE_ADMIN','ROLE_MANAGER']}><Orders /></PrivateRoute>} />
              <Route path="suppliers" element={
                <PrivateRoute roles={['ROLE_ADMIN','ROLE_MANAGER']}><Suppliers /></PrivateRoute>} />
              <Route path="ai" element={
                <PrivateRoute roles={['ROLE_ADMIN','ROLE_MANAGER']}><AIAssistant /></PrivateRoute>} />
              <Route path="reports" element={
                <PrivateRoute roles={['ROLE_ADMIN','ROLE_MANAGER']}><Reports /></PrivateRoute>} />
              <Route path="audit" element={
                <PrivateRoute roles={['ROLE_ADMIN','ROLE_MANAGER']}><AuditLogs /></PrivateRoute>} />
              <Route path="users" element={
                <PrivateRoute roles={['ROLE_ADMIN']}><Users /></PrivateRoute>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
