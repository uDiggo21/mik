import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Search, DollarSign, Edit } from 'lucide-react'
import { registrarAuditoria } from '../utils/auditoria'

export default function Fiado() {
  const [fiados, setFiados] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)

  const [fiadoSelecionado, setFiadoSelecionado] = useState(null)
  const [valorPagamento, setValorPagamento] = useState('')

  const [formEdicao, setFormEdicao] = useState({
    vencimento: '',
    status: 'pendente',
    observacao: ''
  })

  useEffect(() => {
    buscarFiados()
  }, [])

  async function buscarFiados() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('fiado')
      .select(`
        *,
        clientes (
          nome,
          telefone,
          email
        ),
        vendas (
          total,
          forma_pagamento,
          criado_em
        )
      `)
      .order('criado_em', { ascending: false })

    if (error) console.error(error)

    setFiados(data || [])
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

  function saldoRestante(fiado) {
    return Number(fiado.valor || 0) - Number(fiado.valor_pago || 0)
  }

  function abrirPagamento(fiado) {
    setFiadoSelecionado(fiado)
    setValorPagamento('')
    setModalPagamentoAberto(true)
  }

  function fecharPagamento() {
    setModalPagamentoAberto(false)
    setFiadoSelecionado(null)
    setValorPagamento('')
  }

  function abrirEdicao(fiado) {
    setFiadoSelecionado(fiado)

    setFormEdicao({
      vencimento: fiado.vencimento || '',
      status: fiado.status || 'pendente',
      observacao: fiado.observacao || ''
    })

    setModalEditarAberto(true)
  }

  function fecharEdicao() {
    setModalEditarAberto(false)
    setFiadoSelecionado(null)

    setFormEdicao({
      vencimento: '',
      status: 'pendente',
      observacao: ''
    })
  }

  async function registrarPagamento() {
    if (!fiadoSelecionado) return

    const valor = Number(valorPagamento || 0)

    if (valor <= 0) {
      alert('Informe um valor válido.')
      return
    }

    const restante = saldoRestante(fiadoSelecionado)

    if (valor > restante) {
      alert('O valor pago não pode ser maior que o saldo restante.')
      return
    }

    const novoValorPago = Number(fiadoSelecionado.valor_pago || 0) + valor

    const novoStatus =
      novoValorPago >= Number(fiadoSelecionado.valor || 0)
        ? 'pago'
        : 'pendente'

    const { error: erroFiado } = await supabase
      .from('fiado')
      .update({
        valor_pago: novoValorPago,
        status: novoStatus
      })
      .eq('id', fiadoSelecionado.id)

    if (erroFiado) {
      alert('Erro ao atualizar fiado: ' + erroFiado.message)
      return
    }

    const { error: erroFinanceiro } = await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'entrada',
          descricao: `Pagamento de fiado - ${fiadoSelecionado.clientes?.nome || 'Cliente'}`,
          valor,
          categoria: 'fiado',
          venda_id: fiadoSelecionado.venda_id || null,
          origem: 'fiado'
        }
      ])

    if (erroFinanceiro) {
      alert('Fiado atualizado, mas erro ao lançar no financeiro: ' + erroFinanceiro.message)
      return
    }

    await registrarAuditoria({
      tipo: 'entrada',
      modulo: 'fiado',
      descricao: `Pagamento de fiado recebido de ${fiadoSelecionado.clientes?.nome || 'Cliente'}`,
      valor,
      referencia_id: fiadoSelecionado.id
    })

    await registrarAuditoria({
      tipo: 'entrada',
      modulo: 'financeiro',
      descricao: 'Entrada financeira por pagamento de fiado',
      valor,
      referencia_id: fiadoSelecionado.id
    })

    fecharPagamento()
    buscarFiados()
  }

  async function salvarEdicaoFiado() {
    if (!fiadoSelecionado) return

    const valorTotal = Number(fiadoSelecionado.valor || 0)
    const valorPago = Number(fiadoSelecionado.valor_pago || 0)

    let statusFinal = formEdicao.status

    if (valorPago >= valorTotal) {
      statusFinal = 'pago'
    }

    if (statusFinal === 'pago' && valorPago < valorTotal) {
      const confirmar = confirm(
        'Esse fiado ainda não foi totalmente pago. Deseja marcar como pago mesmo assim?'
      )

      if (!confirmar) return
    }

    const { error } = await supabase
      .from('fiado')
      .update({
        vencimento: formEdicao.vencimento || null,
        status: statusFinal,
        observacao: formEdicao.observacao || null
      })
      .eq('id', fiadoSelecionado.id)

    if (error) {
      alert('Erro ao editar fiado: ' + error.message)
      return
    }

    await registrarAuditoria({
      tipo: 'edição',
      modulo: 'fiado',
      descricao: `Fiado editado para ${fiadoSelecionado.clientes?.nome || 'Cliente'}`,
      valor: fiadoSelecionado.valor,
      referencia_id: fiadoSelecionado.id
    })

    fecharEdicao()
    buscarFiados()
  }

  async function estornarPagamento(fiado) {
    if (Number(fiado.valor_pago || 0) <= 0) {
      alert('Este fiado não possui pagamento para estornar.')
      return
    }

    const confirmar = confirm(
      `Deseja estornar os pagamentos de ${formatarMoeda(fiado.valor_pago)} deste fiado?`
    )

    if (!confirmar) return

    const valorEstornado = Number(fiado.valor_pago || 0)

    const { error: erroFiado } = await supabase
      .from('fiado')
      .update({
        valor_pago: 0,
        status: 'pendente'
      })
      .eq('id', fiado.id)

    if (erroFiado) {
      alert('Erro ao estornar fiado: ' + erroFiado.message)
      return
    }

    await supabase
      .from('financeiro')
      .delete()
      .eq('venda_id', fiado.venda_id)
      .eq('categoria', 'fiado')

    await registrarAuditoria({
      tipo: 'cancelamento',
      modulo: 'fiado',
      descricao: `Pagamento de fiado estornado de ${fiado.clientes?.nome || 'Cliente'}`,
      valor: valorEstornado,
      referencia_id: fiado.id
    })

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'financeiro',
      descricao: 'Estorno financeiro de pagamento de fiado',
      valor: valorEstornado,
      referencia_id: fiado.id
    })

    alert('Pagamentos estornados com sucesso.')
    buscarFiados()
  }

  const fiadosFiltrados = fiados.filter((f) => {
    const textoBusca = String(busca || '').toLowerCase()

    const bateBusca =
      String(f.clientes?.nome || '').toLowerCase().includes(textoBusca) ||
      String(f.clientes?.telefone || '').toLowerCase().includes(textoBusca) ||
      String(f.status || '').toLowerCase().includes(textoBusca)

    const bateStatus = filtroStatus === 'todos' || f.status === filtroStatus

    return bateBusca && bateStatus
  })

  const totalFiado = fiados.reduce((acc, f) => acc + Number(f.valor || 0), 0)
  const totalPago = fiados.reduce((acc, f) => acc + Number(f.valor_pago || 0), 0)
  const totalAberto = totalFiado - totalPago
  const qtdPendentes = fiados.filter((f) => f.status !== 'pago').length

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Fiado
          </h1>

          <p className="text-sm text-gray-500">
            Controle de contas pendentes, pagamentos e vencimentos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total vendido fiado
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {formatarMoeda(totalFiado)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total pago
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {formatarMoeda(totalPago)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Em aberto
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {formatarMoeda(totalAberto)}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Pendências
          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {qtdPendentes}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 mb-4">

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-gray-400" />

          <input
            type="text"
            placeholder="Buscar por cliente, telefone ou status..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-700"
          />
        </div>

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="pago">Pagos</option>
          <option value="cancelado">Cancelados</option>
        </select>

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Cliente
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Venda
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
                Vencimento
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
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : fiadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Nenhum fiado encontrado.
                </td>
              </tr>
            ) : (
              fiadosFiltrados.map((f) => {
                const restante = saldoRestante(f)

                return (
                  <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50">

                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {f.clientes?.nome || 'Cliente não informado'}
                      </div>

                      {f.clientes?.telefone && (
                        <div className="text-xs text-gray-400">
                          {f.clientes.telefone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {formatarData(f.criado_em)}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatarMoeda(f.valor)}
                    </td>

                    <td className="px-4 py-3 text-green-600 font-medium">
                      {formatarMoeda(f.valor_pago)}
                    </td>

                    <td className="px-4 py-3 text-red-600 font-medium">
                      {formatarMoeda(restante)}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {formatarData(f.vencimento)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          f.status === 'pago'
                            ? 'bg-green-100 text-green-700'
                            : f.status === 'cancelado'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {f.status === 'pago'
                          ? 'Pago'
                          : f.status === 'cancelado'
                            ? 'Cancelado'
                            : 'Pendente'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">

                        {f.status !== 'pago' && f.status !== 'cancelado' && (
                          <button
                            onClick={() => abrirPagamento(f)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            <DollarSign size={14} />
                            Pagar
                          </button>
                        )}

                        <button
                          onClick={() => abrirEdicao(f)}
                          className="flex items-center gap-1 text-gray-600 hover:text-gray-800 text-xs font-medium"
                        >
                          <Edit size={14} />
                          Editar
                        </button>

                        {Number(f.valor_pago || 0) > 0 && (
                          <button
                            onClick={() => estornarPagamento(f)}
                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                          >
                            Estornar
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                )
              })
            )}
          </tbody>

        </table>
      </div>

      {modalPagamentoAberto && fiadoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">

            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Registrar pagamento
            </h2>

            <div className="space-y-3 mb-4 text-sm">

              <div className="flex justify-between">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium">
                  {fiadoSelecionado.clientes?.nome || '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Valor total</span>
                <span className="font-medium">
                  {formatarMoeda(fiadoSelecionado.valor)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Já pago</span>
                <span className="font-medium text-green-600">
                  {formatarMoeda(fiadoSelecionado.valor_pago)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Restante</span>
                <span className="font-medium text-red-600">
                  {formatarMoeda(saldoRestante(fiadoSelecionado))}
                </span>
              </div>

            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Valor do pagamento
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
                Registrar
              </button>
            </div>

          </div>
        </div>
      )}

      {modalEditarAberto && fiadoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">

            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Editar fiado
            </h2>

            <div className="space-y-3">

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Vencimento
                </label>

                <input
                  type="date"
                  value={formEdicao.vencimento}
                  onChange={(e) => setFormEdicao({ ...formEdicao, vencimento: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Status
                </label>

                <select
                  value={formEdicao.status}
                  onChange={(e) => setFormEdicao({ ...formEdicao, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Observação
                </label>

                <textarea
                  value={formEdicao.observacao}
                  onChange={(e) => setFormEdicao({ ...formEdicao, observacao: e.target.value })}
                  rows="3"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  placeholder="Observações sobre o pagamento..."
                />
              </div>

            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={fecharEdicao}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={salvarEdicaoFiado}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                Salvar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}