import { useEffect, useRef, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Plus,
  Trash2,
  ShoppingCart,
  Search,
  XCircle
} from 'lucide-react'

import PagamentoModal from '../components/PagamentoModal'

export default function Vendas() {
  const [clientes, setClientes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [vendas, setVendas] = useState([])

  const [itens, setItens] = useState([])

  const [clienteId, setClienteId] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [quantidade, setQuantidade] = useState(1)

  const [desconto, setDesconto] = useState('')
  const [observacao, setObservacao] = useState('')
  const [busca, setBusca] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [modalPagamento, setModalPagamento] = useState(false)

  const produtoSelectRef = useRef(null)
  const codigoBarrasRef = useRef(null)

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'F2') {
        e.preventDefault()

        if (itens.length > 0 && !salvando) {
          setModalPagamento(true)
        }
      }

      if (e.key === 'F4') {
        e.preventDefault()
        codigoBarrasRef.current?.focus()
      }

      if (e.key === 'Enter') {
        const elemento = document.activeElement

        if (elemento?.id === 'produto-select') {
          e.preventDefault()
          adicionarProduto()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [itens, produtoId, quantidade, codigoBarras, salvando])

  async function carregarDados() {
    const [clientesRes, produtosRes, vendasRes] = await Promise.all([
      supabase
        .from('clientes')
        .select('*')
        .order('nome'),

      supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome'),

      supabase
        .from('vendas')
        .select(`
          *,
          clientes (
            nome
          ),
          venda_itens (
            *
          )
        `)
        .order('criado_em', {
          ascending: false
        })
    ])

    setClientes(clientesRes.data || [])
    setProdutos(produtosRes.data || [])
    setVendas(vendasRes.data || [])
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

  async function registrarAuditoria(dados) {
    await supabase
      .from('auditoria')
      .insert([dados])
  }

  async function registrarMovimentacaoEstoque({
    produtoId,
    tipo,
    quantidade,
    estoqueAnterior,
    estoqueAtual,
    referencia,
    observacao
  }) {
    const { error } = await supabase
      .from('movimentacoes_estoque')
      .insert([
        {
          produto_id: produtoId,
          tipo,
          quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_atual: estoqueAtual,
          referencia,
          observacao
        }
      ])

    if (error) {
      console.error(error)
      alert(
        'Operação concluída, mas houve erro ao registrar no Kardex: ' +
          error.message
      )
    }
  }

  function adicionarProduto() {
    adicionarProdutoPorId(produtoId)
  }

  function adicionarProdutoPorId(idProduto) {
    if (!idProduto) {
      alert('Selecione um produto.')
      return
    }

    const produto = produtos.find((p) => p.id === idProduto)

    if (!produto) {
      alert('Produto não encontrado.')
      return
    }

    const qtd = Number(quantidade || 1)

    if (qtd <= 0) {
      alert('Quantidade inválida.')
      return
    }

    if (qtd > Number(produto.estoque_atual || 0)) {
      alert('Quantidade maior que o estoque disponível.')
      return
    }

    const itemExistente = itens.find(
      (item) => item.produto_id === produto.id
    )

    if (itemExistente) {
      const novaQuantidade =
        Number(itemExistente.quantidade || 0) + qtd

      if (novaQuantidade > Number(produto.estoque_atual || 0)) {
        alert('Quantidade total maior que o estoque disponível.')
        return
      }

      setItens(
        itens.map((item) =>
          item.produto_id === produto.id
            ? {
                ...item,
                quantidade: novaQuantidade,
                subtotal:
                  novaQuantidade *
                  Number(item.preco_unitario || 0)
              }
            : item
        )
      )
    } else {
      const precoUnitario = Number(produto.preco_venda || 0)

      setItens([
        ...itens,
        {
          produto_id: produto.id,
          nome: produto.nome,
          unidade: produto.unidade || 'UN',
          quantidade: qtd,
          preco_unitario: precoUnitario,
          subtotal: qtd * precoUnitario
        }
      ])
    }

    setProdutoId('')
    setCodigoBarras('')
    setQuantidade(1)

    setTimeout(() => {
      codigoBarrasRef.current?.focus()
    }, 50)
  }

  function buscarProdutoPorCodigo(valorDigitado) {
    const codigo = String(valorDigitado || '').trim()

    if (!codigo) return

    const produto = produtos.find((p) => {
      const codigoPrincipal = String(p.codigo || '').trim()
      const codigoBarrasProduto = String(p.codigo_barras || '').trim()
      const eanProduto = String(p.ean || '').trim()

      return (
        codigoPrincipal === codigo ||
        codigoBarrasProduto === codigo ||
        eanProduto === codigo
      )
    })

    if (!produto) {
      alert('Produto não encontrado pelo código informado.')
      setCodigoBarras('')
      codigoBarrasRef.current?.focus()
      return
    }

    adicionarProdutoPorId(produto.id)
  }

  function removerItem(idProduto) {
    setItens(
      itens.filter((item) => item.produto_id !== idProduto)
    )
  }

  const subtotal = itens.reduce(
    (acc, item) => acc + Number(item.subtotal || 0),
    0
  )

  const valorDesconto = Number(desconto || 0)

  const total = Math.max(subtotal - valorDesconto, 0)

  async function finalizarVenda({
    formaPagamento,
    valorRecebido
  }) {
    if (itens.length === 0) {
      alert('Adicione pelo menos um produto.')
      return
    }

    if (valorDesconto < 0) {
      alert('Desconto inválido.')
      return
    }

    if (valorDesconto > subtotal) {
      alert('O desconto não pode ser maior que o subtotal.')
      return
    }

    if (formaPagamento === 'fiado' && !clienteId) {
      alert('Para vender fiado, selecione um cliente.')
      return
    }

    if (
      formaPagamento === 'dinheiro' &&
      Number(valorRecebido || 0) < Number(total || 0)
    ) {
      alert('Valor recebido menor que o total da venda.')
      return
    }

    setSalvando(true)

    try {
      const { data: caixaAtual, error: erroCaixa } = await supabase
        .from('caixa')
        .select('*')
        .eq('status', 'aberto')
        .order('criado_em', {
          ascending: false
        })
        .limit(1)
        .maybeSingle()

      if (erroCaixa) {
        alert('Erro ao verificar caixa: ' + erroCaixa.message)
        return
      }

      if (!caixaAtual) {
        alert('Nenhum caixa aberto.')
        return
      }

      const usuarioSalvo =
        JSON.parse(localStorage.getItem('usuario')) || {}

      const { data: vendaCriada, error: erroVenda } = await supabase
        .from('vendas')
        .insert([
          {
            cliente_id: clienteId || null,
            total,
            desconto: valorDesconto,
            forma_pagamento: formaPagamento,
            status: 'concluida',
            observacao,
            caixa_id: caixaAtual.id,
            operador: usuarioSalvo.nome || 'Operador'
          }
        ])
        .select()
        .single()

      if (erroVenda) {
        alert('Erro ao criar venda: ' + erroVenda.message)
        return
      }

      for (const item of itens) {
        const { error: erroItem } = await supabase
          .from('venda_itens')
          .insert([
            {
              venda_id: vendaCriada.id,
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              preco_unitario: item.preco_unitario,
              subtotal: item.subtotal
            }
          ])

        if (erroItem) {
          alert('Erro ao salvar item da venda: ' + erroItem.message)
          return
        }

        const produtoAtual = produtos.find(
          (p) => p.id === item.produto_id
        )

        const estoqueAnterior = Number(produtoAtual?.estoque_atual || 0)

        const novoEstoque =
          estoqueAnterior - Number(item.quantidade || 0)

        if (novoEstoque < 0) {
          alert(`Estoque insuficiente para ${item.nome}.`)
          return
        }

        const { error: erroEstoque } = await supabase
          .from('produtos')
          .update({
            estoque_atual: novoEstoque
          })
          .eq('id', item.produto_id)

        if (erroEstoque) {
          alert('Erro ao atualizar estoque: ' + erroEstoque.message)
          return
        }

        await registrarMovimentacaoEstoque({
          produtoId: item.produto_id,
          tipo: 'saida',
          quantidade: Number(item.quantidade || 0),
          estoqueAnterior,
          estoqueAtual: novoEstoque,
          referencia: `venda:${vendaCriada.id}`,
          observacao: `Saída por venda: ${item.nome}`
        })
      }

      if (formaPagamento === 'fiado') {
        const { error: erroFiado } = await supabase
          .from('fiado')
          .insert([
            {
              cliente_id: clienteId,
              venda_id: vendaCriada.id,
              valor: total,
              valor_pago: 0,
              status: 'pendente'
            }
          ])

        if (erroFiado) {
          alert('Erro ao lançar fiado: ' + erroFiado.message)
          return
        }
      } else {
        const { error: erroFinanceiro } = await supabase
          .from('financeiro')
          .insert([
            {
              tipo: 'entrada',
              descricao: 'Venda realizada',
              valor: total,
              categoria: 'venda',
              venda_id: vendaCriada.id,
              origem: formaPagamento,
              observacao: observacao || null
            }
          ])

        if (erroFinanceiro) {
          alert('Erro ao lançar financeiro: ' + erroFinanceiro.message)
          return
        }
      }

      await registrarAuditoria({
        tipo: 'venda',
        modulo: 'vendas',
        descricao: `Venda realizada no valor de ${formatarMoeda(total)}`,
        valor: total,
        referencia_id: vendaCriada.id
      })

      await registrarAuditoria({
        tipo: 'saida',
        modulo: 'estoque',
        descricao: `Saída de estoque por venda ${vendaCriada.id}`,
        valor: total,
        referencia_id: vendaCriada.id
      })

      if (formaPagamento === 'dinheiro') {
        const troco =
          Number(valorRecebido || 0) - Number(total || 0)

        alert(
          `Venda finalizada.\nTroco: ${formatarMoeda(
            troco > 0 ? troco : 0
          )}`
        )
      } else {
        alert(`Venda finalizada via ${formaPagamento}.`)
      }

      setItens([])
      setClienteId('')
      setProdutoId('')
      setCodigoBarras('')
      setQuantidade(1)
      setDesconto('')
      setObservacao('')
      setModalPagamento(false)

      await carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  async function cancelarVenda(venda) {
    if (venda.status === 'cancelada') {
      alert('Essa venda já está cancelada.')
      return
    }

    const confirmar = confirm(
      `Deseja cancelar a venda de ${formatarMoeda(venda.total)}?`
    )

    if (!confirmar) return

    for (const item of venda.venda_itens || []) {
      const produtoAtual = produtos.find(
        (p) => p.id === item.produto_id
      )

      if (produtoAtual) {
        const estoqueAnterior = Number(produtoAtual.estoque_atual || 0)

        const novoEstoque =
          estoqueAnterior + Number(item.quantidade || 0)

        await supabase
          .from('produtos')
          .update({
            estoque_atual: novoEstoque
          })
          .eq('id', item.produto_id)

        await registrarMovimentacaoEstoque({
          produtoId: item.produto_id,
          tipo: 'entrada',
          quantidade: Number(item.quantidade || 0),
          estoqueAnterior,
          estoqueAtual: novoEstoque,
          referencia: `cancelamento_venda:${venda.id}`,
          observacao: `Retorno de estoque por cancelamento de venda`
        })
      }
    }

    await supabase
      .from('financeiro')
      .delete()
      .eq('venda_id', venda.id)

    await supabase
      .from('fiado')
      .delete()
      .eq('venda_id', venda.id)

    await supabase
      .from('vendas')
      .update({
        status: 'cancelada'
      })
      .eq('id', venda.id)

    await registrarAuditoria({
      tipo: 'cancelamento',
      modulo: 'vendas',
      descricao: `Venda cancelada no valor de ${formatarMoeda(
        venda.total
      )}`,
      valor: venda.total,
      referencia_id: venda.id
    })

    await registrarAuditoria({
      tipo: 'entrada',
      modulo: 'estoque',
      descricao: `Retorno de estoque por cancelamento da venda ${venda.id}`,
      valor: venda.total,
      referencia_id: venda.id
    })

    alert('Venda cancelada com sucesso.')

    carregarDados()
  }

  const vendasFiltradas = vendas.filter((v) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(v.clientes?.nome || '')
        .toLowerCase()
        .includes(textoBusca) ||
      String(v.forma_pagamento || '')
        .toLowerCase()
        .includes(textoBusca) ||
      String(v.status || '')
        .toLowerCase()
        .includes(textoBusca)
    )
  })

  return (
    <div className="p-6">

      <PagamentoModal
        aberto={modalPagamento}
        total={total}
        onFechar={() => setModalPagamento(false)}
        onConfirmar={finalizarVenda}
      />

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800">
            PDV / Vendas
          </h1>

          <p className="text-sm text-gray-500">
            Gestão de vendas e movimentações
          </p>

        </div>

      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-5">

          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart size={18} />
            Nova venda
          </h2>

          <div className="grid grid-cols-2 gap-3 mb-4">

            <div>

              <label className="text-xs text-gray-500 mb-1 block">
                Cliente
              </label>

              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              >

                <option value="">
                  Cliente não informado
                </option>

                {clientes.map((cliente) => (
                  <option
                    key={cliente.id}
                    value={cliente.id}
                  >
                    {cliente.nome}
                  </option>
                ))}

              </select>

            </div>

            <div>

              <label className="text-xs text-gray-500 mb-1 block">
                Busca vendas
              </label>

              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

                <Search
                  size={16}
                  className="text-gray-400"
                />

                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar..."
                  className="outline-none text-sm w-full"
                />

              </div>

            </div>

          </div>

          <div className="grid grid-cols-6 gap-3 mb-4">

            <div className="col-span-2">

              <label className="text-xs text-gray-500 mb-1 block">
                Código barras
              </label>

              <input
                ref={codigoBarrasRef}
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    buscarProdutoPorCodigo(e.currentTarget.value)
                  }
                }}
                placeholder="Leia ou digite..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              />

            </div>

            <div className="col-span-2">

              <label className="text-xs text-gray-500 mb-1 block">
                Produto
              </label>

              <select
                ref={produtoSelectRef}
                id="produto-select"
                value={produtoId}
                onChange={(e) => setProdutoId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              >

                <option value="">
                  Selecione um produto
                </option>

                {produtos.map((produto) => (
                  <option
                    key={produto.id}
                    value={produto.id}
                  >
                    {produto.nome} — {formatarMoeda(
                      produto.preco_venda
                    )}{' '}
                    — Estoque:{' '}
                    {produto.estoque_atual}
                  </option>
                ))}

              </select>

            </div>

            <div>

              <label className="text-xs text-gray-500 mb-1 block">
                Quantidade
              </label>

              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
              />

            </div>

            <div className="flex items-end">

              <button
                onClick={adicionarProduto}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-xl text-sm hover:bg-green-700"
              >

                <Plus size={16} />

                Add

              </button>

            </div>

          </div>

          <div className="border border-gray-200 rounded-2xl overflow-hidden">

            <table className="w-full text-sm">

              <thead className="bg-gray-50 border-b border-gray-200">

                <tr>

                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Produto
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Qtd
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Valor
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Subtotal
                  </th>

                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                    Ação
                  </th>

                </tr>

              </thead>

              <tbody>

                {itens.length === 0 ? (
                  <tr>

                    <td
                      colSpan={5}
                      className="text-center py-8 text-gray-400"
                    >
                      Nenhum produto adicionado.
                    </td>

                  </tr>
                ) : (
                  itens.map((item) => (
                    <tr
                      key={item.produto_id}
                      className="border-b border-gray-100"
                    >

                      <td className="px-4 py-3 font-medium text-gray-800">
                        {item.nome}
                      </td>

                      <td className="px-4 py-3">
                        {item.quantidade}{' '}
                        {item.unidade}
                      </td>

                      <td className="px-4 py-3">
                        {formatarMoeda(item.preco_unitario)}
                      </td>

                      <td className="px-4 py-3 font-medium text-green-600">
                        {formatarMoeda(item.subtotal)}
                      </td>

                      <td className="px-4 py-3">

                        <button
                          onClick={() => removerItem(item.produto_id)}
                          className="text-red-600 hover:text-red-800"
                        >

                          <Trash2 size={16} />

                        </button>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

        </div>

        <div className="space-y-6">

          <div className="bg-white border border-gray-200 rounded-2xl p-5">

            <h2 className="font-semibold text-gray-800 mb-4">
              Resumo venda
            </h2>

            <div className="space-y-3 text-sm">

              <div className="flex items-center justify-between">

                <span className="text-gray-500">
                  Subtotal
                </span>

                <span className="font-medium">
                  {formatarMoeda(subtotal)}
                </span>

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Desconto
                </label>

                <input
                  type="number"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Observação
                </label>

                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                />

              </div>

              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">

                <span className="text-lg font-semibold text-gray-800">
                  Total
                </span>

                <span className="text-2xl font-bold text-green-600">
                  {formatarMoeda(total)}
                </span>

              </div>

              <button
                onClick={() => setModalPagamento(true)}
                disabled={salvando || itens.length === 0}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-2xl py-3 transition"
              >
                {salvando ? 'Finalizando...' : 'Finalizar venda (F2)'}
              </button>

            </div>

          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            <div className="px-4 py-3 border-b border-gray-200">

              <h2 className="font-semibold text-gray-800">
                Últimas vendas
              </h2>

            </div>

            <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">

              {vendasFiltradas.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">
                  Nenhuma venda encontrada.
                </div>
              ) : (
                vendasFiltradas.map((venda) => (
                  <div
                    key={venda.id}
                    className="p-4"
                  >

                    <div className="flex items-start justify-between">

                      <div>

                        <div className="font-medium text-gray-800">
                          {venda.clientes?.nome || 'Cliente não informado'}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {formatarData(venda.criado_em)}
                        </div>

                      </div>

                      <div className="text-right">

                        <div className="font-semibold text-green-600">
                          {formatarMoeda(venda.total)}
                        </div>

                        <div className="text-xs text-gray-500 mt-1">
                          {venda.forma_pagamento}
                        </div>

                      </div>

                    </div>

                    <div className="mt-3 flex items-center justify-between">

                      <span
                        className={`
                          px-2
                          py-1
                          rounded-full
                          text-xs
                          font-medium
                          ${
                            venda.status === 'cancelada'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }
                        `}
                      >
                        {venda.status}
                      </span>

                      {venda.status !== 'cancelada' && (
                        <button
                          onClick={() => cancelarVenda(venda)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 text-xs font-medium"
                        >

                          <XCircle size={14} />

                          Cancelar

                        </button>
                      )}

                    </div>

                  </div>
                ))
              )}

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}
