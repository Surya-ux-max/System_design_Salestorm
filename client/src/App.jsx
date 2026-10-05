import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './Landing/Landing'
import Admin   from './Admin/Admin'
import User    from './User/User'
import Login   from './Login/Login'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<Landing />} />
        <Route path="/admin" element={<Admin />}   />
        <Route path="/user"  element={<User />}    />
        <Route path="/login" element={<Login />}   />
      </Routes>
    </BrowserRouter>
  )
}
