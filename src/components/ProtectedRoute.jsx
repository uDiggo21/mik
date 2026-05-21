import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, permissoes = [] }) {
  const { usuario, carregando, temPermissao } = useAuth()
  const location = useLocation()

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
          Carregando permissões...
        </div>
      </div>
    )
  }

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }

  if (!temPermissao(permissoes)) {
    return (
      <div className="p-6">
        <div className="bg-white border border-red-100 rounded-2xl p-6">
          <h1 className="text-xl font-semibold text-red-600">
            Acesso negado
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            Seu cargo não possui permissão para acessar esta página.
          </p>
        </div>
      </div>
    )
  }

  return children
}
