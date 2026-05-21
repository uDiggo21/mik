import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CreditCard,
  TrendingUp
} from 'lucide-react'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

export default function Dashboard() {
  const [dados, setDados] = useState({
    produtos: [],
    clientes: [],
    fornecedores: [],
    vendas: [],
    financeiro: [],
    fiado: []
  })

  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    carregarDashboard()
  }, [])

  async function carregarDashboard() {
    setCarregando(true)

    const [
      produtosRes,
      clientesRes,
      fornecedoresRes,
      vendasRes,
      financeiroRes,
      fiadoRes
    ] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('fornecedores').select('*'),
      supabase.from('vendas').select('*').order('criado_em', { ascending: false }),
      supabase.from('financeiro').select('*').order('data', { ascending: false }),
      supabase.from('fiado').select('*').order('criado_em', { ascending: false })
    ])

    setDados({
      produtos: produtosRes.data || [],
      clientes: clientesRes.data || [],
      fornecedores: fornecedoresRes.data || [],
      vendas: vendasRes.data || [],
      financeiro: financeiroRes.data || [],
      fiado: fiadoRes.data || []
    })

    setCarregando(false)
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

  function dataBR(data) {
    if (!data) return 'Sem data'
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const totalProdutos = dados.produtos.length
  const totalClientes = dados.clientes.length
  const totalFornecedores = dados.fornecedores.length
  const totalVendas = dados.vendas.filter((v) => v.status !== 'cancelada').length

  const vendasValidas = dados.vendas.filter((v) => v.status !== 'cancelada')

  const faturamentoTotal = vendasValidas.reduce((acc, venda) => {
    return acc + Number(venda.total || 0)
  }, 0)

  const entradas = dados.financeiro
    .filter((m) => m.tipo === 'entrada')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)

  const saidas = dados.financeiro
    .filter((m) => m.tipo === 'saida')
    .reduce((acc, m) => acc + Number(m.valor || 0), 0)

  const saldo = entradas - saidas

  const estoqueCritico = dados.produtos.filter((p) => {
    return Number(p.estoque_atual || 0) <= Number(p.estoque_minimo || 0)
  })

  const totalFiadoAberto = dados.fiado
    .filter((f) => f.status !== 'pago' && f.status !== 'cancelado')
    .reduce((acc, f) => {
      return acc + (Number(f.valor || 0) - Number(f.valor_pago || 0))
    }, 0)

  const vendasRecentes = vendasValidas.slice(0, 5)
  const produtosCriticos = estoqueCritico.slice(0, 5)
  const movimentosRecentes = dados.financeiro.slice(0, 5)

  const graficoVendas = vendasValidas
    .reduce((acc, venda) => {
      const data = dataBR(venda.criado_em)
      const encontrado = acc.find((item) => item.data === data)

      if (encontrado) {
        encontrado.total += Number(venda.total || 0)
      } else {
        acc.push({
          data,
          total: Number(venda.total || 0)
        })
      }

      return acc
    }, [])
    .slice(-7)

  const graficoFinanceiro = dados.financeiro
    .reduce((acc, mov) => {
      const data = dataBR(mov.data)
      const encontrado = acc.find((item) => item.data === data)

      if (encontrado) {
        if (mov.tipo === 'entrada') encontrado.entradas += Number(mov.valor || 0)
        if (mov.tipo === 'saida') encontrado.saidas += Number(mov.valor || 0)
      } else {
        acc.push({
          data,
          entradas: mov.tipo === 'entrada' ? Number(mov.valor || 0) : 0,
          saidas: mov.tipo === 'saida' ? Number(mov.valor || 0) : 0
        })
      }

      return acc
    }, [])
    .slice(-7)

  const graficoResumo = [
    { name: 'Entradas', value: entradas },
    { name: 'Saídas', value: saidas },
    { name: 'Fiado aberto', value: totalFiadoAberto }
  ]

  if (carregando) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard
        </h1>

        <p className="text-sm text-gray-500">
          Visão geral financeira e operacional do ERP
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card titulo="Produtos" valor={totalProdutos} icone={<Package size={18} />} />
        <Card titulo="Clientes" valor={totalClientes} icone={<Users size={18} />} />
        <Card titulo="Fornecedores" valor={totalFornecedores} icone={<Truck size={18} />} />
        <Card titulo="Vendas" valor={totalVendas} icone={<ShoppingCart size={18} />} />

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <CardFinanceiro
          titulo="Faturamento"
          valor={formatarMoeda(faturamentoTotal)}
          cor="text-green-600"
          icone={<TrendingUp size={18} />}
        />

        <CardFinanceiro
          titulo="Entradas"
          valor={formatarMoeda(entradas)}
          cor="text-green-600"
          icone={<DollarSign size={18} />}
        />

        <CardFinanceiro
          titulo="Saídas"
          valor={formatarMoeda(saidas)}
          cor="text-red-600"
          icone={<CreditCard size={18} />}
        />

        <CardFinanceiro
          titulo="Saldo"
          valor={formatarMoeda(saldo)}
          cor={saldo >= 0 ? 'text-green-600' : 'text-red-600'}
          icone={<DollarSign size={18} />}
        />

      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">
            Vendas por dia
          </h2>

          <p className="text-xs text-gray-500 mb-4">
            Últimos dias com vendas registradas
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={graficoVendas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">
            Entradas x Saídas
          </h2>

          <p className="text-xs text-gray-500 mb-4">
            Comparativo financeiro por dia
          </p>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graficoFinanceiro}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(value)} />
                <Line type="monotone" dataKey="entradas" stroke="#16a34a" strokeWidth={3} />
                <Line type="monotone" dataKey="saidas" stroke="#dc2626" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-1">
            Resumo financeiro
          </h2>

          <p className="text-xs text-gray-500 mb-4">
            Entradas, saídas e fiado em aberto
          </p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={graficoResumo}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={90}
                  label
                >
                  <Cell fill="#16a34a" />
                  <Cell fill="#dc2626" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip formatter={(value) => formatarMoeda(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">
              Alertas de estoque
            </h2>

            <AlertTriangle size={18} className="text-red-500" />
          </div>

          {produtosCriticos.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum produto crítico.</p>
          ) : (
            <div className="space-y-3">
              {produtosCriticos.map((p) => (
                <div key={p.id} className="border-b border-gray-100 pb-2">
                  <div className="font-medium text-gray-800 text-sm">
                    {p.nome}
                  </div>

                  <div className="text-xs text-red-600">
                    Estoque: {p.estoque_atual} / mínimo: {p.estoque_minimo}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            Fiado em aberto
          </h2>

          <div className="text-3xl font-bold text-orange-600 mb-2">
            {formatarMoeda(totalFiadoAberto)}
          </div>

          <p className="text-sm text-gray-500">
            Valor pendente de recebimento.
          </p>
        </div>

      </div>

      <div className="grid grid-cols-2 gap-6">

        <TabelaSimples
          titulo="Vendas recentes"
          vazio="Nenhuma venda registrada."
          colunas={['Data', 'Forma', 'Total']}
          dados={vendasRecentes.map((v) => [
            formatarData(v.criado_em),
            v.forma_pagamento,
            formatarMoeda(v.total)
          ])}
        />

        <TabelaSimples
          titulo="Movimentos financeiros recentes"
          vazio="Nenhum movimento registrado."
          colunas={['Data', 'Descrição', 'Valor']}
          dados={movimentosRecentes.map((m) => [
            formatarData(m.data),
            m.descricao,
            `${m.tipo === 'entrada' ? '+' : '-'} ${formatarMoeda(m.valor)}`
          ])}
        />

      </div>

    </div>
  )
}

function Card({ titulo, valor, icone }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{titulo}</span>
        <span className="text-gray-400">{icone}</span>
      </div>

      <div className="text-2xl font-semibold text-gray-800">
        {valor}
      </div>
    </div>
  )
}

function CardFinanceiro({ titulo, valor, cor, icone }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500">{titulo}</span>
        <span className={cor}>{icone}</span>
      </div>

      <div className={`text-2xl font-semibold ${cor}`}>
        {valor}
      </div>
    </div>
  )
}

function TabelaSimples({ titulo, vazio, colunas, dados }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">{titulo}</h2>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {colunas.map((coluna) => (
              <th key={coluna} className="text-left px-4 py-3 text-xs text-gray-500">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {dados.length === 0 ? (
            <tr>
              <td colSpan={colunas.length} className="text-center py-8 text-gray-400">
                {vazio}
              </td>
            </tr>
          ) : (
            dados.map((linha, index) => (
              <tr key={index} className="border-b border-gray-100">
                {linha.map((valor, i) => (
                  <td key={i} className="px-4 py-3 text-gray-600">
                    {valor}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}