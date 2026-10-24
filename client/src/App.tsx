//libraries
import { Toaster } from 'react-hot-toast'
import { Route, Routes, Navigate } from 'react-router-dom'
import { Loader2, Milk } from 'lucide-react'

//hooks
import { useUser } from './hooks/useUser'

//general pages
import ProtectedRoute from './components/ProtectedRoutes'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Unauthorized from './pages/Unauthorized'
import LoadingPage from './pages/LoadingPage'

//owner
import OwnerLayout from './pages/Owner/OwnerLayout'
import OwnerDashboard from './pages/Owner/OwnerDashboard'
import Products from './pages/Owner/Products'
import DeliveryStaff from './pages/Owner/DeliveryStaff'
import Deliveries from './pages/Owner/Deliveries'
import Customers from './pages/Owner/Customers'
import AssignDM from './pages/Owner/AssignDM'
import DmDetails from './pages/Owner/DMDetails'

//dm
import DeliveryDashboard from './pages/Dm/DeliveryDashboard'
import DMScanDeliver from './pages/Dm/DmScanDeliver'
import DeliveryHistory from './pages/Dm/DeliveryHistory'
import CustomerList from './pages/Dm/CustomerList'
import DmCollections from './pages/Dm/DmCollections'

//customer
import CustomerDashboard from './pages/Customer/CustomerDashboard'
import CustomerSubscriptions from './pages/Customer/CustomerSubscriptions'
import CustomerQRPage from './pages/Customer/CustomerQRPage'
import DeliveryTracker from './pages/Customer/DeliveryTracker'
import CustomerBilling from './pages/Customer/CustomerBilling'

function RootRedirect() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-md shadow-blue-200">
          <Milk size={28} className="text-white" />
        </div>
        <Loader2 size={24} className="text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading Dairix…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "owner") return <Navigate to="/owner" replace />;
  if (user.role === "dm") return <Navigate to="/dm" replace />;
  return <Navigate to="/customer" replace />;
}

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public auth & status routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/loading" element={<LoadingPage />} />

        {/* Owner protected routes */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OwnerDashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="delivery-staff" element={<DeliveryStaff />} />
          <Route path="delivery-staff/:dmId" element={<DmDetails />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:customerId/assign-dm" element={<AssignDM />} />
        </Route>

        {/* Delivery Staff (DM) protected routes */}
        <Route
          path="/dm"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm/scan"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <DMScanDeliver />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm/history"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <DeliveryHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm/customers"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <CustomerList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dm/collections"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <DmCollections />
            </ProtectedRoute>
          }
        />

        {/* Customer protected routes */}
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/products"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerSubscriptions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/qrcode"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerQRPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/deliveries"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <DeliveryTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/billing"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerBilling />
            </ProtectedRoute>
          }
        />

        {/* 404 / Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
