import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Budget from './pages/Budget'
import Recurring from './pages/Recurring'
import Goals from './pages/Goals'
import Investments from './pages/Investments'
import Settings from './pages/Settings'
import Categories from './pages/Categories'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="reports" element={<Reports />} />
          <Route path="budget" element={<Budget />} />
          <Route path="recurring" element={<Recurring />} />
          <Route path="goals" element={<Goals />} />
          <Route path="investments" element={<Investments />} />
          <Route path="categories" element={<Categories />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
