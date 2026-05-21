import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search } from 'lucide-react'

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [fornecedorEditando, setFornecedorEditando] = useState(null)

  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    contato: '',
    endereco: '',
    observacao: '',
    ativo: true
  })

  useEffect(() => {
    buscarFornecedores()
  }, [])

  async function buscarFornecedores() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('nome')

    if (error) console.error(error)

    setFornecedores(data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      nome: '',
      cnpj: '',
      telefone: '',
      email: '',
      contato: '',
      endereco: '',
      observacao: '',
      ativo: true
    })
  }

  function abrirNovoFornecedor() {
    setFornecedorEditando(null)
    limparForm()
    setModalAberto(true)
  }

  function abrirEditarFornecedor(f) {
    setFornecedorEditando(f)

    setForm({
      nome: f.nome || '',
      cnpj: f.cnpj || '',
      telefone: f.telefone || '',
      email: f.email || '',
      contato: f.contato || '',
      endereco: f.endereco || '',
      observacao: f.observacao || '',
      ativo: f.ativo ?? true
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setFornecedorEditando(null)
    limparForm()
  }

  async function salvarFornecedor() {
    if (!form.nome) {
      alert('Nome do fornecedor é obrigatório.')
      return
    }

    let error

    if (fornecedorEditando) {
      const resposta = await supabase
        .from('fornecedores')
        .update(form)
        .eq('id', fornecedorEditando.id)

      error = resposta.error
    } else {
      const resposta = await supabase
        .from('fornecedores')
        .insert([form])

      error = resposta.error
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    fecharModal()
    buscarFornecedores()
  }

  async function alternarStatusFornecedor(f) {
    const novoStatus = !f.ativo

    if (!novoStatus) {
      const confirmar = confirm(
        `Deseja inativar o fornecedor "${f.nome}"? Ele não será apagado do histórico.`
      )

      if (!confirmar) return
    }

    const { error } = await supabase
      .from('fornecedores')
      .update({ ativo: novoStatus })
      .eq('id', f.id)

    if (error) {
      alert('Erro ao alterar status: ' + error.message)
      return
    }

    buscarFornecedores()
  }

  const fornecedoresFiltrados = fornecedores.filter((f) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(f.nome || '').toLowerCase().includes(textoBusca) ||
      String(f.cnpj || '').toLowerCase().includes(textoBusca) ||
      String(f.telefone || '').toLowerCase().includes(textoBusca) ||
      String(f.email || '').toLowerCase().includes(textoBusca) ||
      String(f.contato || '').toLowerCase().includes(textoBusca)
    )
  })

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Fornecedores
          </h1>

          <p className="text-sm text-gray-500">
            {fornecedores.length} fornecedores cadastrados
          </p>
        </div>

        <button
          onClick={abrirNovoFornecedor}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Novo Fornecedor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total de fornecedores
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {fornecedores.length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Fornecedores ativos
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {fornecedores.filter((f) => f.ativo).length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Inativos
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {fornecedores.filter((f) => !f.ativo).length}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">
        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por nome, CNPJ, telefone ou contato..."
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
                Fornecedor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                CNPJ
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Telefone
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Contato
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
            ) : fornecedoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            ) : (
              fornecedoresFiltrados.map((f) => (
                <tr
                  key={f.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    !f.ativo ? 'opacity-60' : ''
                  }`}
                >

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">
                      {f.nome}
                    </div>

                    {f.email && (
                      <div className="text-xs text-gray-400">
                        {f.email}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {f.cnpj || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {f.telefone || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {f.contato || '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        f.ativo
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {f.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => abrirEditarFornecedor(f)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => alternarStatusFornecedor(f)}
                        className={`text-xs font-medium ${
                          f.ativo
                            ? 'text-red-600 hover:text-red-800'
                            : 'text-green-600 hover:text-green-800'
                        }`}
                      >
                        {f.ativo ? 'Inativar' : 'Ativar'}
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
              {fornecedorEditando ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Nome / Razão social *
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Distribuidora Central"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  CNPJ
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
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
                  placeholder="(65) 99999-9999"
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
                  placeholder="email@fornecedor.com"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Pessoa de contato
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.contato}
                  onChange={(e) => setForm({ ...form, contato: e.target.value })}
                  placeholder="Ex: Carlos"
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
                  placeholder="Rua, número, bairro, cidade"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Observação
                </label>

                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  rows="3"
                  value={form.observacao}
                  onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Condições de compra, prazo de entrega, observações..."
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />

                <span className="text-sm text-gray-600">
                  Fornecedor ativo
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
                onClick={salvarFornecedor}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                {fornecedorEditando ? 'Salvar Alterações' : 'Salvar Fornecedor'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}