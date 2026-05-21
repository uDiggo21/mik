import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, LogIn } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()

    if (!email || !senha) {
      alert('Informe e-mail e senha.')
      return
    }

    setCarregando(true)

    const resultado = await login(email, senha)

    setCarregando(false)

    if (!resultado.sucesso) {
      alert(resultado.mensagem)
      return
    }

    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">

        <div className="mb-6 text-center">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <LogIn size={26} className="text-white" />
          </div>

          <h1 className="text-2xl font-semibold text-gray-800">
            Mik Distribuidora
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Acesso ao ERP
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-4">

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              E-mail
            </label>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Mail size={16} className="text-gray-400" />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-700"
                placeholder="usuario@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Senha
            </label>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Lock size={16} className="text-gray-400" />

              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="flex-1 outline-none text-sm text-gray-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition"
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>

        </form>

        <div className="mt-5 text-xs text-gray-400 text-center">
          Use um usuário cadastrado na aba Usuários.
        </div>

      </div>
    </div>
  )
}