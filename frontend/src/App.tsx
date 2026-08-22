import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import ProductsPage from './pages/ProductsPage';
import ChallansPage from './pages/ChallansPage';
import CreateChallanPage from './pages/CreateChallanPage';
import ChallanDetailPage from './pages/ChallanDetailPage';
import OperationsPage from './pages/OperationsPage';
import UsersPage from './pages/UsersPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operations"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'OPERATIONS', 'SALES']}>
                <OperationsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UsersPage /></ProtectedRoute>} />

          <Route
            path="/customers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <CustomersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <CustomerDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'OPERATIONS']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'OPERATIONS']}>
                <ChallansPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/new"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <CreateChallanPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/challans/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'OPERATIONS']}>
                <ChallanDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
