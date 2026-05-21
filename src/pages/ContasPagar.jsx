import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Search, DollarSign, CalendarClock, CheckCircle2 } from 'lucide-react'
import { registrarAuditoria } from '../utils/auditoria'

export default function ContasPagar() {
  const [contas, setContas] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const [modalPagamento, setModalPagamento] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState(null)

  const [valorPagamento, setValorPagamento] = useState('')
  const [observacaoPagamento, setObservacaoPagamento] = useState('')

  useEffect(() => {
    buscarContas()
  }, [])

  async function buscarContas() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('contas_pagar')
      .select(`
        *,
        fornecedores (
          nome,
          cnpj,
          telefone
        )
      `)
      .order('vencimento', { ascending: true })

    if (error) {
      console.error(error)
    }

    setContas(data || [])
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

    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function saldoRestante(conta) {
    return Number(conta.valor || 0) - Number(conta.valor_pago || 0)
  }

  function statusConta(conta) {
    const hoje = new Date()
    const vencimento = conta.vencimento
      ? new Date(conta.vencimento + 'T00:00:00')
      : null

    if (conta.status === 'pago') {
      return 'pago'
    }

    if (vencimento && vencimento < hoje) {
      return 'vencido'
    }

    return 'pendente'
  }

  function abrirPagamento(conta) {
    setContaSelecionada(conta)
    setValorPagamento('')
    setObservacaoPagamento('')
    setModalPagamento(true)
  }

  function fecharPagamento() {
    setContaSelecionada(null)
    setValorPagamento('')
    setObservacaoPagamento('')
    setModalPagamento(false)
  }

  async function registrarPagamento() {
    if (!contaSelecionada) return

    const valor = Number(valorPagamento || 0)

    if (valor <= 0) {
      alert('Informe um valor válido.')
      return
    }

    const restante = saldoRestante(contaSelecionada)

    if (valor > restante) {
      alert('O pagamento não pode ser maior que o saldo restante.')
      return
    }

    const novoValorPago =
      Number(contaSelecionada.valor_pago || 0) + valor

    const novoStatus =
      novoValorPago >= Number(contaSelecionada.valor || 0)
        ? 'pago'
        : 'pendente'

    const { error } = await supabase
      .from('contas_pagar')
      .update({
        valor_pago: novoValorPago,
        status: novoStatus,
        data_pagamento:
          novoStatus === 'pago'
            ? new Date().toISOString().slice(0, 10)
            : null,

        observacao: observacaoPagamento || contaSelecionada.observacao
      })
      .eq('id', contaSelecionada.id)

    if (error) {
      alert('Erro ao registrar pagamento: ' + error.message)
      return
    }

    await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'saida',
          descricao: `Pagamento conta a pagar - ${
            contaSelecionada.fornecedores?.nome || 'Fornecedor'
          }`,
          valor,
          categoria: 'conta_pagar',
          origem: 'contas_pagar'
        }
      ])

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'financeiro',
      descricao: `Pagamento de conta a pagar`,
      valor,
      referencia_id: contaSelecionada.id
    })

    await registrarAuditoria({
      tipo: 'edição',
      modulo: 'contas_pagar',
      descricao: `Pagamento registrado para ${
        contaSelecionada.fornecedores?.nome || 'Fornecedor'
      }`,
      valor,
      referencia_id: contaSelecionada.id
    })

    alert('Pagamento registrado com sucesso.')

    fecharPagamento()
    buscarContas()
  }

  const contasFiltradas = contas.filter((conta) => {
    const texto = String(busca || '').toLowerCase()

    const bateBusca =
      String(conta.descricao || '').toLowerCase().includes(texto) ||
      String(conta.fornecedores?.nome || '').toLowerCase().includes(texto)

    const statusAtual = statusConta(conta)

    const bateStatus =
      filtroStatus === 'todos' ||
      filtroStatus === statusAtual

    return bateBusca && bateStatus
  })

  const totalPendente = contas
    .filter((c) => statusConta(c) !== 'pago')
    .reduce((acc, c) => acc + saldoRestante(c), 0)

  const totalPago = contas
    .reduce((acc, c) => acc + Number(c.valor_pago || 0), 0)

  const totalVencido = contas
    .filter((c) => statusConta(c) === 'vencido')
    .reduce((acc, c) => acc + saldoRestante(c), 0)

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Contas a Pagar
          </h1>

          <p className="text-sm text-gray-500">
            Controle de contas, vencimentos e pagamentos
          </p>
        </div>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Total pendente
          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {formatarMoeda(totalPendente)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Total pago
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(totalPago)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">
            Contas vencidas
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(totalVencido)}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 mb-4">

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-gray-400" />

          <input
            type="text"
            placeholder="Buscar descrição ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-700"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="vencido">Vencidos</option>
          <option value="pago">Pagos</option>
        </select>

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Fornecedor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Descrição
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Vencimento
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Valor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Pago
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Restante
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Status
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Ações
              </th>

            </tr>

          </thead>

          <tbody>

            {carregando ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-gray-400"
                >
                  Carregando...
                </td>
              </tr>
            ) : contasFiltradas.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-8 text-gray-400"
                >
                  Nenhuma conta encontrada.
                </td>
              </tr>
            ) : (
              contasFiltradas.map((conta) => {
                const status = statusConta(conta)

                return (
                  <tr
                    key={conta.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >

                    <td className="px-4 py-3">

                      <div className="font-medium text-gray-800">
                        {conta.fornecedores?.nome || 'Fornecedor'}
                      </div>

                      {conta.fornecedores?.cnpj && (
                        <div className="text-xs text-gray-400">
                          {conta.fornecedores.cnpj}
                        </div>
                      )}

                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {conta.descricao}
                    </td>

                    <td className="px-4 py-3">

                      <div className="flex items-center gap-2 text-gray-600">
                        <CalendarClock size={15} />

                        {formatarData(conta.vencimento)}
                      </div>

                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatarMoeda(conta.valor)}
                    </td>

                    <td className="px-4 py-3 text-green-600 font-medium">
                      {formatarMoeda(conta.valor_pago)}
                    </td>

                    <td className="px-4 py-3 text-orange-600 font-medium">
                      {formatarMoeda(saldoRestante(conta))}
                    </td>

                    <td className="px-4 py-3">

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          status === 'pago'
                            ? 'bg-green-100 text-green-700'
                            : status === 'vencido'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {status === 'pago'
                          ? 'Pago'
                          : status === 'vencido'
                            ? 'Vencido'
                            : 'Pendente'}
                      </span>

                    </td>

                    <td className="px-4 py-3">

                      {status !== 'pago' && (
                        <button
                          onClick={() => abrirPagamento(conta)}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          <DollarSign size={14} />
                          Pagar
                        </button>
                      )}

                    </td>

                  </tr>
                )
              })
            )}

          </tbody>

        </table>

      </div>

      {modalPagamento && contaSelecionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">

            <div className="flex items-center gap-2 mb-4">

              <CheckCircle2 className="text-green-600" size={20} />

              <h2 className="text-lg font-semibold text-gray-800">
                Registrar pagamento
              </h2>

            </div>

            <div className="space-y-3 mb-4 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Fornecedor
                </span>

                <span className="font-medium">
                  {contaSelecionada.fornecedores?.nome}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">
                  Valor restante
                </span>

                <span className="font-medium text-orange-600">
                  {formatarMoeda(saldoRestante(contaSelecionada))}
                </span>
              </div>

            </div>

            <div className="space-y-3">

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Valor pagamento
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="0,00"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Observação
                </label>

                <textarea
                  rows="3"
                  value={observacaoPagamento}
                  onChange={(e) => setObservacaoPagamento(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="Observações do pagamento..."
                />
              </div>

            </div>

            <div className="flex gap-3 mt-5">

              <button
                onClick={fecharPagamento}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={registrarPagamento}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                Registrar pagamento
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}