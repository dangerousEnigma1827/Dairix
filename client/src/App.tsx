import { useState } from 'react'
import Login from './pages/Login'
import OwnerDashboard from './pages/Owner/OwnerDashboard'
import CustomerDashboard from './pages/Owner/CustomerDashboard'
import DeliveryDashboard from './pages/Owner/DeliveryDashboard'
import { Route,Routes } from 'react-router-dom'
import Signup from './pages/Signup'
import ProtectedRoute from './components/ProtectedRoutes'


function App() {

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Signup />} />
        <Route
          path="/owner"
          element={
            <ProtectedRoute allowedRoles={["owner"]}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

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
