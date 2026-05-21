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
  AlertTriangle
} from 'lucide-react'

export default function Caixa() {
  const [caixaAberto, setCaixaAberto] =
    useState(null)

  const [movimentacoes, setMovimentacoes] =
    useState([])

  const [valorAbertura, setValorAbertura] =
    useState('')

  const [valorFechamento, setValorFechamento] =
    useState('')

  const [valorSangria, setValorSangria] =
    useState('')

  const [valorSuprimento, setValorSuprimento] =
    useState('')

  const [motivoSangria, setMotivoSangria] =
    useState('')

  const [motivoSuprimento, setMotivoSuprimento] =
    useState('')

  const [carregando, setCarregando] =
    useState(true)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    await Promise.all([
      buscarCaixa(),
      buscarMovimentacoes()
    ])
  }

  async function buscarCaixa() {
    const { data } = await supabase
      .from('caixa')
      .select('*')
      .eq('status', 'aberto')
      .order('criado_em', {
        ascending: false
      })
      .limit(1)
      .maybeSingle()

    setCaixaAberto(data || null)
  }

  async function buscarMovimentacoes() {
    setCarregando(true)

    const { data } = await supabase
      .from('financeiro')
      .select('*')
      .order('criado_em', {
        ascending: false
      })
      .limit(50)

    setMovimentacoes(data || [])

    setCarregando(false)
  }

  async function registrarAuditoria(
    dados
  ) {
    await supabase
      .from('auditoria')
      .insert([dados])
  }

  async function abrirCaixa() {
    if (!valorAbertura) {
      alert(
        'Informe o valor inicial.'
      )

      return
    }

    const usuario =
      JSON.parse(
        localStorage.getItem(
          'usuario'
        )
      ) || {}

    const { data, error } =
      await supabase
        .from('caixa')
        .insert([
          {
            usuario_id:
              usuario.id || null,

            valor_abertura:
              Number(
                valorAbertura
              ),

            status: 'aberto'
          }
        ])
        .select()
        .single()

    if (error) {
      console.error(error)

      alert(
        'Erro ao abrir caixa.'
      )

      return
    }

    await registrarAuditoria({
      tipo: 'abertura_caixa',

      modulo: 'caixa',

      descricao: `Caixa aberto com valor inicial de R$ ${Number(
        valorAbertura
      ).toFixed(2)}`,

      valor: Number(
        valorAbertura
      )
    })

    setCaixaAberto(data)

    setValorAbertura('')

    carregarDados()

    alert(
      'Caixa aberto com sucesso.'
    )
  }

  async function fecharCaixa() {
    if (!caixaAberto) return

    const confirmar = confirm(
      'Deseja realmente fechar o caixa?'
    )

    if (!confirmar) return

    const saldoFinal =
      resumo.saldo

    const diferenca =
      Number(
        valorFechamento || 0
      ) - saldoFinal

    const { error } =
      await supabase
        .from('caixa')
        .update({
          status: 'fechado',

          valor_fechamento:
            Number(
              valorFechamento || 0
            ),

          fechado_em:
            new Date().toISOString()
        })
        .eq('id', caixaAberto.id)

    if (error) {
      console.error(error)

      alert(
        'Erro ao fechar caixa.'
      )

      return
    }

    await registrarAuditoria({
      tipo: 'fechamento_caixa',

      modulo: 'caixa',

      descricao: `
Caixa fechado.
Sistema: R$ ${saldoFinal.toFixed(
        2
      )}
Contado: R$ ${Number(
        valorFechamento || 0
      ).toFixed(2)}
Diferença: R$ ${diferenca.toFixed(
        2
      )}
      `,

      valor:
        Number(
          valorFechamento || 0
        )
    })

    setCaixaAberto(null)

    setValorFechamento('')

    carregarDados()

    alert(
      'Caixa fechado com sucesso.'
    )
  }

  async function registrarSangria() {
    if (!valorSangria) {
      alert(
        'Informe o valor da sangria.'
      )

      return
    }

    await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'saida',

          categoria:
            'sangria',

          descricao:
            motivoSangria ||
            'Sangria de caixa',

          valor: Number(
            valorSangria
          ),

          origem: 'caixa'
        }
      ])

    await registrarAuditoria({
      tipo: 'sangria',

      modulo: 'caixa',

      descricao: `Sangria realizada no valor de R$ ${Number(
        valorSangria
      ).toFixed(2)}`,

      valor: Number(
        valorSangria
      )
    })

    setValorSangria('')
    setMotivoSangria('')

    carregarDados()
  }

  async function registrarSuprimento() {
    if (!valorSuprimento) {
      alert(
        'Informe o valor do suprimento.'
      )

      return
    }

    await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'entrada',

          categoria:
            'suprimento',

          descricao:
            motivoSuprimento ||
            'Suprimento de caixa',

          valor: Number(
            valorSuprimento
          ),

          origem: 'caixa'
        }
      ])

    await registrarAuditoria({
      tipo: 'suprimento',

      modulo: 'caixa',

      descricao: `Suprimento realizado no valor de R$ ${Number(
        valorSuprimento
      ).toFixed(2)}`,

      valor: Number(
        valorSuprimento
      )
    })

    setValorSuprimento('')
    setMotivoSuprimento('')

    carregarDados()
  }

  function formatarMoeda(valor) {
    return Number(
      valor || 0
    ).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const resumo = useMemo(() => {
    let entradas = 0
    let saidas = 0

    movimentacoes.forEach((mov) => {
      const valor = Number(
        mov.valor || 0
      )

      if (mov.tipo === 'entrada') {
        entradas += valor
      }

      if (mov.tipo === 'saida') {
        saidas += valor
      }
    })

    return {
      entradas,

      saidas,

      saldo:
        entradas - saidas
    }
  }, [movimentacoes])

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-2xl font-semibold text-gray-800">
          Controle de Caixa
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Gestão operacional do PDV
        </p>

      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <CardResumo
          titulo="Entradas"
          valor={formatarMoeda(
            resumo.entradas
          )}
          cor="green"
          icon={
            <TrendingUp size={18} />
          }
        />

        <CardResumo
          titulo="Saídas"
          valor={formatarMoeda(
            resumo.saidas
          )}
          cor="red"
          icon={
            <TrendingDown size={18} />
          }
        />

        <CardResumo
          titulo="Saldo"
          valor={formatarMoeda(
            resumo.saldo
          )}
          cor="blue"
          icon={
            <DollarSign size={18} />
          }
        />

        <CardResumo
          titulo="Status Caixa"
          valor={
            caixaAberto
              ? 'ABERTO'
              : 'FECHADO'
          }
          cor={
            caixaAberto
              ? 'green'
              : 'red'
          }
          icon={
            <Wallet size={18} />
          }
        />

      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="space-y-6">

          <div className="bg-white rounded-2xl border border-gray-200 p-6">

            <div className="flex items-center gap-2 mb-5">

              {caixaAberto ? (
                <Unlock
                  size={18}
                  className="text-green-600"
                />
              ) : (
                <Lock
                  size={18}
                  className="text-red-600"
                />
              )}

              <h2 className="font-semibold text-gray-800">
                {caixaAberto
                  ? 'Fechamento de Caixa'
                  : 'Abertura de Caixa'}
              </h2>

            </div>

            {!caixaAberto ? (
              <div className="space-y-4">

                <input
                  type="number"
                  placeholder="Valor inicial"
                  value={
                    valorAbertura
                  }
                  onChange={(e) =>
                    setValorAbertura(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <button
                  onClick={
                    abrirCaixa
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3"
                >
                  Abrir Caixa
                </button>

              </div>
            ) : (
              <div className="space-y-4">

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">

                  <div className="text-sm text-gray-500">
                    Saldo do sistema
                  </div>

                  <div className="text-2xl font-semibold text-gray-800 mt-1">
                    {formatarMoeda(
                      resumo.saldo
                    )}
                  </div>

                </div>

                <input
                  type="number"
                  placeholder="Valor contado"
                  value={
                    valorFechamento
                  }
                  onChange={(e) =>
                    setValorFechamento(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <button
                  onClick={
                    fecharCaixa
                  }
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3"
                >
                  Fechar Caixa
                </button>

              </div>
            )}

          </div>

          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-gray-200 p-6">

              <div className="flex items-center gap-2 mb-5">

                <ArrowDownCircle
                  size={18}
                  className="text-orange-500"
                />

                <h2 className="font-semibold text-gray-800">
                  Sangria
                </h2>

              </div>

              <div className="space-y-3">

                <input
                  type="number"
                  placeholder="Valor"
                  value={
                    valorSangria
                  }
                  onChange={(e) =>
                    setValorSangria(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <input
                  type="text"
                  placeholder="Motivo"
                  value={
                    motivoSangria
                  }
                  onChange={(e) =>
                    setMotivoSangria(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <button
                  onClick={
                    registrarSangria
                  }
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3"
                >
                  Registrar
                </button>

              </div>

            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">

              <div className="flex items-center gap-2 mb-5">

                <ArrowUpCircle
                  size={18}
                  className="text-blue-500"
                />

                <h2 className="font-semibold text-gray-800">
                  Suprimento
                </h2>

              </div>

              <div className="space-y-3">

                <input
                  type="number"
                  placeholder="Valor"
                  value={
                    valorSuprimento
                  }
                  onChange={(e) =>
                    setValorSuprimento(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <input
                  type="text"
                  placeholder="Motivo"
                  value={
                    motivoSuprimento
                  }
                  onChange={(e) =>
                    setMotivoSuprimento(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none"
                />

                <button
                  onClick={
                    registrarSuprimento
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
                >
                  Registrar
                </button>

              </div>

            </div>

          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200">

            <h2 className="font-semibold text-gray-800">
              Últimas Movimentações
            </h2>

          </div>

          <div className="divide-y divide-gray-100 max-h-[900px] overflow-y-auto">

            {carregando ? (
              <div className="p-8 text-center text-gray-400">
                Carregando...
              </div>
            ) : movimentacoes.length ===
              0 ? (
              <div className="p-8 text-center text-gray-400">
                Nenhuma movimentação encontrada.
              </div>
            ) : (
              movimentacoes.map(
                (mov) => (
                  <div
                    key={mov.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >

                    <div>

                      <div className="font-medium text-gray-800">
                        {
                          mov.descricao
                        }
                      </div>

                      <div className="text-xs text-gray-500 mt-1">
                        {mov.categoria ||
                          'financeiro'}
                      </div>

                    </div>

                    <div
                      className={`
                        font-semibold

                        ${
                          mov.tipo ===
                          'entrada'
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      `}
                    >
                      {mov.tipo ===
                      'entrada'
                        ? '+ '
                        : '- '}

                      {formatarMoeda(
                        mov.valor
                      )}
                    </div>

                  </div>
                )
              )
            )}

          </div>

        </div>

      </div>

    </div>
  )
}

function CardResumo({
  titulo,
  valor,
  icon,
  cor
}) {
  const cores = {
    green:
      'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    blue:
      'bg-blue-100 text-blue-600'
  }

  const textos = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">

      <div className="flex items-center justify-between mb-3">

        <div className="text-sm text-gray-500">
          {titulo}
        </div>

        <div
          className={`p-2 rounded-xl ${cores[cor]}`}
        >
          {icon}
        </div>

      </div>

      <div
        className={`text-2xl font-semibold ${textos[cor]}`}
      >
        {valor}
      </div>

    </div>
  )
}