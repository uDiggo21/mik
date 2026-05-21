import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Wallet,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertTriangle,
  RefreshCcw,
  History,
  Search
} from 'lucide-react'

export default function Caixa() {
  const [caixaAberto, setCaixaAberto] = useState(null)
  const [historico, setHistorico] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])

  const [valorAbertura, setValorAbertura] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const [observacaoFechamento, setObservacaoFechamento] = useState('')

  const [valorSangria, setValorSangria] = useState('')
  const [valorSuprimento, setValorSuprimento] = useState('')
  const [motivoSangria, setMotivoSangria] = useState('')
  const [motivoSuprimento, setMotivoSuprimento] = useState('')

  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const caixa = await buscarCaixaAberto()
    await buscarHistorico()

    if (caixa) {
      await buscarMovimentacoes(caixa.id)
    } else {
      setMovimentacoes([])
    }

    setCarregando(false)
  }

  async function buscarCaixaAberto() {
    const { data, error } = await supabase
      .from('caixa')
      .select('*')
      .eq('status', 'aberto')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(error)
      alert('Erro ao buscar caixa aberto.')
      setCaixaAberto(null)
      return null
    }

    setCaixaAberto(data || null)
    return data || null
  }

  async function buscarHistorico() {
    const { data, error } = await supabase
      .from('caixa')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(20)

    if (error) {
      console.error(error)
      alert('Erro ao buscar histórico de caixa.')
      setHistorico([])
      return
    }

    setHistorico(data || [])
  }

  async function buscarMovimentacoes(caixaId) {
    const [vendasRes, financeiroRes] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, total, forma_pagamento, status, criado_em, operador')
        .eq('caixa_id', caixaId)
        .order('criado_em', { ascending: false }),

      supabase
        .from('financeiro')
        .select('*')
        .eq('caixa_id', caixaId)
        .order('criado_em', { ascending: false })
    ])

    if (vendasRes.error) {
      console.error(vendasRes.error)
      alert('Erro ao buscar vendas do caixa.')
      return
    }

    if (financeiroRes.error) {
      console.error(financeiroRes.error)
      alert('Erro ao buscar movimentações financeiras do caixa.')
      return
    }

    const vendas = (vendasRes.data || [])
      .filter((venda) => venda.status !== 'cancelada')
      .map((venda) => ({
        id: venda.id,
        tipo: 'entrada',
        categoria: 'venda',
        descricao: `Venda ${venda.forma_pagamento || ''}`,
        valor: Number(venda.total || 0),
        criado_em: venda.criado_em,
        origem: venda.forma_pagamento || 'venda'
      }))

    const movimentos = (financeiroRes.data || [])
      .filter((mov) => mov.categoria !== 'venda')
      .map((mov) => ({
        id: mov.id,
        tipo: mov.tipo,
        categoria: mov.categoria || 'financeiro',
        descricao: mov.descricao || 'Movimentação financeira',
        valor: Number(mov.valor || 0),
        criado_em: mov.criado_em,
        origem: mov.origem || 'financeiro'
      }))

    const lista = [...vendas, ...movimentos].sort(
      (a, b) => new Date(b.criado_em) - new Date(a.criado_em)
    )

    setMovimentacoes(lista)
  }

  async function registrarAuditoria(dados) {
    await supabase.from('auditoria').insert([dados])
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarDataHora(data) {
    if (!data) return '—'
    return new Date(data).toLocaleString('pt-BR')
  }

  function obterUsuario() {
    try {
      return (
        JSON.parse(localStorage.getItem('erp_usuario')) ||
        JSON.parse(localStorage.getItem('usuario')) ||
        {}
      )
    } catch {
      return {}
    }
  }

  async function abrirCaixa() {
    const valorInicial = Number(valorAbertura || 0)

    if (valorInicial < 0) {
      alert('O valor inicial não pode ser negativo.')
      return
    }

    setSalvando(true)

    try {
      const caixaExistente = await buscarCaixaAberto()

      if (caixaExistente) {
        alert('Já existe um caixa aberto.')
        return
      }

      const usuario = obterUsuario()

      const { data, error } = await supabase
        .from('caixa')
        .insert([
          {
            usuario_id: usuario.id || null,
            operador: usuario.nome || usuario.email || 'Operador',
            valor_abertura: valorInicial,
            valor_esperado: valorInicial,
            diferenca: 0,
            status: 'aberto'
          }
        ])
        .select()
        .single()

      if (error) {
        console.error(error)
        alert('Erro ao abrir caixa: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: 'abertura_caixa',
        modulo: 'caixa',
        descricao: `Caixa aberto com valor inicial de ${formatarMoeda(valorInicial)}`,
        valor: valorInicial,
        referencia_id: data.id
      })

      setCaixaAberto(data)
      setValorAbertura('')
      await buscarMovimentacoes(data.id)
      await buscarHistorico()

      alert('Caixa aberto com sucesso.')
    } finally {
      setSalvando(false)
    }
  }

  async function fecharCaixa() {
    if (!caixaAberto) return

    if (valorFechamento === '') {
      alert('Informe o valor contado no fechamento.')
      return
    }

    const valorContado = Number(valorFechamento || 0)

    if (valorContado < 0) {
      alert('O valor contado não pode ser negativo.')
      return
    }

    const saldoSistema = resumo.saldoFinal
    const diferenca = valorContado - saldoSistema

    const confirmar = confirm(
      `Deseja fechar o caixa?\n\nSistema: ${formatarMoeda(saldoSistema)}\nContado: ${formatarMoeda(valorContado)}\nDiferença: ${formatarMoeda(diferenca)}`
    )

    if (!confirmar) return

    setSalvando(true)

    try {
      const { error } = await supabase
        .from('caixa')
        .update({
          status: 'fechado',
          valor_fechamento: valorContado,
          valor_esperado: saldoSistema,
          diferenca,
          observacao: observacaoFechamento || null,
          fechado_em: new Date().toISOString()
        })
        .eq('id', caixaAberto.id)

      if (error) {
        console.error(error)
        alert('Erro ao fechar caixa: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: 'fechamento_caixa',
        modulo: 'caixa',
        descricao: `Caixa fechado. Sistema: ${formatarMoeda(saldoSistema)} | Contado: ${formatarMoeda(valorContado)} | Diferença: ${formatarMoeda(diferenca)}`,
        valor: valorContado,
        referencia_id: caixaAberto.id
      })

      setCaixaAberto(null)
      setValorFechamento('')
      setObservacaoFechamento('')
      setMovimentacoes([])

      await buscarHistorico()

      alert('Caixa fechado com sucesso.')
    } finally {
      setSalvando(false)
    }
  }

  async function registrarSangria() {
    if (!caixaAberto) {
      alert('Abra um caixa antes de registrar sangria.')
      return
    }

    const valor = Number(valorSangria || 0)

    if (valor <= 0) {
      alert('Informe um valor válido para a sangria.')
      return
    }

    if (valor > resumo.saldoFinal) {
      alert('A sangria não pode ser maior que o saldo do caixa.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.from('financeiro').insert([
        {
          tipo: 'saida',
          categoria: 'sangria',
          descricao: motivoSangria || 'Sangria de caixa',
          valor,
          origem: 'caixa',
          caixa_id: caixaAberto.id
        }
      ])

      if (error) {
        console.error(error)
        alert('Erro ao registrar sangria: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: 'sangria',
        modulo: 'caixa',
        descricao: `Sangria realizada no valor de ${formatarMoeda(valor)}`,
        valor,
        referencia_id: caixaAberto.id
      })

      setValorSangria('')
      setMotivoSangria('')
      await buscarMovimentacoes(caixaAberto.id)
    } finally {
      setSalvando(false)
    }
  }

  async function registrarSuprimento() {
    if (!caixaAberto) {
      alert('Abra um caixa antes de registrar suprimento.')
      return
    }

    const valor = Number(valorSuprimento || 0)

    if (valor <= 0) {
      alert('Informe um valor válido para o suprimento.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase.from('financeiro').insert([
        {
          tipo: 'entrada',
          categoria: 'suprimento',
          descricao: motivoSuprimento || 'Suprimento de caixa',
          valor,
          origem: 'caixa',
          caixa_id: caixaAberto.id
        }
      ])

      if (error) {
        console.error(error)
        alert('Erro ao registrar suprimento: ' + error.message)
        return
      }

      await registrarAuditoria({
        tipo: 'suprimento',
        modulo: 'caixa',
        descricao: `Suprimento realizado no valor de ${formatarMoeda(valor)}`,
        valor,
        referencia_id: caixaAberto.id
      })

      setValorSuprimento('')
      setMotivoSuprimento('')
      await buscarMovimentacoes(caixaAberto.id)
    } finally {
      setSalvando(false)
    }
  }

  const resumo = useMemo(() => {
    const abertura = Number(caixaAberto?.valor_abertura || 0)
    let entradas = 0
    let saidas = 0

    movimentacoes.forEach((mov) => {
      const valor = Number(mov.valor || 0)

      if (mov.tipo === 'entrada') entradas += valor
      if (mov.tipo === 'saida') saidas += valor
    })

    return {
      abertura,
      entradas,
      saidas,
      saldoFinal: abertura + entradas - saidas
    }
  }, [caixaAberto, movimentacoes])

  const movimentacoesFiltradas = movimentacoes.filter((mov) => {
    const texto = String(busca || '').toLowerCase()

    return (
      String(mov.descricao || '').toLowerCase().includes(texto) ||
      String(mov.categoria || '').toLowerCase().includes(texto) ||
      String(mov.origem || '').toLowerCase().includes(texto)
    )
  })

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Wallet size={22} />
            Controle de Caixa
          </h1>

          <p className="text-sm text-gray-500">
            Abertura, fechamento, sangria e suprimento do PDV
          </p>

        </div>

        <button
          onClick={carregarDados}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <CardResumo
          titulo="Abertura"
          valor={formatarMoeda(resumo.abertura)}
          icon={<DollarSign size={20} />}
          cor="blue"
        />

        <CardResumo
          titulo="Entradas"
          valor={formatarMoeda(resumo.entradas)}
          icon={<TrendingUp size={20} />}
          cor="green"
        />

        <CardResumo
          titulo="Saídas"
          valor={formatarMoeda(resumo.saidas)}
          icon={<TrendingDown size={20} />}
          cor="red"
        />

        <CardResumo
          titulo="Saldo esperado"
          valor={formatarMoeda(resumo.saldoFinal)}
          icon={<Wallet size={20} />}
          cor="green"
        />

      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <div className="flex items-center justify-between mb-4">

            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              {caixaAberto ? <Unlock size={18} /> : <Lock size={18} />}
              {caixaAberto ? 'Fechamento de Caixa' : 'Abertura de Caixa'}
            </h2>

            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                caixaAberto
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {caixaAberto ? 'Aberto' : 'Fechado'}
            </span>

          </div>

          {!caixaAberto ? (
            <div className="space-y-3">

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Valor inicial
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorAbertura}
                  onChange={(e) => setValorAbertura(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

              </div>

              <button
                onClick={abrirCaixa}
                disabled={salvando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm"
              >
                {salvando ? 'Abrindo...' : 'Abrir Caixa'}
              </button>

            </div>
          ) : (
            <div className="space-y-3">

              <div className="text-sm text-gray-500">
                Aberto em
              </div>

              <div className="font-medium text-gray-800">
                {formatarDataHora(caixaAberto.criado_em)}
              </div>

              <div className="text-sm text-gray-500">
                Saldo do sistema
              </div>

              <div className="text-2xl font-bold text-green-600">
                {formatarMoeda(resumo.saldoFinal)}
              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Valor contado no caixa
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorFechamento}
                  onChange={(e) => setValorFechamento(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

              </div>

              {valorFechamento !== '' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm">

                  Diferença:{' '}

                  <span
                    className={
                      Number(valorFechamento || 0) - resumo.saldoFinal === 0
                        ? 'text-green-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {formatarMoeda(Number(valorFechamento || 0) - resumo.saldoFinal)}
                  </span>

                </div>
              )}

              <textarea
                value={observacaoFechamento}
                onChange={(e) => setObservacaoFechamento(e.target.value)}
                placeholder="Observação do fechamento"
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none resize-none"
              />

              <button
                onClick={fecharCaixa}
                disabled={salvando}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm"
              >
                {salvando ? 'Fechando...' : 'Fechar Caixa'}
              </button>

            </div>
          )}

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowDownCircle size={18} />
            Sangria
          </h2>

          <div className="space-y-3">

            <input
              type="number"
              min="0"
              step="0.01"
              value={valorSangria}
              onChange={(e) => setValorSangria(e.target.value)}
              placeholder="Valor"
              disabled={!caixaAberto || salvando}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none disabled:bg-gray-100"
            />

            <input
              value={motivoSangria}
              onChange={(e) => setMotivoSangria(e.target.value)}
              placeholder="Motivo"
              disabled={!caixaAberto || salvando}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none disabled:bg-gray-100"
            />

            <button
              onClick={registrarSangria}
              disabled={!caixaAberto || salvando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-xl py-3 text-sm"
            >
              Registrar Sangria
            </button>

          </div>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">

          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ArrowUpCircle size={18} />
            Suprimento
          </h2>

          <div className="space-y-3">

            <input
              type="number"
              min="0"
              step="0.01"
              value={valorSuprimento}
              onChange={(e) => setValorSuprimento(e.target.value)}
              placeholder="Valor"
              disabled={!caixaAberto || salvando}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none disabled:bg-gray-100"
            />

            <input
              value={motivoSuprimento}
              onChange={(e) => setMotivoSuprimento(e.target.value)}
              placeholder="Motivo"
              disabled={!caixaAberto || salvando}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none disabled:bg-gray-100"
            />

            <button
              onClick={registrarSuprimento}
              disabled={!caixaAberto || salvando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl py-3 text-sm"
            >
              Registrar Suprimento
            </button>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <div className="flex items-center justify-between gap-4">

              <div>

                <h2 className="font-semibold text-gray-800">
                  Movimentações do Caixa Atual
                </h2>

                <p className="text-sm text-gray-500">
                  Vendas, suprimentos e sangrias vinculados ao caixa aberto
                </p>

              </div>

              <div className="w-72 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

                <Search size={16} className="text-gray-400" />

                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 text-sm outline-none"
                />

              </div>

            </div>

          </div>

          <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">

            {carregando ? (
              <div className="p-6 text-center text-gray-400">
                Carregando...
              </div>
            ) : !caixaAberto ? (
              <div className="p-6 text-center text-gray-400">
                Nenhum caixa aberto.
              </div>
            ) : movimentacoesFiltradas.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                Nenhuma movimentação encontrada neste caixa.
              </div>
            ) : (
              movimentacoesFiltradas.map((mov) => (
                <div
                  key={`${mov.categoria}-${mov.id}`}
                  className="p-5 flex items-center justify-between"
                >

                  <div>

                    <p className="font-medium text-gray-800">
                      {mov.descricao}
                    </p>

                    <p className="text-sm text-gray-500">
                      {mov.categoria} • {mov.origem} • {formatarDataHora(mov.criado_em)}
                    </p>

                  </div>

                  <span
                    className={`font-semibold ${
                      mov.tipo === 'entrada'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {mov.tipo === 'entrada' ? '+ ' : '- '}
                    {formatarMoeda(mov.valor)}
                  </span>

                </div>
              ))
            )}

          </div>

        </div>

        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <History size={18} />
              Histórico
            </h2>

            <p className="text-sm text-gray-500">
              Últimos caixas abertos/fechados
            </p>

          </div>

          <div className="divide-y divide-gray-100 max-h-[520px] overflow-y-auto">

            {historico.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                Nenhum caixa encontrado.
              </div>
            ) : (
              historico.map((caixa) => {
                const fechado = caixa.status === 'fechado'
                const diferenca = Number(caixa.diferenca || 0)

                return (
                  <div key={caixa.id} className="p-5">

                    <div className="flex items-center justify-between mb-2">

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          fechado
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {caixa.status}
                      </span>

                      {fechado && diferenca !== 0 && (
                        <AlertTriangle size={16} className="text-orange-500" />
                      )}

                    </div>

                    <p className="text-sm text-gray-500">
                      Aberto: {formatarDataHora(caixa.criado_em)}
                    </p>

                    {caixa.fechado_em && (
                      <p className="text-sm text-gray-500">
                        Fechado: {formatarDataHora(caixa.fechado_em)}
                      </p>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">

                      <div>
                        <p className="text-gray-400">Abertura</p>
                        <p className="font-medium">{formatarMoeda(caixa.valor_abertura)}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Fechamento</p>
                        <p className="font-medium">{formatarMoeda(caixa.valor_fechamento)}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Esperado</p>
                        <p className="font-medium">{formatarMoeda(caixa.valor_esperado)}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Diferença</p>
                        <p
                          className={`font-medium ${
                            diferenca === 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatarMoeda(diferenca)}
                        </p>
                      </div>

                    </div>

                  </div>
                )
              })
            )}

          </div>

        </div>

      </div>

    </div>
  )
}

function CardResumo({ titulo, valor, icon, cor }) {
  const cores = {
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600'
  }

  const textos = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm text-gray-500">
            {titulo}
          </p>

          <h2 className={`text-xl font-bold mt-1 ${textos[cor]}`}>
            {valor}
          </h2>

        </div>

        <div className={`p-2 rounded-xl ${cores[cor]}`}>
          {icon}
        </div>

      </div>

    </div>
  )
}
