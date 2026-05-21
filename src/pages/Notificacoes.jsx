import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  Bell,
  AlertTriangle,
  Clock3,
  Wallet,
  Package,
  BadgeAlert
} from 'lucide-react'

export default function Notificacoes() {
  const [produtos, setProdutos] = useState([])
  const [contasReceber, setContasReceber] = useState([])
  const [contasPagar, setContasPagar] = useState([])

  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const [
      produtosRes,
      contasReceberRes,
      contasPagarRes
    ] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('contas_receber').select('*'),
      supabase.from('contas_pagar').select('*')
    ])

    setProdutos(produtosRes.data || [])
    setContasReceber(contasReceberRes.data || [])
    setContasPagar(contasPagarRes.data || [])

    setCarregando(false)
  }

  function diasAtraso(data) {
    if (!data) return 0

    const hoje = new Date()

    const vencimento = new Date(data + 'T00:00:00')

    const diff =
      hoje.getTime() - vencimento.getTime()

    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const estoqueCritico = useMemo(() => {
    return produtos.filter(
      (produto) =>
        Number(produto.estoque_atual || 0) <=
        Number(produto.estoque_minimo || 0)
    )
  }, [produtos])

  const contasReceberVencidas = useMemo(() => {
    return contasReceber.filter((conta) => {
      if (conta.status === 'recebido') return false

      return diasAtraso(conta.vencimento) > 0
    })
  }, [contasReceber])

  const contasPagarVencidas = useMemo(() => {
    return contasPagar.filter((conta) => {
      if (conta.status === 'pago') return false

      return diasAtraso(conta.vencimento) > 0
    })
  }, [contasPagar])

  const totalAlertas =
    estoqueCritico.length +
    contasReceberVencidas.length +
    contasPagarVencidas.length

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          Central de Notificações
        </h1>

        <p className="text-sm text-gray-500">
          Alertas automáticos do ERP
        </p>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Total Alertas
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <Bell size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {totalAlertas}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Estoque Crítico
            </div>

            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
              <Package size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {estoqueCritico.length}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Recebimentos vencidos
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Wallet size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {contasReceberVencidas.length}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Pagamentos vencidos
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <Clock3 size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {contasPagarVencidas.length}
          </div>

        </div>

      </div>

      <div className="space-y-6">

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

            <AlertTriangle
              size={18}
              className="text-orange-500"
            />

            <h2 className="font-semibold text-gray-800">
              Estoque Crítico
            </h2>

          </div>

          {carregando ? (
            <div className="p-8 text-center text-gray-400">
              Carregando...
            </div>
          ) : estoqueCritico.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhum produto crítico.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {estoqueCritico.map((produto) => (
                <div
                  key={produto.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >

                  <div>

                    <div className="font-medium text-gray-800">
                      {produto.nome}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Estoque atual: {produto.estoque_atual}
                    </div>

                  </div>

                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    Reposição necessária
                  </span>

                </div>
              ))}

            </div>
          )}

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

            <Wallet
              size={18}
              className="text-blue-500"
            />

            <h2 className="font-semibold text-gray-800">
              Contas a Receber Vencidas
            </h2>

          </div>

          {contasReceberVencidas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma conta vencida.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {contasReceberVencidas.map((conta) => (
                <div
                  key={conta.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >

                  <div>

                    <div className="font-medium text-gray-800">
                      {conta.descricao}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Vencido há {diasAtraso(conta.vencimento)} dias
                    </div>

                  </div>

                  <div className="text-sm font-semibold text-red-600">
                    {formatarMoeda(conta.valor)}
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">

            <BadgeAlert
              size={18}
              className="text-red-500"
            />

            <h2 className="font-semibold text-gray-800">
              Contas a Pagar Vencidas
            </h2>

          </div>

          {contasPagarVencidas.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma conta vencida.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">

              {contasPagarVencidas.map((conta) => (
                <div
                  key={conta.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >

                  <div>

                    <div className="font-medium text-gray-800">
                      {conta.descricao}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Vencido há {diasAtraso(conta.vencimento)} dias
                    </div>

                  </div>

                  <div className="text-sm font-semibold text-red-600">
                    {formatarMoeda(conta.valor)}
                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  )
}