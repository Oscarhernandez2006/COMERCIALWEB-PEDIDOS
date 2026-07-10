import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequireCompany } from '@/components/RequireCompany';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { WorkspaceSelectPage } from '@/pages/WorkspaceSelectPage';
import { CompanySelectPage } from '@/pages/CompanySelectPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { NewQuotePage } from '@/pages/NewQuotePage';
import { QuotesPage } from '@/pages/QuotesPage';
import { StockPage } from '@/pages/StockPage';
import { CustomersPage } from '@/pages/CustomersPage';
import { ProductsPage } from '@/pages/ProductsPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AdminOrdersPage } from '@/pages/AdminOrdersPage';
import { DownloadOrdersPage } from '@/pages/DownloadOrdersPage';
import { PriceListsPage } from '@/pages/PriceListsPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { UsersPage } from '@/pages/UsersPage';
import { OrderSchedulePage } from '@/pages/OrderSchedulePage';
import { CarteraPage } from '@/pages/CarteraPage';
import { BudgetsPage } from '@/pages/BudgetsPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/seleccionar"
        element={
          <ProtectedRoute role="admin">
            <WorkspaceSelectPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seleccionar-compania"
        element={
          <ProtectedRoute>
            <CompanySelectPage />
          </ProtectedRoute>
        }
      />

      {/* Área de administración (solo admin) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="pedidos" element={<AdminOrdersPage />} />
        <Route path="reportes" element={<ReportsPage />} />
        <Route path="descargar-pedidos" element={<DownloadOrdersPage />} />
        <Route path="listas-precios" element={<PriceListsPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="presupuestos" element={<BudgetsPage />} />
        <Route path="cartera" element={<CarteraPage />} />
        <Route path="horario-pedidos" element={<OrderSchedulePage />} />
        <Route path="usuarios" element={<UsersPage />} />
      </Route>

      {/* Área de aprobación de cartera (solo rol cartera) */}
      <Route
        path="/cartera"
        element={
          <ProtectedRoute role="cartera">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<CarteraPage />} />
      </Route>

      {/* Área de vendedor / toma de pedidos (requiere compañía) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RequireCompany>
              <AppLayout />
            </RequireCompany>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pedidos/nuevo" element={<NewOrderPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="cotizaciones/nueva" element={<NewQuotePage />} />
        <Route path="cotizaciones" element={<QuotesPage />} />
        <Route path="disponibilidad" element={<StockPage />} />
        <Route path="clientes" element={<CustomersPage />} />
        <Route path="productos" element={<ProductsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
