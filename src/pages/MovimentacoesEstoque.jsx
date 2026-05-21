import { useEffect, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  PackageSearch,
  RefreshCcw
} from 'lucide-react'

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
      return <ArrowUpCircle size={16} />
    }

    if (tipo === 'saida') {
      return <ArrowDownCircle size={16} />
    }

    return <RotateCcw size={16} />
  }

  function corTipo(tipo) {
    if (tipo === 'entrada') return 'bg-green-100 text-green-700'
    if (tipo === 'saida') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  function labelTipo(tipo) {
    if (tipo === 'entrada') return 'Entrada'
    if (tipo === 'saida') return 'Saída'
    if (tipo === 'ajuste') return 'Ajuste'
    return tipo || '—'
  }

  const movimentacoesFiltradas = movimentacoes.filter((mov) => {
    const texto = String(busca || '').toLowerCase()

    return (
      String(mov.produtos?.nome || '').toLowerCase().includes(texto) ||
      String(mov.produtos?.codigo || '').toLowerCase().includes(texto) ||
      String(mov.tipo || '').toLowerCase().includes(texto) ||
      String(mov.referencia || '').toLowerCase().includes(texto) ||
      String(mov.observacao || '').toLowerCase().includes(texto)
    )
  })

  const totalEntradas = movimentacoesFiltradas
    .filter((mov) => mov.tipo === 'entrada')
    .reduce((acc, mov) => acc + Number(mov.quantidade || 0), 0)

  const totalSaidas = movimentacoesFiltradas
    .filter((mov) => mov.tipo === 'saida')
    .reduce((acc, mov) => acc + Number(mov.quantidade || 0), 0)

  const totalAjustes = movimentacoesFiltradas
    .filter((mov) => mov.tipo === 'ajuste')
    .length

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <PackageSearch size={22} />
            Movimentações de Estoque
          </h1>

          <p className="text-sm text-gray-500">
            Kardex operacional dos produtos
          </p>

        </div>

        <button
          onClick={carregarMovimentacoes}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <p className="text-sm text-gray-500">
            Entradas filtradas
          </p>

          <h2 className="text-2xl font-bold text-green-600 mt-1">
            {totalEntradas}
          </h2>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <p className="text-sm text-gray-500">
            Saídas filtradas
          </p>

          <h2 className="text-2xl font-bold text-red-600 mt-1">
            {totalSaidas}
          </h2>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <p className="text-sm text-gray-500">
            Ajustes filtrados
          </p>

          <h2 className="text-2xl font-bold text-blue-600 mt-1">
            {totalAjustes}
          </h2>

        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

          <Search size={16} className="text-gray-400" />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por produto, código, tipo, referência..."
            className="flex-1 text-sm outline-none text-gray-700"
          />

        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

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

                <td
                  colSpan={9}
                  className="text-center py-8 text-gray-400"
                >
                  Carregando...
                </td>

              </tr>
            ) : movimentacoesFiltradas.length === 0 ? (
              <tr>

                <td
                  colSpan={9}
                  className="text-center py-8 text-gray-400"
                >
                  Nenhuma movimentação encontrada.
                </td>

              </tr>
            ) : (
              movimentacoesFiltradas.map((mov) => (
                <tr
                  key={mov.id}
                  className="border-b border-gray-100"
                >

                  <td className="px-4 py-3">

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${corTipo(
                        mov.tipo
                      )}`}
                    >
                      {iconeTipo(mov.tipo)}
                      {labelTipo(mov.tipo)}
                    </span>

                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {mov.produtos?.nome || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.produtos?.codigo || '—'}
                  </td>

                  <td className="px-4 py-3">
                    {Number(mov.quantidade || 0)} {mov.produtos?.unidade || ''}
                  </td>

                  <td className="px-4 py-3">
                    {Number(mov.estoque_anterior || 0)}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {Number(mov.estoque_atual || 0)}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.referencia || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600 max-w-[260px]">
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
