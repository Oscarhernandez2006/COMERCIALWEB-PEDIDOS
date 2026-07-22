import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RequireCompany } from '@/components/RequireCompany';
import { AppLayout } from '@/components/AppLayout';
import { OperationalHome } from '@/components/OperationalHome';
import { LoginPage } from '@/pages/LoginPage';
import { CompanySelectPage } from '@/pages/CompanySelectPage';
import { NewOrderPage } from '@/pages/NewOrderPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { NewCanalOrderPage } from '@/pages/NewCanalOrderPage';
import { CanalOrdersPage } from '@/pages/CanalOrdersPage';
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

      {/* Compatibilidad: el antiguo apartado operativo/administrativo se eliminó;
          se redirige a la selección de compañía (visual unificada). */}
      <Route path="/seleccionar" element={<Navigate to="/seleccionar-compania" replace />} />

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
        <Route index element={<OperationalHome />} />
        <Route path="pedidos/nuevo" element={<NewOrderPage />} />
        <Route path="pedidos" element={<OrdersPage />} />
        <Route path="pedidos/canales" element={<CanalOrdersPage />} />
        <Route path="pedidos/canales/nuevo" element={<NewCanalOrderPage />} />
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
