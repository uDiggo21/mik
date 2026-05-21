import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Search,
  Filter,
  Activity
} from 'lucide-react'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line
} from 'recharts'

export default function FluxoCaixa() {
  const [movimentos, setMovimentos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [periodoFiltro, setPeriodoFiltro] = useState('30')

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
      alert('Erro ao carregar fluxo de caixa.')
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
    if (!data) return '—'

    const texto = String(data)

    if (texto.includes('T')) {
      return new Date(texto).toLocaleDateString('pt-BR')
    }

    return new Date(texto + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function obterDataMovimento(mov) {
    const data = mov.data || mov.criado_em || new Date().toISOString()

    return String(data).slice(0, 10)
  }

  function chaveDia(data) {
    if (!data) return '—'

    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  function dentroDoPeriodo(data) {
    if (periodoFiltro === 'todos') return true

    const dias = Number(periodoFiltro)
    const hoje = new Date()
    const limite = new Date()

    limite.setDate(hoje.getDate() - dias)

    const dataMovimento = new Date(data + 'T00:00:00')

    return dataMovimento >= limite
  }

  const movimentosFiltrados = useMemo(() => {
    const texto = String(busca || '').toLowerCase()

    return movimentos.filter((mov) => {
      const dataMovimento = obterDataMovimento(mov)

      const bateBusca =
        String(mov.descricao || '').toLowerCase().includes(texto) ||
        String(mov.categoria || '').toLowerCase().includes(texto) ||
        String(mov.tipo || '').toLowerCase().includes(texto) ||
        String(mov.origem || '').toLowerCase().includes(texto)

      const bateTipo = tipoFiltro === 'todos' || mov.tipo === tipoFiltro
      const batePeriodo = dentroDoPeriodo(dataMovimento)

      return bateBusca && bateTipo && batePeriodo
    })
  }, [movimentos, busca, tipoFiltro, periodoFiltro])

  const resumo = useMemo(() => {
    let entradas = 0
    let saidas = 0

    movimentosFiltrados.forEach((mov) => {
      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') entradas += valor
      if (mov.tipo === 'saida') saidas += valor
    })

    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      quantidade: movimentosFiltrados.length
    }
  }, [movimentosFiltrados])

  const graficoDiario = useMemo(() => {
    const agrupado = {}

    movimentosFiltrados.forEach((mov) => {
      const data = obterDataMovimento(mov)

      if (!agrupado[data]) {
        agrupado[data] = {
          data,
          label: chaveDia(data),
          entradas: 0,
          saidas: 0,
          saldoDia: 0,
          saldoAcumulado: 0
        }
      }

      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') agrupado[data].entradas += valor
      if (mov.tipo === 'saida') agrupado[data].saidas += valor

      agrupado[data].saldoDia =
        agrupado[data].entradas - agrupado[data].saidas
    })

    let acumulado = 0

    return Object.values(agrupado)
      .sort((a, b) => new Date(a.data) - new Date(b.data))
      .map((item) => {
        acumulado += item.saldoDia

        return {
          ...item,
          saldoAcumulado: acumulado
        }
      })
  }, [movimentosFiltrados])

  const categorias = useMemo(() => {
    const mapa = {}

    movimentosFiltrados.forEach((mov) => {
      const categoria = mov.categoria || 'Sem categoria'

      if (!mapa[categoria]) {
        mapa[categoria] = {
          categoria,
          entradas: 0,
          saidas: 0,
          total: 0
        }
      }

      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') {
        mapa[categoria].entradas += valor
        mapa[categoria].total += valor
      }

      if (mov.tipo === 'saida') {
        mapa[categoria].saidas += valor
        mapa[categoria].total -= valor
      }
    })

    return Object.values(mapa)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 8)
  }, [movimentosFiltrados])

  const maiorEntrada = movimentosFiltrados
    .filter((mov) => mov.tipo === 'entrada')
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0]

  const maiorSaida = movimentosFiltrados
    .filter((mov) => mov.tipo === 'saida')
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0]

  const movimentosRecentes = movimentosFiltrados
    .slice()
    .sort((a, b) => {
      return new Date(obterDataMovimento(b)) - new Date(obterDataMovimento(a))
    })
    .slice(0, 12)

  if (carregando) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
          Carregando fluxo de caixa...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Activity size={22} />
            Fluxo de Caixa
          </h1>

          <p className="text-sm text-gray-500">
            Controle gerencial de entradas, saídas e saldo acumulado
          </p>

        </div>

        <button
          onClick={buscarMovimentos}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <CardResumo
          titulo="Entradas"
          valor={formatarMoeda(resumo.entradas)}
          descricao="Recebimentos no período"
          icon={<TrendingUp size={20} />}
          cor="green"
        />

        <CardResumo
          titulo="Saídas"
          valor={formatarMoeda(resumo.saidas)}
          descricao="Pagamentos no período"
          icon={<TrendingDown size={20} />}
          cor="red"
        />

        <CardResumo
          titulo="Saldo"
          valor={formatarMoeda(resumo.saldo)}
          descricao="Entradas - saídas"
          icon={<Wallet size={20} />}
          cor={resumo.saldo >= 0 ? 'green' : 'red'}
        />

        <CardResumo
          titulo="Movimentos"
          valor={resumo.quantidade}
          descricao="Registros filtrados"
          icon={<CalendarDays size={20} />}
          cor="blue"
        />

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        <div className="grid grid-cols-4 gap-3">

          <div className="col-span-2 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

            <Search size={16} className="text-gray-400" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar descrição, categoria, origem..."
              className="flex-1 text-sm outline-none text-gray-700"
            />

          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

            <Filter size={16} className="text-gray-400" />

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-700"
            >
              <option value="todos">Todos os tipos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>

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

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Saldo acumulado
            </h2>

            <p className="text-sm text-gray-500">
              Evolução do caixa conforme entradas e saídas
            </p>

          </div>

          <div className="h-80">

            {graficoDiario.length === 0 ? (
              <EmptyChart mensagem="Nenhum dado financeiro no período." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={graficoDiario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" tick={{ fill: '#9ca3af' }} />
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
                  <Area
                    type="monotone"
                    dataKey="saldoAcumulado"
                    stroke="#16a34a"
                    fill="#16a34a"
                    fillOpacity={0.25}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        <div className="space-y-4">

          <InfoCard
            titulo="Maior entrada"
            valor={maiorEntrada ? formatarMoeda(maiorEntrada.valor) : '—'}
            descricao={maiorEntrada?.descricao || 'Nenhuma entrada'}
            tipo="entrada"
          />

          <InfoCard
            titulo="Maior saída"
            valor={maiorSaida ? formatarMoeda(maiorSaida.valor) : '—'}
            descricao={maiorSaida?.descricao || 'Nenhuma saída'}
            tipo="saida"
          />

          <div className="bg-white border border-gray-200 rounded-2xl p-5">

            <p className="text-sm text-gray-500">
              Resultado operacional
            </p>

            <h3
              className={`text-2xl font-bold mt-1 ${
                resumo.saldo >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {resumo.saldo >= 0 ? 'Positivo' : 'Negativo'}
            </h3>

            <p className="text-xs text-gray-400 mt-2">
              Baseado nos filtros atuais
            </p>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Entradas x Saídas por dia
            </h2>

            <p className="text-sm text-gray-500">
              Comparativo diário
            </p>

          </div>

          <div className="h-72">

            {graficoDiario.length === 0 ? (
              <EmptyChart mensagem="Nenhum movimento encontrado." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graficoDiario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" tick={{ fill: '#9ca3af' }} />
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
                  <Bar dataKey="entradas" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="saidas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="mb-4">

            <h2 className="font-semibold text-gray-800">
              Resultado por categoria
            </h2>

            <p className="text-sm text-gray-500">
              Categorias com maior impacto financeiro
            </p>

          </div>

          <div className="h-72">

            {categorias.length === 0 ? (
              <EmptyChart mensagem="Nenhuma categoria encontrada." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={categorias}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="categoria"
                    tick={{ fill: '#9ca3af' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
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
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200">

          <h2 className="font-semibold text-gray-800">
            Movimentações financeiras
          </h2>

          <p className="text-sm text-gray-500">
            Últimos registros conforme os filtros selecionados
          </p>

        </div>

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>

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
                Origem
              </th>

              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">
                Valor
              </th>

            </tr>

          </thead>

          <tbody>

            {movimentosRecentes.length === 0 ? (
              <tr>

                <td
                  colSpan={6}
                  className="text-center py-8 text-gray-400"
                >
                  Nenhuma movimentação encontrada.
                </td>

              </tr>
            ) : (
              movimentosRecentes.map((mov) => (
                <tr
                  key={mov.id}
                  className="border-b border-gray-100"
                >

                  <td className="px-4 py-3 text-gray-600">
                    {formatarData(obterDataMovimento(mov))}
                  </td>

                  <td className="px-4 py-3">

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        mov.tipo === 'entrada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {mov.tipo === 'entrada' ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}

                      {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>

                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {mov.descricao || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.categoria || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.origem || 'manual'}
                  </td>

                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      mov.tipo === 'entrada'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {mov.tipo === 'entrada' ? '+' : '-'}{' '}
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

function CardResumo({ titulo, valor, descricao, icon, cor }) {
  const cores = {
    green: {
      box: 'bg-green-100 text-green-600',
      text: 'text-green-600'
    },
    red: {
      box: 'bg-red-100 text-red-600',
      text: 'text-red-600'
    },
    blue: {
      box: 'bg-blue-100 text-blue-600',
      text: 'text-blue-600'
    }
  }

  const classe = cores[cor] || cores.blue

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {titulo}
          </p>

          <h2 className={`text-2xl font-bold mt-1 ${classe.text}`}>
            {valor}
          </h2>

          <p className="text-xs text-gray-400 mt-2">
            {descricao}
          </p>

        </div>

        <div className={`p-2 rounded-xl ${classe.box}`}>
          {icon}
        </div>

      </div>

    </div>
  )
}

function InfoCard({ titulo, valor, descricao, tipo }) {
  const positivo = tipo === 'entrada'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <p className="text-sm text-gray-500">
        {titulo}
      </p>

      <h3
        className={`text-2xl font-bold mt-1 ${
          positivo ? 'text-green-600' : 'text-red-600'
        }`}
      >
        {valor}
      </h3>

      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
        {descricao}
      </p>

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
