import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search, Trash2 } from 'lucide-react'
import { registrarAuditoria } from '../utils/auditoria'

export default function Financeiro() {
  const [movimentos, setMovimentos] = useState([])
  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [movimentoEditando, setMovimentoEditando] = useState(null)

  const [form, setForm] = useState({
    tipo: 'entrada',
    descricao: '',
    valor: '',
    categoria: '',
    data: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    buscarMovimentos()
  }, [])

  async function buscarMovimentos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .order('data', { ascending: false })

    if (error) console.error(error)

    setMovimentos(data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      tipo: 'entrada',
      descricao: '',
      valor: '',
      categoria: '',
      data: new Date().toISOString().split('T')[0]
    })
  }

  function abrirNovoMovimento() {
    setMovimentoEditando(null)
    limparForm()
    setModalAberto(true)
  }

  function abrirEditarMovimento(m) {
    setMovimentoEditando(m)

    setForm({
      tipo: m.tipo || 'entrada',
      descricao: m.descricao || '',
      valor: m.valor || '',
      categoria: m.categoria || '',
      data: m.data || new Date().toISOString().split('T')[0]
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setMovimentoEditando(null)
    limparForm()
  }

  async function salvarMovimento() {
    if (!form.descricao || !form.valor) {
      alert('Descrição e valor são obrigatórios.')
      return
    }

    const dados = {
      ...form,
      valor: Number(form.valor || 0)
    }

    if (movimentoEditando) {
      const { error } = await supabase
        .from('financeiro')
        .update(dados)
        .eq('id', movimentoEditando.id)

      if (error) {
        alert('Erro ao salvar: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: 'edição',
        modulo: 'financeiro',
        descricao: `Movimento financeiro editado: ${dados.descricao}`,
        valor: dados.valor,
        referencia_id: movimentoEditando.id
      })
    } else {
      const { data, error } = await supabase
        .from('financeiro')
        .insert([dados])
        .select()
        .single()

      if (error) {
        alert('Erro ao salvar: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: dados.tipo === 'entrada' ? 'entrada' : 'saída',
        modulo: 'financeiro',
        descricao: `Movimento financeiro manual registrado: ${dados.descricao}`,
        valor: dados.valor,
        referencia_id: data.id
      })
    }

    fecharModal()
    buscarMovimentos()
  }

  async function excluirMovimento(m) {
    const confirmar = confirm(`Deseja excluir "${m.descricao}"?`)

    if (!confirmar) return

    const { error } = await supabase
      .from('financeiro')
      .delete()
      .eq('id', m.id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
      return
    }

    await registrarAuditoria({
      tipo: 'cancelamento',
      modulo: 'financeiro',
      descricao: `Movimento financeiro excluído: ${m.descricao}`,
      valor: m.valor,
      referencia_id: m.id
    })

    buscarMovimentos()
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarData(data) {
    if (!data) return '—'

    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  const movimentosFiltrados = movimentos.filter((m) => {
    const textoBusca = String(busca || '').toLowerCase()

    const bateBusca =
      String(m.descricao || '').toLowerCase().includes(textoBusca) ||
      String(m.categoria || '').toLowerCase().includes(textoBusca) ||
      String(m.tipo || '').toLowerCase().includes(textoBusca)

    const bateTipo = tipoFiltro === 'todos' || m.tipo === tipoFiltro

    return bateBusca && bateTipo
  })

  const totalEntradas = movimentos
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)

  const totalSaidas = movimentos
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)

  const saldo = totalEntradas - totalSaidas

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Financeiro
          </h1>

          <p className="text-sm text-gray-500">
            Controle de entradas, saídas e fluxo de caixa
          </p>
        </div>

        <button
          onClick={abrirNovoMovimento}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Novo Movimento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Entradas
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(totalEntradas)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Saídas
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(totalSaidas)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Saldo
          </div>

          <div className={`text-2xl font-semibold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatarMoeda(saldo)}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 mb-4">

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-gray-400" />

          <input
            type="text"
            placeholder="Buscar por descrição ou categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-700"
          />
        </div>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Descrição
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Categoria
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Tipo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Valor
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
            ) : movimentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  Nenhum movimento encontrado.
                </td>
              </tr>
            ) : (
              movimentosFiltrados.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">

                  <td className="px-4 py-3 text-gray-500">
                    {formatarData(m.data)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">
                      {m.descricao}
                    </div>

                    {m.venda_id && (
                      <div className="text-xs text-gray-400">
                        Gerado por venda
                      </div>
                    )}

                    {m.compra_id && (
                      <div className="text-xs text-gray-400">
                        Gerado por compra
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {m.categoria || '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        m.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {m.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>

                  <td
                    className={`px-4 py-3 font-semibold ${
                      m.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {m.tipo === 'entrada' ? '+' : '-'} {formatarMoeda(m.valor)}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">

                      <button
                        onClick={() => abrirEditarMovimento(m)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => excluirMovimento(m)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={15} />
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
              {movimentoEditando ? 'Editar Movimento' : 'Novo Movimento'}
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Tipo *
                </label>

                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Data
                </label>

                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">
                  Descrição *
                </label>

                <input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="Ex: Venda realizada, compra de estoque, aluguel..."
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Categoria
                </label>

                <input
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="Ex: venda, despesa, fornecedor"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Valor *
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="0,00"
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
                onClick={salvarMovimento}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                {movimentoEditando ? 'Salvar Alterações' : 'Salvar Movimento'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}