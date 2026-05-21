import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  BadgeDollarSign
} from 'lucide-react'

export default function Dre() {
  const [financeiro, setFinanceiro] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('financeiro')
      .select('*')

    if (error) {
      console.error(error)
    }

    setFinanceiro(data || [])
    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const resumo = useMemo(() => {
    let receitas = 0
    let despesas = 0

    financeiro.forEach((mov) => {
      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') {
        receitas += valor
      }

      if (mov.tipo === 'saida') {
        despesas += valor
      }
    })

    const lucroBruto = receitas - despesas

    const margem =
      receitas > 0
        ? ((lucroBruto / receitas) * 100)
        : 0

    return {
      receitas,
      despesas,
      lucroBruto,
      margem
    }
  }, [financeiro])

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          DRE Simplificado
        </h1>

        <p className="text-sm text-gray-500">
          Demonstrativo de resultados da empresa
        </p>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Receita Bruta
            </div>

            <div className="bg-green-100 text-green-600 p-2 rounded-xl">
              <TrendingUp size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(resumo.receitas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Despesas
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <TrendingDown size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(resumo.despesas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Lucro Bruto
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Wallet size={18} />
            </div>

          </div>

          <div
            className={`
              text-2xl
              font-semibold

              ${
                resumo.lucroBruto >= 0
                  ? 'text-blue-600'
                  : 'text-red-600'
              }
            `}
          >
            {formatarMoeda(resumo.lucroBruto)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Margem
            </div>

            <div className="bg-yellow-100 text-yellow-600 p-2 rounded-xl">
              <Percent size={18} />
            </div>

          </div>

          <div
            className={`
              text-2xl
              font-semibold

              ${
                resumo.margem >= 0
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }
            `}
          >
            {resumo.margem.toFixed(2)}%
          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

          <BadgeDollarSign
            size={18}
            className="text-gray-500"
          />

          <h2 className="font-semibold text-gray-800">
            Resumo Financeiro
          </h2>

        </div>

        {carregando ? (
          <div className="p-10 text-center text-gray-400">
            Carregando...
          </div>
        ) : (
          <div className="p-6">

            <div className="space-y-4">

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">

                <div className="text-gray-600">
                  Receita operacional
                </div>

                <div className="font-semibold text-green-600">
                  {formatarMoeda(resumo.receitas)}
                </div>

              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3">

                <div className="text-gray-600">
                  Custos e despesas
                </div>

                <div className="font-semibold text-red-600">
                  - {formatarMoeda(resumo.despesas)}
                </div>

              </div>

              <div className="flex items-center justify-between pt-2">

                <div className="text-lg font-semibold text-gray-800">
                  Resultado final
                </div>

                <div
                  className={`
                    text-xl
                    font-bold

                    ${
                      resumo.lucroBruto >= 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                    }
                  `}
                >
                  {formatarMoeda(resumo.lucroBruto)}
                </div>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  )
}