import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Truck,
  Clock,
  BarChart2,
  FileText,
  Settings,
  Menu,
  X,
  PackagePlus,
  History,
  ShieldCheck,
  LogOut,
  BarChart3,
  Upload,
  Receipt,
  Wallet,
  LineChart,
  BadgeDollarSign,
  AlertTriangle,
  PieChart,
  Bell,
  Landmark
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

const menuItems = [
  {
    path: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    permissoes: ['admin', 'gerente', 'operador', 'estoquista', 'financeiro']
  },

  {
    path: '/notificacoes',
    icon: Bell,
    label: 'Notificações',
    permissoes: ['admin', 'gerente', 'financeiro', 'estoquista']
  },

  {
    path: '/caixa',
    icon: Landmark,
    label: 'Caixa',
    permissoes: ['admin', 'gerente', 'financeiro', 'operador']
  },

  {
    path: '/produtos',
    icon: Package,
    label: 'Estoque',
    permissoes: ['admin', 'gerente', 'operador', 'estoquista']
  },

  {
    path: '/estoque-minimo',
    icon: AlertTriangle,
    label: 'Estoque Mínimo',
    permissoes: ['admin', 'gerente', 'estoquista']
  },

  {
    path: '/curva-abc',
    icon: PieChart,
    label: 'Curva ABC',
    permissoes: ['admin', 'gerente', 'estoquista']
  },

  {
    path: '/compras',
    icon: PackagePlus,
    label: 'Compras / Entrada',
    permissoes: ['admin', 'gerente', 'estoquista']
  },

  {
    path: '/importar-nfe',
    icon: Upload,
    label: 'Importar NF-e',
    permissoes: ['admin', 'gerente', 'estoquista', 'financeiro']
  },

  {
    path: '/vendas',
    icon: ShoppingCart,
    label: 'Vendas / PDV',
    permissoes: ['admin', 'gerente', 'operador', 'financeiro']
  },

  {
    path: '/clientes',
    icon: Users,
    label: 'Clientes',
    permissoes: ['admin', 'gerente', 'operador', 'financeiro']
  },

  {
    path: '/fornecedores',
    icon: Truck,
    label: 'Fornecedores',
    permissoes: ['admin', 'gerente', 'estoquista']
  },

  {
    path: '/fiado',
    icon: Clock,
    label: 'Fiado',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/financeiro',
    icon: BarChart2,
    label: 'Financeiro',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/fluxo-caixa',
    icon: LineChart,
    label: 'Fluxo de Caixa',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/contas-pagar',
    icon: Receipt,
    label: 'Contas a Pagar',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/contas-receber',
    icon: Wallet,
    label: 'Contas a Receber',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/dre',
    icon: BadgeDollarSign,
    label: 'DRE',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/relatorios',
    icon: BarChart3,
    label: 'Relatórios',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/auditoria',
    icon: History,
    label: 'Histórico',
    permissoes: ['admin', 'gerente']
  },

  {
    path: '/usuarios',
    icon: ShieldCheck,
    label: 'Usuários',
    permissoes: ['admin']
  },

  {
    path: '/nfe',
    icon: FileText,
    label: 'Nota Fiscal',
    permissoes: ['admin', 'gerente', 'financeiro']
  },

  {
    path: '/configuracoes',
    icon: Settings,
    label: 'Configurações',
    permissoes: ['admin']
  }
]

export default function Layout({ children }) {
  const [sidebarAberta, setSidebarAberta] = useState(true)

  const location = useLocation()

  const { usuario, logout } = useAuth()

  const cargoUsuario = usuario?.cargo || 'operador'

  const menuVisivel = menuItems.filter((item) =>
    item.permissoes.includes(cargoUsuario)
  )

  function sair() {
    logout()
    window.location.href = '/login'
  }

  function cargoLabel(cargo) {
    if (cargo === 'admin') return 'Administrador'
    if (cargo === 'gerente') return 'Gerente'
    if (cargo === 'operador') return 'Operador'
    if (cargo === 'estoquista') return 'Estoquista'
    if (cargo === 'financeiro') return 'Financeiro'

    return cargo
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">

      <aside
        className={`
          ${sidebarAberta ? 'w-56' : 'w-16'}
          bg-gray-900
          text-white
          flex
          flex-col
          transition-all
          duration-200
          flex-shrink-0
        `}
      >

        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">

          {sidebarAberta && (
            <div>

              <div className="text-base font-semibold text-white">
                Mik Distribuidora
              </div>

              <div className="text-xs text-gray-400">
                Gestão ERP
              </div>

            </div>
          )}

          <button
            onClick={() => setSidebarAberta(!sidebarAberta)}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            {sidebarAberta ? <X size={18} /> : <Menu size={18} />}
          </button>

        </div>

        <nav className="flex-1 py-4 overflow-y-auto">

          {menuVisivel.map((item) => {
            const Icon = item.icon

            const ativo = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex
                  items-center
                  gap-3
                  px-4
                  py-2.5
                  text-sm
                  transition-colors

                  ${
                    ativo
                      ? 'bg-green-700 text-white border-l-2 border-green-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >

                <Icon
                  size={18}
                  className="flex-shrink-0"
                />

                {sidebarAberta && (
                  <span>{item.label}</span>
                )}

              </Link>
            )
          })}

        </nav>

        {sidebarAberta && (
          <div className="border-t border-gray-800 p-4 space-y-4">

            <div>

              <div className="text-xs text-gray-500">
                Usuário logado
              </div>

              <div className="text-sm font-medium text-white mt-1">
                {usuario?.nome}
              </div>

              <div className="text-xs text-gray-400 mt-1">
                {cargoLabel(usuario?.cargo)}
              </div>

            </div>

            <button
              onClick={sair}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition"
            >

              <LogOut size={16} />

              Sair

            </button>

            <div className="text-xs text-gray-600 text-center">
              ERP v1.0.0
            </div>

          </div>
        )}

      </aside>

      <main className="flex-1 overflow-y-auto">

        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

          <div>

            <h1 className="text-lg font-semibold text-gray-800">
              Sistema ERP
            </h1>

            <div className="text-xs text-gray-500 mt-1">
              Mik Distribuidora
            </div>

          </div>

          <div className="text-sm text-gray-500">
            {new Date().toLocaleString('pt-BR')}
          </div>

        </header>

        <div>
          {children}
        </div>

      </main>

    </div>
  )
}