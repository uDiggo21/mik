import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

import {
  Package,
  Trophy,
  Search,
  Layers3
} from 'lucide-react'

const cores = [
  '#16a34a',
  '#2563eb',
  '#dc2626'
]

export default function CurvaABC() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarProdutos()
  }, [])

  async function buscarProdutos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('produtos')
      .select('*')

    if (error) {
      console.error(error)
    }

    setProdutos(data || [])
    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const produtosOrdenados = useMemo(() => {
    return produtos
      .map((produto) => {
        const valorEstoque =
          Number(produto.preco_custo || 0) *
          Number(produto.estoque_atual || 0)

        return {
          ...produto,
          valorEstoque
        }
      })
      .sort((a, b) => b.valorEstoque - a.valorEstoque)
  }, [produtos])

  const produtosFiltrados = produtosOrdenados.filter((produto) => {
    const texto = busca.toLowerCase()

    return (
      produto.nome?.toLowerCase().includes(texto) ||
      produto.codigo?.toLowerCase().includes(texto)
    )
  })

  const totalGeral = produtosOrdenados.reduce((acc, produto) => {
    return acc + Number(produto.valorEstoque || 0)
  }, 0)

  const produtosABC = useMemo(() => {
    let acumulado = 0

    return produtosFiltrados.map((produto) => {
      const percentual =
        totalGeral > 0
          ? (produto.valorEstoque / totalGeral) * 100
          : 0

      acumulado += percentual

      let curva = 'C'

      if (acumulado <= 80) {
        curva = 'A'
      } else if (acumulado <= 95) {
        curva = 'B'
      }

      return {
        ...produto,
        percentual,
        acumulado,
        curva
      }
    })
  }, [produtosFiltrados, totalGeral])

  const resumoCurva = useMemo(() => {
    let a = 0
    let b = 0
    let c = 0

    produtosABC.forEach((produto) => {
      if (produto.curva === 'A') a++
      if (produto.curva === 'B') b++
      if (produto.curva === 'C') c++
    })

    return [
      { name: 'Curva A', value: a },
      { name: 'Curva B', value: b },
      { name: 'Curva C', value: c }
    ]
  }, [produtosABC])

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          Curva ABC
        </h1>

        <p className="text-sm text-gray-500">
          Produtos mais importantes do estoque
        </p>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Produtos A
            </div>

            <div className="bg-green-100 text-green-600 p-2 rounded-xl">
              <Trophy size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-green-600">
            {resumoCurva[0]?.value || 0}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Produtos B
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Layers3 size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {resumoCurva[1]?.value || 0}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Produtos C
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <Package size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {resumoCurva[2]?.value || 0}
          </div>

        </div>

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="col-span-1 bg-white rounded-2xl border border-gray-200 p-5">

          <h2 className="font-semibold text-gray-800 mb-4">
            Distribuição
          </h2>

          <div className="h-[280px]">

            <ResponsiveContainer width="100%" height="100%">

              <PieChart>

                <Pie
                  data={resumoCurva}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  {resumoCurva.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={cores[index % cores.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />

              </PieChart>

            </ResponsiveContainer>

          </div>

        </div>

        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">

            <div>

              <h2 className="font-semibold text-gray-800">
                Classificação ABC
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                Produtos classificados por importância financeira
              </p>

            </div>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">

              <Search size={16} className="text-gray-400" />

              <input
                type="text"
                placeholder="Buscar produto..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="outline-none text-sm"
              />

            </div>

          </div>

          <table className="w-full text-sm">

            <thead className="bg-gray-50 border-b border-gray-200">

              <tr>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Produto
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Código
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Estoque
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Valor Estoque
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  %
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                  Curva
                </th>

              </tr>

            </thead>

            <tbody>

              {carregando ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-400"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : produtosABC.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-10 text-gray-400"
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                produtosABC.map((produto) => (
                  <tr
                    key={produto.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >

                    <td className="px-4 py-3">

                      <div className="font-medium text-gray-800">
                        {produto.nome}
                      </div>

                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {produto.codigo || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {produto.estoque_atual}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-700">
                      {formatarMoeda(produto.valorEstoque)}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {produto.percentual.toFixed(2)}%
                    </td>

                    <td className="px-4 py-3">

                      <span
                        className={`
                          px-2
                          py-1
                          rounded-full
                          text-xs
                          font-medium

                          ${
                            produto.curva === 'A'
                              ? 'bg-green-100 text-green-700'
                              : produto.curva === 'B'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                          }
                        `}
                      >
                        Curva {produto.curva}
                      </span>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  )
}