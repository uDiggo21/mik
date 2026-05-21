import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  BadgeDollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Percent,
  RefreshCcw,
  CalendarDays,
  Search,
  ReceiptText,
  AlertTriangle
} from 'lucide-react'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const CORES = ['#16a34a', '#ef4444', '#3b82f6', '#f97316']

export default function Dre() {
  const [financeiro, setFinanceiro] = useState([])
  const [vendas, setVendas] = useState([])
  const [compras, setCompras] = useState([])
  const [produtos, setProdutos] = useState([])

  const [carregando, setCarregando] = useState(true)
  const [periodoFiltro, setPeriodoFiltro] = useState('30')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const [financeiroRes, vendasRes, comprasRes, produtosRes] = await Promise.all([
      supabase
        .from('financeiro')
        .select('*')
        .order('data', { ascending: false }),

      supabase
        .from('vendas')
        .select('*')
        .order('criado_em', { ascending: false }),

      supabase
        .from('compras')
        .select('*')
        .order('criado_em', { ascending: false }),

      supabase
        .from('produtos')
        .select('*')
    ])

    if (financeiroRes.error) console.error(financeiroRes.error)
    if (vendasRes.error) console.error(vendasRes.error)
    if (comprasRes.error) console.error(comprasRes.error)
    if (produtosRes.error) console.error(produtosRes.error)

    setFinanceiro(financeiroRes.data || [])
    setVendas(vendasRes.data || [])
    setCompras(comprasRes.data || [])
    setProdutos(produtosRes.data || [])

    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarPercentual(valor) {
    return `${Number(valor || 0).toFixed(2)}%`
  }

  function formatarData(data) {
    if (!data) return '—'

    return new Date(String(data).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function obterData(item) {
    return String(item.data || item.criado_em || new Date().toISOString()).slice(0, 10)
  }

  function dentroPeriodo(data) {
    if (periodoFiltro === 'todos') return true

    const dias = Number(periodoFiltro)
    const hoje = new Date()
    const limite = new Date()

    limite.setDate(hoje.getDate() - dias)

    const dataItem = new Date(data + 'T00:00:00')

    return dataItem >= limite
  }

  function chaveDia(data) {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const financeiroFiltrado = useMemo(() => {
    const texto = String(busca || '').toLowerCase()

    return financeiro.filter((mov) => {
      const data = obterData(mov)

      const batePeriodo = dentroPeriodo(data)

      const bateBusca =
        String(mov.descricao || '').toLowerCase().includes(texto) ||
        String(mov.categoria || '').toLowerCase().includes(texto) ||
        String(mov.origem || '').toLowerCase().includes(texto) ||
        String(mov.tipo || '').toLowerCase().includes(texto)

      return batePeriodo && bateBusca
    })
  }, [financeiro, periodoFiltro, busca])

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((venda) => {
      const data = obterData(venda)

      return venda.status !== 'cancelada' && dentroPeriodo(data)
    })
  }, [vendas, periodoFiltro])

  const comprasFiltradas = useMemo(() => {
    return compras.filter((compra) => {
      const data = obterData(compra)

      return dentroPeriodo(data)
    })
  }, [compras, periodoFiltro])

  const dre = useMemo(() => {
    const receitaBruta = vendasFiltradas.reduce((acc, venda) => {
      return acc + Number(venda.total || 0)
    }, 0)

    const descontos = vendasFiltradas.reduce((acc, venda) => {
      return acc + Number(venda.desconto || 0)
    }, 0)

    const receitaLiquida = receitaBruta

    const custoMercadorias = comprasFiltradas.reduce((acc, compra) => {
      return acc + Number(compra.total || 0)
    }, 0)

    const despesasOperacionais = financeiroFiltrado
      .filter((mov) => {
        return (
          mov.tipo === 'saida' &&
          mov.categoria !== 'compra_estoque' &&
          mov.origem !== 'compra'
        )
      })
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const outrasEntradas = financeiroFiltrado
      .filter((mov) => {
        return mov.tipo === 'entrada' && mov.categoria !== 'venda'
      })
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const lucroBruto = receitaLiquida - custoMercadorias
    const resultadoOperacional = lucroBruto - despesasOperacionais
    const resultadoFinal = resultadoOperacional + outrasEntradas

    const margemBruta =
      receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0

    const margemLiquida =
      receitaLiquida > 0 ? (resultadoFinal / receitaLiquida) * 100 : 0

    return {
      receitaBruta,
      descontos,
      receitaLiquida,
      custoMercadorias,
      despesasOperacionais,
      outrasEntradas,
      lucroBruto,
      resultadoOperacional,
      resultadoFinal,
      margemBruta,
      margemLiquida
    }
  }, [vendasFiltradas, comprasFiltradas, financeiroFiltrado])

  const graficoResultado = [
    {
      nome: 'Receita',
      valor: dre.receitaLiquida
    },
    {
      nome: 'CMV',
      valor: dre.custoMercadorias
    },
    {
      nome: 'Despesas',
      valor: dre.despesasOperacionais
    },
    {
      nome: 'Resultado',
      valor: dre.resultadoFinal
    }
  ]

  const graficoCategoria = useMemo(() => {
    const mapa = {}

    financeiroFiltrado.forEach((mov) => {
      const categoria = mov.categoria || 'Sem categoria'

      if (!mapa[categoria]) {
        mapa[categoria] = {
          categoria,
          valor: 0
        }
      }

      if (mov.tipo === 'saida') {
        mapa[categoria].valor += Number(mov.valor || 0)
      }
    })

    return Object.values(mapa)
      .filter((item) => item.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 6)
  }, [financeiroFiltrado])

  const graficoMensal = useMemo(() => {
    const mapa = {}

    vendasFiltradas.forEach((venda) => {
      const data = obterData(venda)
      const label = chaveDia(data)

      if (!mapa[label]) {
        mapa[label] = {
          data: label,
          receita: 0,
          despesas: 0,
          resultado: 0
        }
      }

      mapa[label].receita += Number(venda.total || 0)
    })

    financeiroFiltrado.forEach((mov) => {
      const data = obterData(mov)
      const label = chaveDia(data)

      if (!mapa[label]) {
        mapa[label] = {
          data: label,
          receita: 0,
          despesas: 0,
          resultado: 0
        }
      }

      if (mov.tipo === 'saida') {
        mapa[label].despesas += Number(mov.valor || 0)
      }
    })

    return Object.values(mapa)
      .map((item) => ({
        ...item,
        resultado: item.receita - item.despesas
      }))
      .slice(-10)
  }, [vendasFiltradas, financeiroFiltrado])

  if (carregando) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
          Carregando DRE...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ReceiptText size={22} />
            DRE Simplificado
          </h1>

          <p className="text-sm text-gray-500">
            Demonstrativo de resultados com base nas vendas, compras e financeiro
          </p>

        </div>

        <button
          onClick={buscarDados}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        <div className="grid grid-cols-3 gap-3">

          <div className="col-span-2 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

            <Search size={16} className="text-gray-400" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar no financeiro por descrição, categoria ou origem..."
              className="flex-1 text-sm outline-none text-gray-700"
            />

          </div>

          <select
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-gray-700"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="todos">Todo período</option>
          </select>

        </div>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <Card
          titulo="Receita líquida"
          valor={formatarMoeda(dre.receitaLiquida)}
          descricao="Vendas concluídas"
          icone={<TrendingUp size={20} />}
          cor="text-green-600"
        />

        <Card
          titulo="CMV / Compras"
          valor={formatarMoeda(dre.custoMercadorias)}
          descricao="Custo de mercadorias"
          icone={<TrendingDown size={20} />}
          cor="text-red-600"
        />

        <Card
          titulo="Resultado final"
          valor={formatarMoeda(dre.resultadoFinal)}
          descricao="Lucro ou prejuízo estimado"
          icone={<Wallet size={20} />}
          cor={dre.resultadoFinal >= 0 ? 'text-green-600' : 'text-red-600'}
        />

        <Card
          titulo="Margem líquida"
          valor={formatarPercentual(dre.margemLiquida)}
          descricao="Resultado / receita"
          icone={<Percent size={20} />}
          cor={dre.margemLiquida >= 0 ? 'text-blue-600' : 'text-red-600'}
        />

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">

          <h2 className="font-semibold text-gray-800 mb-1">
            Resultado por período
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Receita, despesas e resultado por dia filtrado
          </p>

          <div className="h-72">

            {graficoMensal.length === 0 ? (
              <Empty mensagem="Nenhum dado para o gráfico." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficoMensal}>
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
                  <Bar dataKey="receita" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="resultado" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <h2 className="font-semibold text-gray-800 mb-1">
            Composição
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            Receita, custo, despesas e resultado
          </p>

          <div className="h-72">

            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={graficoResultado.filter((item) => item.valor > 0)}
                  dataKey="valor"
                  nameKey="nome"
                  outerRadius={90}
                  label={({ nome }) => nome}
                >
                  {graficoResultado.map((_, index) => (
                    <Cell
                      key={index}
                      fill={CORES[index % CORES.length]}
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

          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-800">
              Demonstrativo
            </h2>

            <p className="text-sm text-gray-500">
              Estrutura simplificada da DRE
            </p>

          </div>

          <LinhaDre titulo="Receita bruta" valor={dre.receitaBruta} tipo="positivo" />
          <LinhaDre titulo="(-) Descontos concedidos" valor={dre.descontos} tipo="negativo" />
          <LinhaDre titulo="Receita líquida" valor={dre.receitaLiquida} destaque />
          <LinhaDre titulo="(-) Custo das mercadorias" valor={dre.custoMercadorias} tipo="negativo" />
          <LinhaDre titulo="Lucro bruto" valor={dre.lucroBruto} destaque />
          <LinhaDre titulo="(-) Despesas operacionais" valor={dre.despesasOperacionais} tipo="negativo" />
          <LinhaDre titulo="(+) Outras entradas" valor={dre.outrasEntradas} tipo="positivo" />
          <LinhaDre titulo="Resultado final" valor={dre.resultadoFinal} destaque final />

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-800">
              Despesas por categoria
            </h2>

            <p className="text-sm text-gray-500">
              Maiores impactos nas saídas
            </p>

          </div>

          {graficoCategoria.length === 0 ? (
            <div className="p-5 text-sm text-gray-400">
              Nenhuma despesa encontrada.
            </div>
          ) : (
            graficoCategoria.map((item) => (
              <div
                key={item.categoria}
                className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
              >

                <div>

                  <p className="font-medium text-gray-800">
                    {item.categoria}
                  </p>

                  <p className="text-xs text-gray-400">
                    Categoria financeira
                  </p>

                </div>

                <span className="font-semibold text-red-600">
                  {formatarMoeda(item.valor)}
                </span>

              </div>
            ))
          )}

        </div>

      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-orange-700 flex gap-3">

        <AlertTriangle size={20} className="mt-0.5" />

        <p className="text-sm">
          Esta DRE é gerencial e simplificada. O CMV está estimado pelas compras
          registradas no período, não por custo médio contábil. A apuração contábil
          real deve ser feita depois, quando o módulo de custo médio estiver pronto.
        </p>

      </div>

    </div>
  )

  function LinhaDre({ titulo, valor, tipo, destaque, final }) {
    const negativo = tipo === 'negativo'
    const positivo = tipo === 'positivo'

    return (
      <div
        className={`px-5 py-4 border-b border-gray-100 flex items-center justify-between ${
          destaque ? 'bg-gray-50' : ''
        }`}
      >

        <span
          className={`${
            destaque ? 'font-semibold text-gray-800' : 'text-gray-600'
          }`}
        >
          {titulo}
        </span>

        <span
          className={`font-semibold ${
            final
              ? valor >= 0
                ? 'text-green-600'
                : 'text-red-600'
              : negativo
                ? 'text-red-600'
                : positivo
                  ? 'text-green-600'
                  : 'text-gray-800'
          }`}
        >
          {negativo ? '- ' : positivo ? '+ ' : ''}
          {formatarMoeda(valor)}
        </span>

      </div>
    )
  }
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

function Empty({ mensagem }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-gray-400">
      {mensagem}
    </div>
  )
}
