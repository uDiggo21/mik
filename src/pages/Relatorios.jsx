import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  Download,
  CalendarDays,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp
} from 'lucide-react'

export default function Relatorios() {
  const [financeiro, setFinanceiro] = useState([])
  const [vendas, setVendas] = useState([])
  const [produtos, setProdutos] = useState([])
  const [clientes, setClientes] = useState([])

  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const [
      financeiroRes,
      vendasRes,
      produtosRes,
      clientesRes
    ] = await Promise.all([
      supabase.from('financeiro').select('*'),
      supabase.from('vendas').select('*'),
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*')
    ])

    setFinanceiro(financeiroRes.data || [])
    setVendas(vendasRes.data || [])
    setProdutos(produtosRes.data || [])
    setClientes(clientesRes.data || [])

    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const resumo = useMemo(() => {
    let entradas = 0
    let saidas = 0

    financeiro.forEach((mov) => {
      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') entradas += valor
      if (mov.tipo === 'saida') saidas += valor
    })

    return {
      entradas,
      saidas,
      saldo: entradas - saidas
    }
  }, [financeiro])

  function exportarCSV(nome, dados) {
    if (!dados.length) {
      alert('Nenhum dado disponível.')
      return
    }

    const cabecalho = Object.keys(dados[0]).join(';')

    const linhas = dados.map((item) =>
      Object.values(item)
        .map((valor) =>
          `"${String(valor ?? '').replace(/"/g, '""')}"`
        )
        .join(';')
    )

    const csv = [cabecalho, ...linhas].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    })

    const link = document.createElement('a')

    link.href = URL.createObjectURL(blob)

    link.download = `${nome}.csv`

    link.click()
  }

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          Relatórios
        </h1>

        <p className="text-sm text-gray-500">
          Exportação e análise gerencial do ERP
        </p>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Faturamento
            </div>

            <div className="bg-green-100 text-green-600 p-2 rounded-xl">
              <DollarSign size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(resumo.entradas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Despesas
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <TrendingUp size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(resumo.saidas)}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Vendas
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <ShoppingCart size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {vendas.length}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Produtos
            </div>

            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
              <Package size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {produtos.length}
          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

            <CalendarDays
              size={18}
              className="text-gray-500"
            />

            <h2 className="font-semibold text-gray-800">
              Relatórios Financeiros
            </h2>

          </div>

          <div className="p-5 space-y-4">

            <button
              onClick={() =>
                exportarCSV('financeiro', financeiro)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Financeiro
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Entradas, saídas e movimentações
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

            <button
              onClick={() =>
                exportarCSV('vendas', vendas)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Vendas
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Histórico completo do PDV
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

            <button
              onClick={() =>
                exportarCSV('contas_receber', financeiro)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Recebimentos
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Fluxo financeiro de recebimentos
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

            <Users
              size={18}
              className="text-gray-500"
            />

            <h2 className="font-semibold text-gray-800">
              Relatórios Operacionais
            </h2>

          </div>

          <div className="p-5 space-y-4">

            <button
              onClick={() =>
                exportarCSV('produtos', produtos)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Produtos
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Estoque completo do sistema
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

            <button
              onClick={() =>
                exportarCSV('clientes', clientes)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Clientes
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Base de clientes cadastrados
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

            <button
              onClick={() =>
                exportarCSV('estoque_minimo', produtos)
              }
              className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition"
            >

              <div>

                <div className="font-medium text-gray-800">
                  Exportar Estoque
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Produtos e quantidades atuais
                </div>

              </div>

              <Download
                size={18}
                className="text-gray-500"
              />

            </button>

          </div>

        </div>

      </div>

      {carregando && (
        <div className="text-center text-gray-400 mt-10">
          Carregando relatórios...
        </div>
      )}

    </div>
  )
}