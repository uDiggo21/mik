import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { FileText, Plus, Search } from 'lucide-react'

export default function Nfe() {
  const [notas, setNotas] = useState([])
  const [vendas, setVendas] = useState([])
  const [clientes, setClientes] = useState([])

  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  const [modalAberto, setModalAberto] = useState(false)

  const [form, setForm] = useState({
    numero: '',
    serie: '001',
    cliente_id: '',
    venda_id: '',
    valor_total: '',
    status: 'pendente'
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [notasRes, vendasRes, clientesRes] = await Promise.all([
      supabase
        .from('notas_fiscais')
        .select(`
          *,
          clientes (
            nome
          ),
          vendas (
            total
          )
        `)
        .order('criado_em', { ascending: false }),

      supabase
        .from('vendas')
        .select('*')
        .order('criado_em', { ascending: false }),

      supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ])

    setNotas(notasRes.data || [])
    setVendas(vendasRes.data || [])
    setClientes(clientesRes.data || [])

    setCarregando(false)
  }

  function abrirModal() {
    setForm({
      numero: '',
      serie: '001',
      cliente_id: '',
      venda_id: '',
      valor_total: '',
      status: 'pendente'
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
  }

  async function salvarNota() {
    if (!form.numero || !form.valor_total) {
      alert('Número e valor total são obrigatórios.')
      return
    }

    const { error } = await supabase
      .from('notas_fiscais')
      .insert([
        {
          ...form,
          valor_total: Number(form.valor_total || 0)
        }
      ])

    if (error) {
      alert('Erro ao salvar nota: ' + error.message)
      return
    }

    fecharModal()
    carregarDados()
  }

  async function alterarStatus(id, status) {
    const { error } = await supabase
      .from('notas_fiscais')
      .update({ status })
      .eq('id', id)

    if (error) {
      alert('Erro ao alterar status.')
      return
    }

    carregarDados()
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarData(data) {
    if (!data) return '—'

    return new Date(data).toLocaleDateString('pt-BR')
  }

  const notasFiltradas = notas.filter((n) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(n.numero || '').toLowerCase().includes(textoBusca) ||
      String(n.status || '').toLowerCase().includes(textoBusca) ||
      String(n.clientes?.nome || '').toLowerCase().includes(textoBusca)
    )
  })

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Nota Fiscal
          </h1>

          <p className="text-sm text-gray-500">
            Gestão de documentos fiscais internos
          </p>
        </div>

        <button
          onClick={abrirModal}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
        >
          <Plus size={16} />
          Nova Nota
        </button>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Total de notas
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {notas.length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Emitidas
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {notas.filter((n) => n.status === 'emitida').length}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Pendentes
          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {notas.filter((n) => n.status === 'pendente').length}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">
        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por número, cliente ou status..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Número
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Série
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Cliente
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Valor
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Status
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Data
              </th>

              <th className="text-left px-4 py-3 text-xs text-gray-500">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>

            {carregando ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : notasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  Nenhuma nota encontrada.
                </td>
              </tr>
            ) : (
              notasFiltradas.map((nota) => (
                <tr key={nota.id} className="border-b border-gray-100 hover:bg-gray-50">

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {nota.numero}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {nota.serie}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {nota.clientes?.nome || '—'}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {formatarMoeda(nota.valor_total)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        nota.status === 'emitida'
                          ? 'bg-green-100 text-green-700'
                          : nota.status === 'cancelada'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {nota.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {formatarData(nota.criado_em)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">

                      <button
                        onClick={() => alterarStatus(nota.id, 'emitida')}
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                      >
                        Emitir
                      </button>

                      <button
                        onClick={() => alterarStatus(nota.id, 'cancelada')}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Cancelar
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

            <div className="flex items-center gap-2 mb-5">
              <FileText size={20} className="text-green-600" />

              <h2 className="text-lg font-semibold text-gray-800">
                Nova Nota Fiscal
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Número *
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.numero}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      numero: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Série
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.serie}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      serie: e.target.value
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Cliente
                </label>

                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.cliente_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cliente_id: e.target.value
                    })
                  }
                >
                  <option value="">Selecionar cliente</option>

                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Venda vinculada
                </label>

                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.venda_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      venda_id: e.target.value
                    })
                  }
                >
                  <option value="">Selecionar venda</option>

                  {vendas.map((venda) => (
                    <option key={venda.id} value={venda.id}>
                      Venda - {formatarMoeda(venda.total)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Valor total *
                </label>

                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.valor_total}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valor_total: e.target.value
                    })
                  }
                />
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
                onClick={salvarNota}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                Salvar Nota
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}