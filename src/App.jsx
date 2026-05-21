import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Caixa from './pages/Caixa'
import Produtos from './pages/Produtos'
import MovimentacoesEstoque from './pages/MovimentacoesEstoque'
import EstoqueMinimo from './pages/EstoqueMinimo'
import CurvaABC from './pages/CurvaABC'
import Compras from './pages/Compras'
import ImportacaoNfe from './pages/ImportacaoNfe'
import Vendas from './pages/Vendas'
import Clientes from './pages/Clientes'
import Fornecedores from './pages/Fornecedores'
import Fiado from './pages/Fiado'
import Financeiro from './pages/Financeiro'
import FluxoCaixa from './pages/FluxoCaixa'
import ContasPagar from './pages/ContasPagar'
import ContasReceber from './pages/ContasReceber'
import Dre from './pages/Dre'
import Relatorios from './pages/Relatorios'
import Auditoria from './pages/Auditoria'
import Usuarios from './pages/Usuarios'
import Nfe from './pages/Nfe'
import Configuracoes from './pages/Configuracoes'
import Notificacoes from './pages/Notificacoes'

const permissoes = {
  todos: ['admin', 'gerente', 'operador', 'estoquista', 'financeiro'],
  caixa: ['admin', 'gerente', 'financeiro', 'operador'],
  estoque: ['admin', 'gerente', 'operador', 'estoquista'],
  estoqueRestrito: ['admin', 'gerente', 'estoquista'],
  compras: ['admin', 'gerente', 'estoquista'],
  vendas: ['admin', 'gerente', 'operador', 'financeiro'],
  clientes: ['admin', 'gerente', 'operador', 'financeiro'],
  fornecedores: ['admin', 'gerente', 'estoquista'],
  financeiro: ['admin', 'gerente', 'financeiro'],
  auditoria: ['admin', 'gerente'],
  admin: ['admin']
}

function RotaPrivada({ children, permissoes: permissoesDaRota }) {
  return (
    <ProtectedRoute permissoes={permissoesDaRota}>
      <Layout>
        {children}
      </Layout>
    </ProtectedRoute>
  )
}

function LoginRedirect() {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-500">
        Carregando...
      </div>
    )
  }

  if (usuario) {
    return <Navigate to="/" replace />
  }

  return <Login />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRedirect />} />

      <Route
        path="/"
        element={
          <RotaPrivada permissoes={permissoes.todos}>
            <Dashboard />
          </RotaPrivada>
        }
      />

      <Route
        path="/notificacoes"
        element={
          <RotaPrivada permissoes={['admin', 'gerente', 'financeiro', 'estoquista']}>
            <Notificacoes />
          </RotaPrivada>
        }
      />

      <Route
        path="/caixa"
        element={
          <RotaPrivada permissoes={permissoes.caixa}>
            <Caixa />
          </RotaPrivada>
        }
      />

      <Route
        path="/produtos"
        element={
          <RotaPrivada permissoes={permissoes.estoque}>
            <Produtos />
          </RotaPrivada>
        }
      />

      <Route
        path="/movimentacoes-estoque"
        element={
          <RotaPrivada permissoes={permissoes.estoqueRestrito}>
            <MovimentacoesEstoque />
          </RotaPrivada>
        }
      />

      <Route
        path="/estoque-minimo"
        element={
          <RotaPrivada permissoes={permissoes.estoqueRestrito}>
            <EstoqueMinimo />
          </RotaPrivada>
        }
      />

      <Route
        path="/curva-abc"
        element={
          <RotaPrivada permissoes={permissoes.estoqueRestrito}>
            <CurvaABC />
          </RotaPrivada>
        }
      />

      <Route
        path="/compras"
        element={
          <RotaPrivada permissoes={permissoes.compras}>
            <Compras />
          </RotaPrivada>
        }
      />

      <Route
        path="/importar-nfe"
        element={
          <RotaPrivada permissoes={['admin', 'gerente', 'estoquista', 'financeiro']}>
            <ImportacaoNfe />
          </RotaPrivada>
        }
      />

      <Route
        path="/vendas"
        element={
          <RotaPrivada permissoes={permissoes.vendas}>
            <Vendas />
          </RotaPrivada>
        }
      />

      <Route
        path="/clientes"
        element={
          <RotaPrivada permissoes={permissoes.clientes}>
            <Clientes />
          </RotaPrivada>
        }
      />

      <Route
        path="/fornecedores"
        element={
          <RotaPrivada permissoes={permissoes.fornecedores}>
            <Fornecedores />
          </RotaPrivada>
        }
      />

      <Route
        path="/fiado"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <Fiado />
          </RotaPrivada>
        }
      />

      <Route
        path="/financeiro"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <Financeiro />
          </RotaPrivada>
        }
      />

      <Route
        path="/fluxo-caixa"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <FluxoCaixa />
          </RotaPrivada>
        }
      />

      <Route
        path="/contas-pagar"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <ContasPagar />
          </RotaPrivada>
        }
      />

      <Route
        path="/contas-receber"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <ContasReceber />
          </RotaPrivada>
        }
      />

      <Route
        path="/dre"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <Dre />
          </RotaPrivada>
        }
      />

      <Route
        path="/relatorios"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <Relatorios />
          </RotaPrivada>
        }
      />

      <Route
        path="/auditoria"
        element={
          <RotaPrivada permissoes={permissoes.auditoria}>
            <Auditoria />
          </RotaPrivada>
        }
      />

      <Route
        path="/usuarios"
        element={
          <RotaPrivada permissoes={permissoes.admin}>
            <Usuarios />
          </RotaPrivada>
        }
      />

      <Route
        path="/nfe"
        element={
          <RotaPrivada permissoes={permissoes.financeiro}>
            <Nfe />
          </RotaPrivada>
        }
      />

      <Route
        path="/configuracoes"
        element={
          <RotaPrivada permissoes={permissoes.admin}>
            <Configuracoes />
          </RotaPrivada>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
