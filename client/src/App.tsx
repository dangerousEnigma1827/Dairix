import { useState } from 'react'
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


function App() {

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/loading" element={<LoadingPage />} />


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
        </Route>

        <Route
          path="/dm"
          element={
            <ProtectedRoute allowedRoles={["dm"]}>
              <DeliveryDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App
