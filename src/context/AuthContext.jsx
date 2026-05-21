import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    verificarSessao()
  }, [])

  async function verificarSessao() {
    const usuarioSalvo = localStorage.getItem('erp_usuario')

    if (usuarioSalvo) {
      setUsuario(JSON.parse(usuarioSalvo))
    }

    setCarregando(false)
  }

  async function login(email, senha) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('senha', senha)
      .eq('ativo', true)
      .single()

    if (error || !data) {
      return {
        sucesso: false,
        mensagem: 'Usuário ou senha inválidos.'
      }
    }

    localStorage.setItem(
      'erp_usuario',
      JSON.stringify(data)
    )

    setUsuario(data)

    return {
      sucesso: true
    }
  }

  function logout() {
    localStorage.removeItem('erp_usuario')
    setUsuario(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}