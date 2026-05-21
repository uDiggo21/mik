import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search } from 'lucide-react'

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState(null)

  const [form, setForm] = useState({
    nome: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    limite_fiado: '',
    ativo: true
  })

  useEffect(() => {
    buscarClientes()
  }, [])

  async function buscarClientes() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome')

    if (error) console.error(error)

    setClientes(data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      nome: '',
      cpf_cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      limite_fiado: '',
      ativo: true
    })
  }

  function abrirNovoCliente() {
    setClienteEditando(null)
    limparForm()
    setModalAberto(true)
  }

  function abrirEditarCliente(c) {
    setClienteEditando(c)

    setForm({
      nome: c.nome || '',
      cpf_cnpj: c.cpf_cnpj || '',
      telefone: c.telefone || '',
      email: c.email || '',
      endereco: c.endereco || '',
      limite_fiado: c.limite_fiado || '',
      ativo: c.ativo ?? true
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setClienteEditando(null)
    limparForm()
  }

  async function salvarCliente() {
    if (!form.nome) {
      alert('Nome é obrigatório.')
      return
    }

    const dadosCliente = {
      ...form,
      limite_fiado: parseFloat(form.limite_fiado) || 0
    }

    let error

    if (clienteEditando) {
      const resposta = await supabase
        .from('clientes')
        .update(dadosCliente)
        .eq('id', clienteEditando.id)

      error = resposta.error
    } else {
      const resposta = await supabase
        .from('clientes')
        .insert([dadosCliente])

      error = resposta.error
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    fecharModal()
    buscarClientes()
  }

  async function alternarStatusCliente(c) {
    const novoStatus = !c.ativo

    if (!novoStatus) {
      const confirmar = confirm(
        `Deseja inativar o cliente "${c.nome}"? Ele não será apagado do histórico.`
      )

      if (!confirmar) return
    }

    const { error } = await supabase
      .from('clientes')
      .update({ ativo: novoStatus })
      .eq('id', c.id)

    if (error) {
      alert('Erro ao alterar status: ' + error.message)
      return
    }

    buscarClientes()
  }

  const clientesFiltrados = clientes.filter((c) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(c.nome || '').toLowerCase().includes(textoBusca) ||
      String(c.cpf_cnpj || '').toLowerCase().includes(textoBusca) ||
      String(c.telefone || '').toLowerCase().includes(textoBusca) ||
      String(c.email || '').toLowerCase().includes(textoBusca)
    )
  })

  function iniciais(nome) {
    return String(nome || '')
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Clientes
          </h1>

          <p className="text-sm text-gray-500">
            {clientes.length} clientes cadastrados
          </p>
        </div>

        <button
          onClick={abrirNovoCliente}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total de clientes
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {clientes.length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Clientes ativos
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {clientes.filter((c) => c.ativo).length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Limite total de fiado
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            R${' '}
            {clientes
              .reduce((acc, c) => acc + Number(c.limite_fiado || 0), 0)
              .toLocaleString('pt-BR')}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">
        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
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
                Cliente
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                CPF / CNPJ
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Telefone
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Limite Fiado
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
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : clientesFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              clientesFiltrados.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">

                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                        {iniciais(c.nome)}
                      </div>

                      <div>
                        <div className="font-medium text-gray-800">
                          {c.nome}
                        </div>

                        {c.email && (
                          <div className="text-xs text-gray-400">
                            {c.email}
                          </div>
                        )}
                      </div>

                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {c.cpf_cnpj || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {c.telefone || '—'}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-700">
                    R$ {Number(c.limite_fiado || 0).toLocaleString('pt-BR')}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => abrirEditarCliente(c)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => alternarStatusCliente(c)}
                        className={`text-xs font-medium ${
                          c.ativo
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {c.ativo ? 'Inativar' : 'Ativar'}
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
              {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Nome completo / Razão social *
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  CPF / CNPJ
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.cpf_cnpj}
                  onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Telefone
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  E-mail
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Limite de fiado
                </label>

                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.limite_fiado}
                  onChange={(e) => setForm({ ...form, limite_fiado: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Endereço
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />

                <span className="text-sm text-gray-600">
                  Cliente ativo
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
                onClick={salvarCliente}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                {clienteEditando ? 'Salvar Alterações' : 'Salvar Cliente'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}