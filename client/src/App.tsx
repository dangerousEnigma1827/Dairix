import { useState } from 'react'
import Login from './pages/Login'
import Register from './pages/Signup'
import OwnerDashboard from './pages/Owner/OwnerDashboard'
import CustomerDashboard from './pages/Owner/CustomerDashboard'
import DeliveryDashboard from './pages/Owner/DeliveryDashboard'
import { Route,Routes } from 'react-router-dom'

function App() {

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/delivery" element={<DeliveryDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
      </Routes>
    </>
  )
}

export default App
