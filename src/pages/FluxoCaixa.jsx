import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'

export default function FluxoCaixa() {
  const [movimentos, setMovimentos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarMovimentos()
  }, [])

  async function buscarMovimentos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .order('data', { ascending: true })

    if (error) {
      console.error(error)
    }

    setMovimentos(data || [])
    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarData(data) {
    if (!data) return ''

    return new Date(data + 'T00:00:00')
      .toLocaleDateString('pt-BR')
  }

  const resumo = useMemo(() => {
    let entradas = 0
    let saidas = 0

    movimentos.forEach((mov) => {
      if (mov.tipo === 'entrada') {
        entradas += Number(mov.valor || 0)
      }

      if (mov.tipo === 'saida') {
        saidas += Number(mov.valor || 0)
      }
    })

    return {
      entradas,
      saidas,
      saldo: entradas - saidas
    }
  }, [movimentos])

  const grafico = useMemo(() => {
    const agrupado = {}

    movimentos.forEach((mov) => {
      const data = mov.data || new Date().toISOString().slice(0, 10)

      if (!agrupado[data]) {
        agrupado[data] = {
          data,
          entradas: 0,
          saidas: 0,
          saldo: 0
        }
      }

      if (mov.tipo === 'entrada') {
        agrupado[data].entradas += Number(mov.valor || 0)
      }

      if (mov.tipo === 'saida') {
        agrupado[data].saidas += Number(mov.valor || 0)
      }

      agrupado[data].saldo =
        agrupado[data].entradas -
        agrupado[data].saidas
    })

    return Object.values(agrupado)
  }, [movimentos])

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          Fluxo de Caixa
        </h1>

        <p className="text-sm text-gray-500">
          Entradas, saídas e saldo financeiro diário
        </p>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Entradas
            </div>

            <div className="bg-green-100 text-green-600 p-2 rounded-xl">
              <TrendingUp size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(resumo.entradas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Saídas
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <TrendingDown size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(resumo.saidas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Saldo
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Wallet size={18} />
            </div>

          </div>

          <div
            className={`text-2xl font-semibold ${
              resumo.saldo >= 0
                ? 'text-blue-600'
                : 'text-red-600'
            }`}
          >
            {formatarMoeda(resumo.saldo)}
          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">

        <div className="flex items-center gap-2 mb-4">

          <CalendarDays size={18} className="text-gray-500" />

          <h2 className="font-semibold text-gray-800">
            Evolução Financeira
          </h2>

        </div>

        <div className="h-[350px]">

          <ResponsiveContainer width="100%" height="100%">

            <AreaChart data={grafico}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="data"
                tickFormatter={(value) =>
                  formatarData(value)
                }
              />

              <YAxis />

              <Tooltip
                formatter={(value) =>
                  formatarMoeda(value)
                }
                labelFormatter={(label) =>
                  formatarData(label)
                }
              />

              <Area
                type="monotone"
                dataKey="entradas"
                stroke="#16a34a"
                fill="#bbf7d0"
              />

              <Area
                type="monotone"
                dataKey="saidas"
                stroke="#dc2626"
                fill="#fecaca"
              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200">

          <h2 className="font-semibold text-gray-800">
            Movimentações financeiras
          </h2>

        </div>

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Tipo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Descrição
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Categoria
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Valor
              </th>

            </tr>

          </thead>

          <tbody>

            {carregando ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-gray-400"
                >
                  Carregando...
                </td>
              </tr>
            ) : movimentos.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center py-8 text-gray-400"
                >
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              movimentos
                .slice()
                .reverse()
                .map((mov) => (
                  <tr
                    key={mov.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >

                    <td className="px-4 py-3">

                      <div
                        className={`
                          inline-flex
                          items-center
                          gap-1
                          px-2
                          py-1
                          rounded-full
                          text-xs
                          font-medium

                          ${
                            mov.tipo === 'entrada'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        `}
                      >

                        {mov.tipo === 'entrada'
                          ? <ArrowUpRight size={13} />
                          : <ArrowDownRight size={13} />
                        }

                        {mov.tipo}

                      </div>

                    </td>

                    <td className="px-4 py-3 text-gray-700">
                      {mov.descricao}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {mov.categoria || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {formatarData(mov.data)}
                    </td>

                    <td
                      className={`
                        px-4
                        py-3
                        font-semibold

                        ${
                          mov.tipo === 'entrada'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      `}
                    >
                      {formatarMoeda(mov.valor)}
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