import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Search, AlertTriangle } from 'lucide-react'

export default function Produtos() {
  const [produtos, setProdutos] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState(null)

  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    categoria: '',
    unidade: 'cx',
    preco_custo: '',
    preco_venda: '',
    estoque_atual: '',
    estoque_minimo: '',
    fornecedor_id: '',
    ativo: true
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [produtosRes, fornecedoresRes] = await Promise.all([
      supabase
        .from('produtos')
        .select(`
          *,
          fornecedores (
            nome
          )
        `)
        .order('nome'),

      supabase
        .from('fornecedores')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ])

    if (produtosRes.error) console.error(produtosRes.error)
    if (fornecedoresRes.error) console.error(fornecedoresRes.error)

    setProdutos(produtosRes.data || [])
    setFornecedores(fornecedoresRes.data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      nome: '',
      codigo: '',
      categoria: '',
      unidade: 'cx',
      preco_custo: '',
      preco_venda: '',
      estoque_atual: '',
      estoque_minimo: '',
      fornecedor_id: '',
      ativo: true
    })
  }

  function abrirNovoProduto() {
    setProdutoEditando(null)
    limparForm()
    setModalAberto(true)
  }

  function abrirEditarProduto(p) {
    setProdutoEditando(p)

    setForm({
      nome: p.nome || '',
      codigo: p.codigo || '',
      categoria: p.categoria || '',
      unidade: p.unidade || 'cx',
      preco_custo: p.preco_custo || '',
      preco_venda: p.preco_venda || '',
      estoque_atual: p.estoque_atual || '',
      estoque_minimo: p.estoque_minimo || '',
      fornecedor_id: p.fornecedor_id || '',
      ativo: p.ativo ?? true
    })

    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setProdutoEditando(null)
    limparForm()
  }

  async function salvarProduto() {
    if (!form.nome || !form.preco_venda) {
      alert('Nome e preço de venda são obrigatórios.')
      return
    }

    const dadosProduto = {
      nome: form.nome,
      codigo: form.codigo ? String(form.codigo).trim() : null,
      categoria: form.categoria,
      unidade: form.unidade,
      fornecedor_id: form.fornecedor_id || null,
      preco_custo: parseFloat(form.preco_custo) || 0,
      preco_venda: parseFloat(form.preco_venda) || 0,
      estoque_atual: parseFloat(form.estoque_atual) || 0,
      estoque_minimo: parseFloat(form.estoque_minimo) || 0,
      ativo: form.ativo
    }

    let error

    if (produtoEditando) {
      const resposta = await supabase
        .from('produtos')
        .update(dadosProduto)
        .eq('id', produtoEditando.id)

      error = resposta.error
    } else {
      const resposta = await supabase
        .from('produtos')
        .insert([dadosProduto])

      error = resposta.error
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    fecharModal()
    carregarDados()
  }

  async function alternarStatusProduto(p) {
    const novoStatus = !p.ativo

    if (!novoStatus) {
      const confirmar = confirm(
        `Deseja inativar o produto "${p.nome}"? Ele não será apagado do histórico.`
      )

      if (!confirmar) return
    }

    const { error } = await supabase
      .from('produtos')
      .update({ ativo: novoStatus })
      .eq('id', p.id)

    if (error) {
      alert('Erro ao alterar status: ' + error.message)
      return
    }

    carregarDados()
  }

  const produtosFiltrados = produtos.filter((p) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(p.nome || '').toLowerCase().includes(textoBusca) ||
      String(p.codigo || '').toLowerCase().includes(textoBusca) ||
      String(p.categoria || '').toLowerCase().includes(textoBusca) ||
      String(p.fornecedores?.nome || '').toLowerCase().includes(textoBusca)
    )
  })

  function statusEstoque(p) {
    const estoqueAtual = Number(p.estoque_atual || 0)
    const estoqueMinimo = Number(p.estoque_minimo || 0)

    if (estoqueAtual <= 0) {
      return {
        label: 'Zerado',
        cor: 'bg-red-100 text-red-700'
      }
    }

    if (estoqueAtual <= estoqueMinimo) {
      return {
        label: 'Crítico',
        cor: 'bg-orange-100 text-orange-700'
      }
    }

    return {
      label: 'Normal',
      cor: 'bg-green-100 text-green-700'
    }
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const totalProdutos = produtos.length

  const produtosAtivos = produtos.filter((p) => p.ativo).length

  const estoqueCritico = produtos.filter((p) => {
    const estoqueAtual = Number(p.estoque_atual || 0)
    const estoqueMinimo = Number(p.estoque_minimo || 0)

    return p.ativo && estoqueAtual > 0 && estoqueAtual <= estoqueMinimo
  }).length

  const semEstoque = produtos.filter((p) => {
    return p.ativo && Number(p.estoque_atual || 0) <= 0
  }).length

  const valorEmEstoque = produtos.reduce((acc, p) => {
    if (!p.ativo) return acc

    return acc + Number(p.preco_custo || 0) * Number(p.estoque_atual || 0)
  }, 0)

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800">
            Estoque de Produtos
          </h1>

          <p className="text-sm text-gray-500">
            {totalProdutos} produtos cadastrados
          </p>

        </div>

        <button
          onClick={abrirNovoProduto}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition"
        >
          <Plus size={16} />
          Novo Produto
        </button>

      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {totalProdutos}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Ativos
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {produtosAtivos}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Estoque crítico
          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {estoqueCritico}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Sem estoque
          </div>

          <div className="text-2xl font-semibold text-red-600">
            {semEstoque}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Valor em estoque
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {formatarMoeda(valorEmEstoque)}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-4 w-full max-w-md">

        <Search size={16} className="text-gray-400" />

        <input
          type="text"
          placeholder="Buscar por nome, código de barras, categoria ou fornecedor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="flex-1 text-sm outline-none text-gray-700"
        />

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Produto
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Código barras
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Categoria
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Fornecedor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Quantidade
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Custo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Venda
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque
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
                <td colSpan={10} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-gray-400">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((p) => {
                const status = statusEstoque(p)

                return (
                  <tr
                    key={p.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      !p.ativo ? 'opacity-60' : ''
                    }`}
                  >

                    <td className="px-4 py-3 font-medium text-gray-800">

                      <div className="flex items-center gap-2">

                        {p.ativo &&
                          Number(p.estoque_atual || 0) <= Number(p.estoque_minimo || 0) && (
                            <AlertTriangle size={14} className="text-red-500" />
                          )}

                        {p.nome}

                      </div>

                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {p.codigo || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {p.categoria || '—'}
                    </td>

                    <td className="px-4 py-3 text-gray-500">
                      {p.fornecedores?.nome || '—'}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {Number(p.estoque_atual || 0)} {p.unidade || 'un'}
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {formatarMoeda(p.preco_custo)}
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-800">
                      {formatarMoeda(p.preco_venda)}
                    </td>

                    <td className="px-4 py-3">

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${status.cor}`}
                      >
                        {status.label}
                      </span>

                    </td>

                    <td className="px-4 py-3">

                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          p.ativo
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>

                    </td>

                    <td className="px-4 py-3">

                      <div className="flex items-center gap-3">

                        <button
                          onClick={() => abrirEditarProduto(p)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => alternarStatusProduto(p)}
                          className={`text-xs font-medium ${
                            p.ativo
                              ? 'text-red-600 hover:text-red-800'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {p.ativo ? 'Inativar' : 'Ativar'}
                        </button>

                      </div>

                    </td>

                  </tr>
                )
              })
            )}

          </tbody>

        </table>

      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">

            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              {produtoEditando ? 'Editar Produto' : 'Novo Produto'}
            </h2>

            <div className="grid grid-cols-2 gap-3">

              <div className="col-span-2">

                <label className="text-xs text-gray-500 mb-1 block">
                  Nome do produto *
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Água Mineral 500ml cx24"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Código de barras / SKU
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Ex: 7890000000000"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Categoria
                </label>

                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Ex: Bebidas"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Fornecedor
                </label>

                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.fornecedor_id}
                  onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })}
                >

                  <option value="">Sem fornecedor</option>

                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}

                </select>

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Unidade
                </label>

                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.unidade}
                  onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                >

                  <option value="cx">Caixa (cx)</option>
                  <option value="frd">Fardo (frd)</option>
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilo (kg)</option>
                  <option value="sc">Saco (sc)</option>
                  <option value="lt">Litro (lt)</option>

                </select>

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Preço de custo (R$)
                </label>

                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.preco_custo}
                  onChange={(e) => setForm({ ...form, preco_custo: e.target.value })}
                  placeholder="0,00"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Preço de venda (R$) *
                </label>

                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.preco_venda}
                  onChange={(e) => setForm({ ...form, preco_venda: e.target.value })}
                  placeholder="0,00"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Estoque atual
                </label>

                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.estoque_atual}
                  onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
                  placeholder="0"
                />

              </div>

              <div>

                <label className="text-xs text-gray-500 mb-1 block">
                  Estoque mínimo
                </label>

                <input
                  type="number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                  value={form.estoque_minimo}
                  onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
                  placeholder="0"
                />

              </div>

              <div className="col-span-2 flex items-center gap-2">

                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                />

                <span className="text-sm text-gray-600">
                  Produto ativo
                </span>

              </div>

            </div>

            <div className="flex gap-3 mt-5">

              <button
                onClick={fecharModal}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                onClick={salvarProduto}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700"
              >
                {produtoEditando ? 'Salvar Alterações' : 'Salvar Produto'}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  )
}