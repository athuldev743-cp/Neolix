import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}