import { useState } from 'react'

//libraries
import { Toaster } from 'react-hot-toast'
import { Route,Routes } from 'react-router-dom'


//general pages
import ProtectedRoute from './components/ProtectedRoutes'
import Login from './pages/Login'
import Signup from './pages/Signup'

//owner
import OwnerLayout from './pages/Owner/OwnerLayout'
import OwnerDashboard from './pages/Owner/OwnerDashboard'
import Products from './pages/Owner/Products'

//dm
import DeliveryDashboard from './pages/Dm/DeliveryDashboard'

//customer
import CustomerDashboard from './pages/Customer/CustomerDashboard'
import Unauthorized from './pages/Unauthorized'
import LoadingPage from './pages/LoadingPage'
import DeliveryStaff from './pages/Owner/DeliveryStaff'
import Deliveries from './pages/Owner/Deliveries'
import Customers from './pages/Owner/Customers'
import AssignDM from './pages/Owner/AssignDM'
import DMDetails from './pages/Owner/DeliveryStaff/DMDetails'
import CustomerSubscriptions from './pages/Customer/CustomerSubscriptions'
import CustomerQRPage from './pages/Customer/CustomerQRPage'
import DMScanDeliver from './pages/Dm/DmScanDeliver'
import DeliveryHistory from './pages/Dm/DeliveryHistory'
import CustomerList from './pages/Dm/CustomerList'


function App() {

  return (
    <>
      <Toaster position="top-right"/>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup/>} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/loading" element={<LoadingPage />} />


        <Route
          path="/owner"
          element={
            // <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerLayout />
            // </ProtectedRoute>
          }
        >
            <Route index element={<OwnerDashboard />} />
            <Route path="products" element={<Products />} />
            <Route path="delivery-staff" element={<DeliveryStaff />} />
            <Route path="delivery-staff/:dmId" element={<DMDetails />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:customerId/assign-dm" element={<AssignDM />} />
        </Route>



        <Route
          path="/dm"
          element={
            // <ProtectedRoute allowedRoles={["dm"]}>
              <DeliveryDashboard />
            // </ProtectedRoute>
          }
        />

        <Route
          path="/dm/scan"
          element={
            // <ProtectedRoute allowedRoles={["dm"]}>
              <DMScanDeliver/>
            // </ProtectedRoute>
          }
        />

        <Route
          path="/dm/history"
          element={
            // <ProtectedRoute allowedRoles={["dm"]}>
              <DeliveryHistory/>
            // </ProtectedRoute>
          }
        />

        <Route
          path="/dm/customers"
          element={
            // <ProtectedRoute allowedRoles={["dm"]}>
              <CustomerList/>
            // </ProtectedRoute>
          }
        />







        <Route
          path="/customer"
          element={
            // <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            // </ProtectedRoute>
          }
        >
        </Route>


        <Route
          path="/customer/products"
          element={
              <CustomerSubscriptions />
          }
        >
        </Route>

        <Route
          path="/customer/qrcode"
          element={
              <CustomerQRPage />
          }
        >
        </Route>

        
      </Routes>
    </>
  )
}

export default App
