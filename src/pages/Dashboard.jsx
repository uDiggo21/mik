import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  RefreshCcw,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle
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

const CORES_GRAFICO = ['#16a34a', '#ef4444', '#f97316', '#3b82f6']

export default function Dashboard() {
  const [dados, setDados] = useState({
    produtos: [],
    clientes: [],
    fornecedores: [],
    vendas: [],
    financeiro: [],
    fiado: [],
    compras: []
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
      fiadoRes,
      comprasRes
    ] = await Promise.all([
      supabase.from('produtos').select('*'),
      supabase.from('clientes').select('*'),
      supabase.from('fornecedores').select('*'),
      supabase
        .from('vendas')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .order('criado_em', { ascending: false }),
      supabase
        .from('financeiro')
        .select('*')
        .order('data', { ascending: false }),
      supabase
        .from('fiado')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .order('criado_em', { ascending: false }),
      supabase
        .from('compras')
        .select('*')
        .order('criado_em', { ascending: false })
    ])

    setDados({
      produtos: produtosRes.data || [],
      clientes: clientesRes.data || [],
      fornecedores: fornecedoresRes.data || [],
      vendas: vendasRes.data || [],
      financeiro: financeiroRes.data || [],
      fiado: fiadoRes.data || [],
      compras: comprasRes.data || []
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

  function chaveDia(data) {
    if (!data) return 'Sem data'

    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const metricas = useMemo(() => {
    const vendasValidas = dados.vendas.filter(
      (venda) => venda.status !== 'cancelada'
    )

    const faturamentoTotal = vendasValidas.reduce(
      (acc, venda) => acc + Number(venda.total || 0),
      0
    )

    const entradas = dados.financeiro
      .filter((mov) => mov.tipo === 'entrada')
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const saidas = dados.financeiro
      .filter((mov) => mov.tipo === 'saida')
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const totalCompras = dados.compras.reduce(
      (acc, compra) => acc + Number(compra.total || 0),
      0
    )

    const saldo = entradas - saidas

    const fiadoAberto = dados.fiado
      .filter((item) => item.status !== 'pago' && item.status !== 'cancelado')
      .reduce((acc, item) => {
        return acc + (Number(item.valor || 0) - Number(item.valor_pago || 0))
      }, 0)

    const estoqueCritico = dados.produtos.filter((produto) => {
      const estoqueAtual = Number(produto.estoque_atual || 0)
      const estoqueMinimo = Number(produto.estoque_minimo || 0)

      return estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo
    })

    const custoEstoque = dados.produtos.reduce((acc, produto) => {
      return (
        acc +
        Number(produto.estoque_atual || 0) * Number(produto.preco_custo || 0)
      )
    }, 0)

    return {
      vendasValidas,
      faturamentoTotal,
      entradas,
      saidas,
      saldo,
      fiadoAberto,
      estoqueCritico,
      totalCompras,
      custoEstoque
    }
  }, [dados])

  const graficoVendas = useMemo(() => {
    const mapa = new Map()

    metricas.vendasValidas.forEach((venda) => {
      const data = chaveDia(venda.criado_em)
      const atual = mapa.get(data) || 0

      mapa.set(data, atual + Number(venda.total || 0))
    })

    return Array.from(mapa.entries())
      .map(([data, total]) => ({
        data,
        total
      }))
      .reverse()
      .slice(-7)
  }, [metricas.vendasValidas])

  const graficoFinanceiro = useMemo(() => {
    const mapa = new Map()

    dados.financeiro.forEach((mov) => {
      const data = chaveDia(mov.data || mov.criado_em)

      const atual = mapa.get(data) || {
        data,
        entradas: 0,
        saidas: 0
      }

      if (mov.tipo === 'entrada') {
        atual.entradas += Number(mov.valor || 0)
      }

      if (mov.tipo === 'saida') {
        atual.saidas += Number(mov.valor || 0)
      }

      mapa.set(data, atual)
    })

    return Array.from(mapa.values()).reverse().slice(-7)
  }, [dados.financeiro])

  const graficoResumoFinanceiro = [
    {
      name: 'Entradas',
      value: metricas.entradas
    },
    {
      name: 'Saídas',
      value: metricas.saidas
    },
    {
      name: 'Fiado',
      value: metricas.fiadoAberto
    }
  ].filter((item) => item.value > 0)

  const vendasRecentes = metricas.vendasValidas.slice(0, 6)
  const movimentosRecentes = dados.financeiro.slice(0, 6)
  const fiadosRecentes = dados.fiado
    .filter((item) => item.status !== 'pago' && item.status !== 'cancelado')
    .slice(0, 5)

  const produtosCriticos = metricas.estoqueCritico.slice(0, 6)

  if (carregando) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
          Carregando dashboard...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800">
            Dashboard Executivo
          </h1>

          <p className="text-sm text-gray-500">
            Visão geral financeira, comercial e operacional do ERP
          </p>

        </div>

        <button
          onClick={carregarDashboard}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card
          titulo="Faturamento"
          valor={formatarMoeda(metricas.faturamentoTotal)}
          descricao="Vendas concluídas"
          icone={<ShoppingCart size={20} />}
          cor="text-green-600"
        />

        <Card
          titulo="Saldo financeiro"
          valor={formatarMoeda(metricas.saldo)}
          descricao="Entradas - saídas"
          icone={<DollarSign size={20} />}
          cor={metricas.saldo >= 0 ? 'text-green-600' : 'text-red-600'}
        />

        <Card
          titulo="Fiado aberto"
          valor={formatarMoeda(metricas.fiadoAberto)}
          descricao="Pendente de recebimento"
          icone={<CreditCard size={20} />}
          cor="text-orange-600"
        />

        <Card
          titulo="Estoque crítico"
          valor={metricas.estoqueCritico.length}
          descricao="Produtos abaixo do mínimo"
          icone={<AlertTriangle size={20} />}
          cor={
            metricas.estoqueCritico.length > 0
              ? 'text-red-600'
              : 'text-green-600'
          }
        />

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <MiniCard
          titulo="Produtos"
          valor={dados.produtos.length}
          icone={<Package size={18} />}
        />

        <MiniCard
          titulo="Clientes"
          valor={dados.clientes.length}
          icone={<Users size={18} />}
        />

        <MiniCard
          titulo="Fornecedores"
          valor={dados.fornecedores.length}
          icone={<Truck size={18} />}
        />

        <MiniCard
          titulo="Vendas válidas"
          valor={metricas.vendasValidas.length}
          icone={<TrendingUp size={18} />}
        />

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Vendas por dia
            </h2>

            <p className="text-sm text-gray-500">
              Últimos dias com vendas concluídas
            </p>

          </div>

          <div className="h-72">

            {graficoVendas.length === 0 ? (
              <EmptyChart mensagem="Nenhuma venda para exibir." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficoVendas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="data" tick={{ fill: '#9ca3af' }} />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(value) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="#16a34a"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Resumo financeiro
            </h2>

            <p className="text-sm text-gray-500">
              Entradas, saídas e fiado
            </p>

          </div>

          <div className="h-72">

            {graficoResumoFinanceiro.length === 0 ? (
              <EmptyChart mensagem="Sem movimentações financeiras." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={graficoResumoFinanceiro}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label={({ name }) => name}
                  >
                    {graficoResumoFinanceiro.map((_, index) => (
                      <Cell
                        key={index}
                        fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Entradas x Saídas
            </h2>

            <p className="text-sm text-gray-500">
              Comparativo financeiro dos últimos dias
            </p>

          </div>

          <div className="h-72">

            {graficoFinanceiro.length === 0 ? (
              <EmptyChart mensagem="Nenhum movimento financeiro." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graficoFinanceiro}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="data" tick={{ fill: '#9ca3af' }} />
                  <YAxis tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    formatter={(value) => formatarMoeda(value)}
                    contentStyle={{
                      backgroundColor: '#111827',
                      border: '1px solid #374151',
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="entradas"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="saidas"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        <div className="space-y-4">

          <ResumoCard
            titulo="Entradas"
            valor={formatarMoeda(metricas.entradas)}
            icone={<ArrowUpCircle size={18} />}
            cor="text-green-600"
          />

          <ResumoCard
            titulo="Saídas"
            valor={formatarMoeda(metricas.saidas)}
            icone={<ArrowDownCircle size={18} />}
            cor="text-red-600"
          />

          <ResumoCard
            titulo="Compras"
            valor={formatarMoeda(metricas.totalCompras)}
            icone={<Truck size={18} />}
            cor="text-red-600"
          />

          <ResumoCard
            titulo="Estoque a custo"
            valor={formatarMoeda(metricas.custoEstoque)}
            icone={<Wallet size={18} />}
            cor="text-gray-800"
          />

        </div>

      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        <TabelaSimples
          titulo="Vendas recentes"
          vazio="Nenhuma venda recente."
          colunas={['Data', 'Cliente', 'Pagamento', 'Total']}
          dados={vendasRecentes.map((venda) => [
            formatarData(venda.criado_em),
            venda.clientes?.nome || 'Não informado',
            venda.forma_pagamento || '—',
            formatarMoeda(venda.total)
          ])}
        />

        <TabelaSimples
          titulo="Movimentos financeiros"
          vazio="Nenhum movimento financeiro."
          colunas={['Data', 'Descrição', 'Tipo', 'Valor']}
          dados={movimentosRecentes.map((mov) => [
            formatarData(mov.data || mov.criado_em),
            mov.descricao || '—',
            mov.tipo || '—',
            formatarMoeda(mov.valor)
          ])}
        />

      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-800">
              Alertas de estoque
            </h2>

            <p className="text-sm text-gray-500">
              Produtos abaixo do estoque mínimo
            </p>

          </div>

          <div className="divide-y divide-gray-100">

            {produtosCriticos.length === 0 ? (
              <div className="p-5 text-sm text-gray-400">
                Nenhum produto crítico.
              </div>
            ) : (
              produtosCriticos.map((produto) => (
                <div
                  key={produto.id}
                  className="p-5 flex items-center justify-between"
                >

                  <div>

                    <p className="font-medium text-gray-800">
                      {produto.nome}
                    </p>

                    <p className="text-sm text-gray-500">
                      Estoque mínimo: {produto.estoque_minimo || 0}
                    </p>

                  </div>

                  <span className="text-sm font-semibold text-red-600">
                    Atual: {produto.estoque_atual || 0}
                  </span>

                </div>
              ))
            )}

          </div>

        </div>

        <TabelaSimples
          titulo="Fiado em aberto"
          vazio="Nenhum fiado pendente."
          colunas={['Cliente', 'Data', 'Valor aberto']}
          dados={fiadosRecentes.map((item) => [
            item.clientes?.nome || 'Cliente',
            formatarData(item.criado_em),
            formatarMoeda(Number(item.valor || 0) - Number(item.valor_pago || 0))
          ])}
        />

      </div>

    </div>
  )
}

function Card({ titulo, valor, descricao, icone, cor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <div className="flex items-start justify-between mb-4">

        <div>

          <p className="text-sm text-gray-500">
            {titulo}
          </p>

          <h2 className={`text-2xl font-bold mt-1 ${cor}`}>
            {valor}
          </h2>

        </div>

        <div className={`p-2 rounded-xl bg-gray-50 ${cor}`}>
          {icone}
        </div>

      </div>

      <p className="text-xs text-gray-400">
        {descricao}
      </p>

    </div>
  )
}

function MiniCard({ titulo, valor, icone }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">

      <div>

        <p className="text-sm text-gray-500">
          {titulo}
        </p>

        <h3 className="text-xl font-bold text-gray-800 mt-1">
          {valor}
        </h3>

      </div>

      <div className="text-gray-400">
        {icone}
      </div>

    </div>
  )
}

function ResumoCard({ titulo, valor, icone, cor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {titulo}
          </p>

          <h3 className={`text-xl font-bold mt-1 ${cor}`}>
            {valor}
          </h3>

        </div>

        <div className={cor}>
          {icone}
        </div>

      </div>

    </div>
  )
}

function EmptyChart({ mensagem }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-400">
      {mensagem}
    </div>
  )
}

function TabelaSimples({ titulo, vazio, colunas, dados }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

      <div className="px-5 py-4 border-b border-gray-200">

        <h2 className="font-semibold text-gray-800">
          {titulo}
        </h2>

      </div>

      <table className="w-full text-sm">

        <thead className="bg-gray-50 border-b border-gray-200">

          <tr>

            {colunas.map((coluna) => (
              <th
                key={coluna}
                className="text-left px-4 py-3 text-xs font-medium text-gray-500"
              >
                {coluna}
              </th>
            ))}

          </tr>

        </thead>

        <tbody>

          {dados.length === 0 ? (
            <tr>

              <td
                colSpan={colunas.length}
                className="text-center py-8 text-gray-400"
              >
                {vazio}
              </td>

            </tr>
          ) : (
            dados.map((linha, index) => (
              <tr
                key={index}
                className="border-b border-gray-100"
              >

                {linha.map((valor, i) => (
                  <td
                    key={i}
                    className="px-4 py-3 text-gray-700"
                  >
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
