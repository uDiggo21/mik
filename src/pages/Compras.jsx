import { useEffect, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Plus,
  Search,
  PackagePlus,
  Trash2,
  Edit,
  XCircle,
  RefreshCcw
} from 'lucide-react'

import { registrarAuditoria } from '../utils/auditoria'

export default function Compras() {
  const [compras, setCompras] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [produtos, setProdutos] = useState([])

  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [compraEditando, setCompraEditando] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    fornecedor_id: '',
    produto_id: '',
    quantidade: '',
    custo_unitario: '',
    observacao: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [comprasRes, fornecedoresRes, produtosRes] = await Promise.all([
      supabase
        .from('compras')
        .select(`
          *,
          fornecedores (nome),
          produtos (nome, unidade)
        `)
        .order('criado_em', { ascending: false }),

      supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .order('nome'),

      supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ])

    if (comprasRes.error) {
      console.error(comprasRes.error)
      alert('Erro ao carregar compras.')
    }

    if (fornecedoresRes.error) {
      console.error(fornecedoresRes.error)
      alert('Erro ao carregar fornecedores.')
    }

    if (produtosRes.error) {
      console.error(produtosRes.error)
      alert('Erro ao carregar produtos.')
    }

    setCompras(comprasRes.data || [])
    setFornecedores(fornecedoresRes.data || [])
    setProdutos(produtosRes.data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      fornecedor_id: '',
      produto_id: '',
      quantidade: '',
      custo_unitario: '',
      observacao: ''
    })

    setCompraEditando(null)
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

  function abrirEditarCompra(compra) {
    setCompraEditando(compra)

    setForm({
      fornecedor_id: compra.fornecedor_id || '',
      produto_id: compra.produto_id || '',
      quantidade: compra.quantidade || '',
      custo_unitario: compra.custo_unitario || '',
      observacao: compra.observacao || ''
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
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
        'A operação foi concluída, mas houve erro ao registrar a movimentação de estoque: ' +
          error.message
      )
    }
  }

  async function salvarCompra() {
    if (
      !form.fornecedor_id ||
      !form.produto_id ||
      !form.quantidade ||
      !form.custo_unitario
    ) {
      alert('Fornecedor, produto, quantidade e custo são obrigatórios.')
      return
    }

    const quantidade = Number(form.quantidade || 0)
    const custoUnitario = Number(form.custo_unitario || 0)
    const total = quantidade * custoUnitario

    if (quantidade <= 0 || custoUnitario <= 0) {
      alert('Quantidade e custo precisam ser maiores que zero.')
      return
    }

    setSalvando(true)

    try {
      if (compraEditando) {
        await editarCompra(quantidade, custoUnitario, total)
      } else {
        await registrarCompra(quantidade, custoUnitario, total)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function registrarCompra(quantidade, custoUnitario, total) {
    const produto = produtos.find((p) => p.id === form.produto_id)

    if (!produto) {
      alert('Produto inválido.')
      return
    }

    const estoqueAnterior = Number(produto.estoque_atual || 0)
    const novoEstoque = estoqueAnterior + quantidade

    const { data: compraCriada, error: erroCompra } = await supabase
      .from('compras')
      .insert([
        {
          fornecedor_id: form.fornecedor_id,
          produto_id: form.produto_id,
          quantidade,
          custo_unitario: custoUnitario,
          total,
          observacao: form.observacao
        }
      ])
      .select()
      .single()

    if (erroCompra) {
      alert('Erro ao registrar compra: ' + erroCompra.message)
      return
    }

    const { error: erroProduto } = await supabase
      .from('produtos')
      .update({
        estoque_atual: novoEstoque,
        preco_custo: custoUnitario,
        fornecedor_id: form.fornecedor_id
      })
      .eq('id', produto.id)

    if (erroProduto) {
      alert('Compra registrada, mas erro ao atualizar produto: ' + erroProduto.message)
      return
    }

    await registrarMovimentacaoEstoque({
      produtoId: produto.id,
      tipo: 'entrada',
      quantidade,
      estoqueAnterior,
      estoqueAtual: novoEstoque,
      referencia: `compra:${compraCriada.id}`,
      observacao:
        form.observacao ||
        `Entrada de estoque por compra - ${produto.nome}`
    })

    const { error: erroFinanceiro } = await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'saida',
          descricao: `Compra de estoque - ${produto.nome}`,
          valor: total,
          categoria: 'compra_estoque',
          compra_id: compraCriada.id,
          origem: 'compra'
        }
      ])

    if (erroFinanceiro) {
      alert('Compra registrada, mas erro ao lançar financeiro: ' + erroFinanceiro.message)
      return
    }

    await registrarAuditoria({
      tipo: 'criação',
      modulo: 'compras',
      descricao: `Compra registrada: ${produto.nome} (${quantidade})`,
      valor: total,
      referencia_id: compraCriada.id
    })

    await registrarAuditoria({
      tipo: 'entrada',
      modulo: 'estoque',
      descricao: `Entrada de estoque por compra: ${produto.nome}. Estoque ${estoqueAnterior} → ${novoEstoque}`,
      valor: total,
      referencia_id: produto.id
    })

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'financeiro',
      descricao: `Saída financeira por compra de estoque: ${produto.nome}`,
      valor: total,
      referencia_id: compraCriada.id
    })

    alert('Compra registrada com sucesso!')

    limparForm()
    await carregarDados()
  }

  async function editarCompra(quantidadeNova, custoNovo, totalNovo) {
    const produtoNovo = produtos.find((p) => p.id === form.produto_id)
    const produtoAntigo = produtos.find((p) => p.id === compraEditando.produto_id)

    if (!produtoNovo || !produtoAntigo) {
      alert('Produto inválido.')
      return
    }

    const quantidadeAntiga = Number(compraEditando.quantidade || 0)

    if (produtoAntigo.id === produtoNovo.id) {
      const estoqueAnterior = Number(produtoNovo.estoque_atual || 0)
      const estoqueRecalculado = estoqueAnterior - quantidadeAntiga + quantidadeNova

      if (estoqueRecalculado < 0) {
        alert('Não é possível editar: o estoque ficaria negativo.')
        return
      }

      const { error: erroProduto } = await supabase
        .from('produtos')
        .update({
          estoque_atual: estoqueRecalculado,
          preco_custo: custoNovo,
          fornecedor_id: form.fornecedor_id
        })
        .eq('id', produtoNovo.id)

      if (erroProduto) {
        alert('Erro ao atualizar estoque: ' + erroProduto.message)
        return
      }

      await registrarMovimentacaoEstoque({
        produtoId: produtoNovo.id,
        tipo: 'ajuste',
        quantidade: Math.abs(estoqueRecalculado - estoqueAnterior),
        estoqueAnterior,
        estoqueAtual: estoqueRecalculado,
        referencia: `edicao_compra:${compraEditando.id}`,
        observacao: `Ajuste por edição de compra - ${produtoNovo.nome}`
      })
    } else {
      const estoqueAnteriorAntigo = Number(produtoAntigo.estoque_atual || 0)
      const estoqueProdutoAntigo = estoqueAnteriorAntigo - quantidadeAntiga

      if (estoqueProdutoAntigo < 0) {
        alert('Não é possível editar: o estoque do produto antigo ficaria negativo.')
        return
      }

      const estoqueAnteriorNovo = Number(produtoNovo.estoque_atual || 0)
      const estoqueProdutoNovo = estoqueAnteriorNovo + quantidadeNova

      const { error: erroProdutoAntigo } = await supabase
        .from('produtos')
        .update({
          estoque_atual: estoqueProdutoAntigo
        })
        .eq('id', produtoAntigo.id)

      if (erroProdutoAntigo) {
        alert('Erro ao reverter produto antigo: ' + erroProdutoAntigo.message)
        return
      }

      await registrarMovimentacaoEstoque({
        produtoId: produtoAntigo.id,
        tipo: 'saida',
        quantidade: quantidadeAntiga,
        estoqueAnterior: estoqueAnteriorAntigo,
        estoqueAtual: estoqueProdutoAntigo,
        referencia: `edicao_compra:${compraEditando.id}`,
        observacao: `Reversão por troca de produto na compra`
      })

      const { error: erroProdutoNovo } = await supabase
        .from('produtos')
        .update({
          estoque_atual: estoqueProdutoNovo,
          preco_custo: custoNovo,
          fornecedor_id: form.fornecedor_id
        })
        .eq('id', produtoNovo.id)

      if (erroProdutoNovo) {
        alert('Erro ao atualizar produto novo: ' + erroProdutoNovo.message)
        return
      }

      await registrarMovimentacaoEstoque({
        produtoId: produtoNovo.id,
        tipo: 'entrada',
        quantidade: quantidadeNova,
        estoqueAnterior: estoqueAnteriorNovo,
        estoqueAtual: estoqueProdutoNovo,
        referencia: `edicao_compra:${compraEditando.id}`,
        observacao: `Entrada por troca de produto na compra`
      })
    }

    const { error: erroCompra } = await supabase
      .from('compras')
      .update({
        fornecedor_id: form.fornecedor_id,
        produto_id: form.produto_id,
        quantidade: quantidadeNova,
        custo_unitario: custoNovo,
        total: totalNovo,
        observacao: form.observacao
      })
      .eq('id', compraEditando.id)

    if (erroCompra) {
      alert('Erro ao editar compra: ' + erroCompra.message)
      return
    }

    await supabase.from('financeiro').delete().eq('compra_id', compraEditando.id)

    const { error: erroFinanceiro } = await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'saida',
          descricao: `Compra de estoque - ${produtoNovo.nome}`,
          valor: totalNovo,
          categoria: 'compra_estoque',
          compra_id: compraEditando.id,
          origem: 'compra'
        }
      ])

    if (erroFinanceiro) {
      alert('Compra editada, mas erro ao atualizar financeiro: ' + erroFinanceiro.message)
      return
    }

    await registrarAuditoria({
      tipo: 'edição',
      modulo: 'compras',
      descricao: `Compra editada: ${produtoNovo.nome} (${quantidadeNova})`,
      valor: totalNovo,
      referencia_id: compraEditando.id
    })

    await registrarAuditoria({
      tipo: 'ajuste',
      modulo: 'estoque',
      descricao: `Estoque ajustado por edição de compra: ${produtoNovo.nome}`,
      valor: totalNovo,
      referencia_id: compraEditando.id
    })

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'financeiro',
      descricao: `Saída financeira atualizada por edição de compra: ${produtoNovo.nome}`,
      valor: totalNovo,
      referencia_id: compraEditando.id
    })

    alert('Compra editada com sucesso!')

    limparForm()
    await carregarDados()
  }

  async function excluirCompra(compra) {
    const confirmar = confirm(
      `Deseja excluir esta compra de ${compra.produtos?.nome || 'produto'}? O estoque e o financeiro serão revertidos.`
    )

    if (!confirmar) return

    const produto = produtos.find((p) => p.id === compra.produto_id)

    if (!produto) {
      alert('Produto não encontrado para reverter estoque.')
      return
    }

    const estoqueAnterior = Number(produto.estoque_atual || 0)
    const novoEstoque = estoqueAnterior - Number(compra.quantidade || 0)

    if (novoEstoque < 0) {
      alert('Não é possível excluir: o estoque ficaria negativo. Faça um ajuste manual de estoque antes.')
      return
    }

    const { error: erroProduto } = await supabase
      .from('produtos')
      .update({
        estoque_atual: novoEstoque
      })
      .eq('id', produto.id)

    if (erroProduto) {
      alert('Erro ao reverter estoque: ' + erroProduto.message)
      return
    }

    await registrarMovimentacaoEstoque({
      produtoId: produto.id,
      tipo: 'saida',
      quantidade: Number(compra.quantidade || 0),
      estoqueAnterior,
      estoqueAtual: novoEstoque,
      referencia: `exclusao_compra:${compra.id}`,
      observacao: `Saída por exclusão de compra - ${produto.nome}`
    })

    await supabase.from('financeiro').delete().eq('compra_id', compra.id)

    const { error: erroCompra } = await supabase
      .from('compras')
      .delete()
      .eq('id', compra.id)

    if (erroCompra) {
      alert('Erro ao excluir compra: ' + erroCompra.message)
      return
    }

    await registrarAuditoria({
      tipo: 'cancelamento',
      modulo: 'compras',
      descricao: `Compra excluída e estoque revertido: ${compra.produtos?.nome || 'produto'}`,
      valor: compra.total,
      referencia_id: compra.id
    })

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'estoque',
      descricao: `Estoque revertido por exclusão de compra: ${compra.produtos?.nome || 'produto'} (${compra.quantidade})`,
      valor: compra.total,
      referencia_id: compra.produto_id
    })

    alert('Compra excluída e estoque revertido.')

    await carregarDados()
  }

  const comprasFiltradas = compras.filter((c) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(c.fornecedores?.nome || '').toLowerCase().includes(textoBusca) ||
      String(c.produtos?.nome || '').toLowerCase().includes(textoBusca) ||
      String(c.observacao || '').toLowerCase().includes(textoBusca)
    )
  })

  const totalCompras = compras.reduce((acc, c) => acc + Number(c.total || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <PackagePlus size={22} />
            Compras / Entrada de Estoque
          </h1>

          <p className="text-sm text-gray-500">
            Registre, edite e reverta compras de fornecedores
          </p>
        </div>

        <button
          onClick={carregarDados}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
        >
          <RefreshCcw size={16} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Total em compras</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            {formatarMoeda(totalCompras)}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Compras registradas</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            {compras.length}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Fornecedores ativos</p>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">
            {fornecedores.length}
          </h2>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Plus size={18} />
            {compraEditando ? 'Editar entrada de estoque' : 'Nova entrada de estoque'}
          </h2>

          {compraEditando && (
            <button
              onClick={limparForm}
              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
            >
              <XCircle size={15} />
              Cancelar edição
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Fornecedor *
            </label>

            <select
              value={form.fornecedor_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  fornecedor_id: e.target.value
                })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="">Selecione</option>

              {fornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Produto *
            </label>

            <select
              value={form.produto_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  produto_id: e.target.value
                })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="">Selecione</option>

              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — estoque: {p.estoque_atual}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Quantidade *
            </label>

            <input
              type="number"
              min="1"
              value={form.quantidade}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantidade: e.target.value
                })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Custo unitário *
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.custo_unitario}
              onChange={(e) =>
                setForm({
                  ...form,
                  custo_unitario: e.target.value
                })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-3">
          <div className="col-span-3">
            <label className="text-xs text-gray-500 mb-1 block">
              Observação
            </label>

            <input
              value={form.observacao}
              onChange={(e) =>
                setForm({
                  ...form,
                  observacao: e.target.value
                })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
              placeholder="Nota, prazo, condição de compra..."
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={salvarCompra}
              disabled={salvando}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg py-2 text-sm"
            >
              {salvando
                ? 'Salvando...'
                : compraEditando
                  ? 'Salvar edição'
                  : 'Registrar'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
          <Search size={16} className="text-gray-400" />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por fornecedor, produto ou observação..."
            className="flex-1 text-sm outline-none text-gray-700"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Fornecedor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Produto
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Qtd
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Custo Unit.
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Total
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Observação
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
            ) : comprasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  Nenhuma compra registrada.
                </td>
              </tr>
            ) : (
              comprasFiltradas.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-gray-600">
                    {formatarData(c.criado_em)}
                  </td>

                  <td className="px-4 py-3">
                    {c.fornecedores?.nome || '—'}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {c.produtos?.nome || '—'}
                  </td>

                  <td className="px-4 py-3">
                    {c.quantidade} {c.produtos?.unidade || ''}
                  </td>

                  <td className="px-4 py-3">
                    {formatarMoeda(c.custo_unitario)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-red-600">
                    {formatarMoeda(c.total)}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {c.observacao || '—'}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditarCompra(c)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => excluirCompra(c)}
                        className="text-red-600 hover:text-red-800"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
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
