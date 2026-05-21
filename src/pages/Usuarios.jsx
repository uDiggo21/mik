import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search, UserCog } from 'lucide-react'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState(null)

  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cargo: 'operador',
    ativo: true
  })

  useEffect(() => {
    buscarUsuarios()
  }, [])

  async function buscarUsuarios() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nome')

    if (error) console.error(error)

    setUsuarios(data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      nome: '',
      email: '',
      senha: '',
      cargo: 'operador',
      ativo: true
    })
  }

  function abrirNovoUsuario() {
    setUsuarioEditando(null)
    limparForm()
    setModalAberto(true)
  }

  function abrirEditarUsuario(usuario) {
    setUsuarioEditando(usuario)

    setForm({
      nome: usuario.nome || '',
      email: usuario.email || '',
      senha: usuario.senha || '',
      cargo: usuario.cargo || 'operador',
      ativo: usuario.ativo ?? true
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setUsuarioEditando(null)
    limparForm()
  }

  async function salvarUsuario() {
    if (!form.nome || !form.email || !form.senha) {
      alert('Nome, e-mail e senha são obrigatórios.')
      return
    }

    let error

    if (usuarioEditando) {
      const resposta = await supabase
        .from('usuarios')
        .update(form)
        .eq('id', usuarioEditando.id)

      error = resposta.error
    } else {
      const resposta = await supabase
        .from('usuarios')
        .insert([form])

      error = resposta.error
    }

    if (error) {
      alert('Erro ao salvar usuário: ' + error.message)
      return
    }

    fecharModal()
    buscarUsuarios()
  }

  async function alternarStatusUsuario(usuario) {
    const novoStatus = !usuario.ativo

    const confirmar = confirm(
      `${novoStatus ? 'Ativar' : 'Inativar'} o usuário "${usuario.nome}"?`
    )

    if (!confirmar) return

    const { error } = await supabase
      .from('usuarios')
      .update({ ativo: novoStatus })
      .eq('id', usuario.id)

    if (error) {
      alert('Erro ao alterar status: ' + error.message)
      return
    }

    buscarUsuarios()
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(usuario.nome || '').toLowerCase().includes(textoBusca) ||
      String(usuario.email || '').toLowerCase().includes(textoBusca) ||
      String(usuario.cargo || '').toLowerCase().includes(textoBusca)
    )
  })

  function labelCargo(cargo) {
    if (cargo === 'admin') return 'Administrador'
    if (cargo === 'gerente') return 'Gerente'
    if (cargo === 'operador') return 'Operador'
    if (cargo === 'estoquista') return 'Estoquista'
    if (cargo === 'financeiro') return 'Financeiro'

    return cargo
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Usuários e Permissões
          </h1>

          <p className="text-sm text-gray-500">
            Controle de acessos, cargos e operadores do ERP
          </p>
        </div>

        <button
          onClick={abrirNovoUsuario}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Novo Usuário
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total de usuários
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {usuarios.length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Ativos
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {usuarios.filter((u) => u.ativo).length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Administradores
          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {usuarios.filter((u) => u.cargo === 'admin').length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Inativos
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {usuarios.filter((u) => !u.ativo).length}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">
        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por nome, e-mail ou cargo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Usuário
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                E-mail
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Cargo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Status
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((usuario) => (
                <tr
                  key={usuario.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    !usuario.ativo ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                        <UserCog size={16} />
                      </div>

                      <div className="font-medium text-gray-800">
                        {usuario.nome}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {usuario.email}
                  </td>

                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {labelCargo(usuario.cargo)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        usuario.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => abrirEditarUsuario(usuario)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => alternarStatusUsuario(usuario)}
                        className={`text-xs font-medium ${
                          usuario.ativo
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {usuario.ativo ? 'Inativar' : 'Ativar'}
                      </button>

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">

            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {usuarioEditando ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Nome *
                </label>

                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  E-mail *
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Senha *
                </label>

                <input
                  type="password"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Cargo
                </label>

                <select
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  <option value="admin">Administrador</option>
                  <option value="gerente">Gerente</option>
                  <option value="operador">Operador</option>
                  <option value="estoquista">Estoquista</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />

                <span className="text-sm text-gray-600">
                  Usuário ativo
                </span>
              </div>

            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={fecharModal}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={salvarUsuario}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                {usuarioEditando ? 'Salvar Alterações' : 'Salvar Usuário'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}