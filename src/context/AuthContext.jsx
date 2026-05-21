import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

const STORAGE_KEY = 'erp_usuario'

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    verificarSessao()
  }, [])

  async function verificarSessao() {
    try {
      const usuarioSalvo = localStorage.getItem(STORAGE_KEY)

      if (!usuarioSalvo) {
        setUsuario(null)
        return
      }

      const usuarioParseado = JSON.parse(usuarioSalvo)

      if (!usuarioParseado?.id) {
        localStorage.removeItem(STORAGE_KEY)
        setUsuario(null)
        return
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, cargo, ativo, criado_em')
        .eq('id', usuarioParseado.id)
        .eq('ativo', true)
        .maybeSingle()

      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY)
        setUsuario(null)
        return
      }

      setUsuario(data)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error(error)
      localStorage.removeItem(STORAGE_KEY)
      setUsuario(null)
    } finally {
      setCarregando(false)
    }
  }

  async function login(email, senha) {
    const emailTratado = String(email || '').trim().toLowerCase()

    if (!emailTratado || !senha) {
      return {
        sucesso: false,
        mensagem: 'Informe e-mail e senha.'
      }
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, cargo, ativo, criado_em')
      .eq('email', emailTratado)
      .eq('senha', senha)
      .eq('ativo', true)
      .maybeSingle()

    if (error || !data) {
      return {
        sucesso: false,
        mensagem: 'Usuário ou senha inválidos.'
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setUsuario(data)

    return {
      sucesso: true,
      usuario: data
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY)
    setUsuario(null)
  }

  function temPermissao(permissoes = []) {
    if (!usuario) return false

    if (!permissoes.length) return true

    return permissoes.includes(usuario.cargo)
  }

  const value = useMemo(() => {
    return {
      usuario,
      carregando,
      login,
      logout,
      verificarSessao,
      temPermissao,
      autenticado: Boolean(usuario)
    }
  }, [usuario, carregando])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const contexto = useContext(AuthContext)

  if (!contexto) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return contexto
}
