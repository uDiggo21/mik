import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Search, ArrowUpCircle, ArrowDownCircle, RotateCcw } from 'lucide-react'

export default function MovimentacoesEstoque() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarMovimentacoes()
  }, [])

  async function carregarMovimentacoes() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        *,
        produtos (
          nome,
          codigo,
          unidade
        )
      `)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error(error)
      alert('Erro ao carregar movimentações.')
    }

    setMovimentacoes(data || [])
    setCarregando(false)
  }

  function formatarData(data) {
    if (!data) return '—'

    return new Date(data).toLocaleString('pt-BR')
  }

  function iconeTipo(tipo) {
    if (tipo === 'entrada') {
      return <ArrowUpCircle size={18} className="text-green-600" />
    }

    if (tipo === 'saida') {
      return <ArrowDownCircle size={18} className="text-red-600" />
    }

    return <RotateCcw size={18} className="text-blue-600" />
  }

  function corTipo(tipo) {
    if (tipo === 'entrada') return 'bg-green-100 text-green-700'
    if (tipo === 'saida') return 'bg-red-100 text-red-700'

    return 'bg-blue-100 text-blue-700'
  }

  const movimentacoesFiltradas = movimentacoes.filter((mov) => {
    const texto = busca.toLowerCase()

    return (
      mov.produtos?.nome?.toLowerCase().includes(texto) ||
      mov.produtos?.codigo?.toLowerCase().includes(texto) ||
      mov.tipo?.toLowerCase().includes(texto) ||
      mov.referencia?.toLowerCase().includes(texto) ||
      mov.observacao?.toLowerCase().includes(texto)
    )
  })

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800">
            Movimentações de Estoque
          </h1>

          <p className="text-sm text-gray-500">
            Kardex operacional dos produtos
          </p>

        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">

        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por produto, código, tipo ou referência..."
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
                Tipo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Produto
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Código
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Quantidade
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque anterior
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque atual
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Referência
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Observação
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>

            </tr>

          </thead>

          <tbody>

            {carregando ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : movimentacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              movimentacoesFiltradas.map((mov) => (
                <tr
                  key={mov.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >

                  <td className="px-4 py-3">

                    <div className="flex items-center gap-2">

                      {iconeTipo(mov.tipo)}

                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${corTipo(mov.tipo)}`}>
                        {mov.tipo}
                      </span>

                    </div>

                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {mov.produtos?.nome || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {mov.produtos?.codigo || '—'}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {Number(mov.quantidade || 0)} {mov.produtos?.unidade || ''}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {Number(mov.estoque_anterior || 0)}
                  </td>

                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {Number(mov.estoque_atual || 0)}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {mov.referencia || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {mov.observacao || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {formatarData(mov.criado_em)}
                  </td>

                </tr>
              ))
            )}

          </tbody>

        </table>

      </div>

    </div>
  )
}