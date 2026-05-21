import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Plus,
  RefreshCcw,
  PackageSearch,
  AlertTriangle
} from 'lucide-react'

export default function MovimentacoesEstoque() {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [produtos, setProdutos] = useState([])

  const [busca, setBusca] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [produtoFiltro, setProdutoFiltro] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [modalAberto, setModalAberto] = useState(false)

  const [form, setForm] = useState({
    produto_id: '',
    tipo: 'entrada',
    quantidade: '',
    observacao: ''
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [movimentacoesRes, produtosRes] = await Promise.all([
      supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produtos (
            nome,
            codigo,
            unidade
          )
        `)
        .order('criado_em', { ascending: false }),

      supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ])

    if (movimentacoesRes.error) {
      console.error(movimentacoesRes.error)
      alert('Erro ao carregar movimentações de estoque.')
    }

    if (produtosRes.error) {
      console.error(produtosRes.error)
      alert('Erro ao carregar produtos.')
    }

    setMovimentacoes(movimentacoesRes.data || [])
    setProdutos(produtosRes.data || [])
    setCarregando(false)
  }

  function limparForm() {
    setForm({
      produto_id: '',
      tipo: 'entrada',
      quantidade: '',
      observacao: ''
    })
  }

  function abrirModal() {
    limparForm()
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return

    setModalAberto(false)
    limparForm()
  }

  function formatarData(data) {
    if (!data) return '—'

    return new Date(data).toLocaleString('pt-BR')
  }

  function iconeTipo(tipo) {
    if (tipo === 'entrada') {
      return <ArrowUpCircle size={16} />
    }

    if (tipo === 'saida') {
      return <ArrowDownCircle size={16} />
    }

    return <RotateCcw size={16} />
  }

  function corTipo(tipo) {
    if (tipo === 'entrada') return 'bg-green-100 text-green-700'
    if (tipo === 'saida') return 'bg-red-100 text-red-700'
    return 'bg-blue-100 text-blue-700'
  }

  function labelTipo(tipo) {
    if (tipo === 'entrada') return 'Entrada'
    if (tipo === 'saida') return 'Saída'
    if (tipo === 'ajuste') return 'Ajuste'
    return tipo || '—'
  }

  async function registrarAuditoria(dados) {
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario')) || {}

    await supabase.from('auditoria').insert([
      {
        ...dados,
        usuario: usuarioSalvo.nome || usuarioSalvo.email || 'Sistema'
      }
    ])
  }

  async function registrarAjusteManual() {
    if (!form.produto_id || !form.tipo || !form.quantidade) {
      alert('Produto, tipo e quantidade são obrigatórios.')
      return
    }

    const produto = produtos.find((p) => p.id === form.produto_id)

    if (!produto) {
      alert('Produto inválido.')
      return
    }

    const quantidade = Number(form.quantidade || 0)

    if (quantidade <= 0) {
      alert('A quantidade precisa ser maior que zero.')
      return
    }

    const estoqueAnterior = Number(produto.estoque_atual || 0)

    let estoqueAtual = estoqueAnterior

    if (form.tipo === 'entrada') {
      estoqueAtual = estoqueAnterior + quantidade
    }

    if (form.tipo === 'saida') {
      estoqueAtual = estoqueAnterior - quantidade
    }

    if (form.tipo === 'ajuste') {
      estoqueAtual = quantidade
    }

    if (estoqueAtual < 0) {
      alert('Essa movimentação deixaria o estoque negativo.')
      return
    }

    const confirmar = confirm(
      `Confirmar ${labelTipo(form.tipo).toLowerCase()} de estoque para "${produto.nome}"?\n\nEstoque anterior: ${estoqueAnterior}\nNovo estoque: ${estoqueAtual}`
    )

    if (!confirmar) return

    setSalvando(true)

    const { error: erroProduto } = await supabase
      .from('produtos')
      .update({
        estoque_atual: estoqueAtual
      })
      .eq('id', produto.id)

    if (erroProduto) {
      alert('Erro ao atualizar estoque: ' + erroProduto.message)
      setSalvando(false)
      return
    }

    const { data: movCriada, error: erroMovimentacao } = await supabase
      .from('movimentacoes_estoque')
      .insert([
        {
          produto_id: produto.id,
          tipo: form.tipo,
          quantidade:
            form.tipo === 'ajuste'
              ? Math.abs(estoqueAtual - estoqueAnterior)
              : quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_atual: estoqueAtual,
          referencia: 'ajuste_manual',
          observacao:
            form.observacao ||
            `Ajuste manual realizado no módulo de movimentações`
        }
      ])
      .select()
      .single()

    if (erroMovimentacao) {
      alert(
        'Estoque atualizado, mas houve erro ao registrar movimentação: ' +
          erroMovimentacao.message
      )
      setSalvando(false)
      return
    }

    await registrarAuditoria({
      tipo: form.tipo === 'ajuste' ? 'ajuste' : form.tipo,
      modulo: 'estoque',
      descricao: `${labelTipo(form.tipo)} manual de estoque: ${produto.nome}. Estoque ${estoqueAnterior} → ${estoqueAtual}`,
      referencia_id: movCriada?.id || produto.id
    })

    alert('Movimentação registrada com sucesso.')

    fecharModal()
    await carregarDados()
    setSalvando(false)
  }

  const movimentacoesFiltradas = useMemo(() => {
    const texto = String(busca || '').toLowerCase()

    return movimentacoes.filter((mov) => {
      const bateBusca =
        String(mov.produtos?.nome || '').toLowerCase().includes(texto) ||
        String(mov.produtos?.codigo || '').toLowerCase().includes(texto) ||
        String(mov.tipo || '').toLowerCase().includes(texto) ||
        String(mov.referencia || '').toLowerCase().includes(texto) ||
        String(mov.observacao || '').toLowerCase().includes(texto)

      const bateTipo = tipoFiltro ? mov.tipo === tipoFiltro : true

      const bateProduto = produtoFiltro
        ? mov.produto_id === produtoFiltro
        : true

      return bateBusca && bateTipo && bateProduto
    })
  }, [movimentacoes, busca, tipoFiltro, produtoFiltro])

  const totais = useMemo(() => {
    return movimentacoesFiltradas.reduce(
      (acc, mov) => {
        const quantidade = Number(mov.quantidade || 0)

        if (mov.tipo === 'entrada') acc.entradas += quantidade
        if (mov.tipo === 'saida') acc.saidas += quantidade
        if (mov.tipo === 'ajuste') acc.ajustes += 1

        return acc
      },
      {
        entradas: 0,
        saidas: 0,
        ajustes: 0
      }
    )
  }, [movimentacoesFiltradas])

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <PackageSearch size={22} />
            Movimentações de Estoque
          </h1>

          <p className="text-sm text-gray-500">
            Kardex operacional, entradas, saídas e ajustes manuais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={carregarDados}
            className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm"
          >
            <RefreshCcw size={16} />
            Atualizar
          </button>

          <button
            onClick={abrirModal}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm"
          >
            <Plus size={16} />
            Novo ajuste
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Entradas filtradas</p>
          <h2 className="text-2xl font-bold text-green-600 mt-1">
            {totais.entradas}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Saídas filtradas</p>
          <h2 className="text-2xl font-bold text-red-600 mt-1">
            {totais.saidas}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-sm text-gray-500">Ajustes filtrados</p>
          <h2 className="text-2xl font-bold text-blue-600 mt-1">
            {totais.ajustes}
          </h2>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
            <Search size={16} className="text-gray-400" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por produto, código, tipo, referência..."
              className="flex-1 text-sm outline-none text-gray-700"
            />
          </div>

          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
          </select>

          <select
            value={produtoFiltro}
            onChange={(e) => setProdutoFiltro(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
          >
            <option value="">Todos os produtos</option>

            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Tipo
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Produto
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Código
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Quantidade
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque anterior
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque atual
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Referência
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Observação
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data
              </th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : movimentacoesFiltradas.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            ) : (
              movimentacoesFiltradas.map((mov) => (
                <tr key={mov.id} className="border-b border-gray-100">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${corTipo(
                        mov.tipo
                      )}`}
                    >
                      {iconeTipo(mov.tipo)}
                      {labelTipo(mov.tipo)}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-800">
                    {mov.produtos?.nome || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.produtos?.codigo || '—'}
                  </td>

                  <td className="px-4 py-3">
                    {Number(mov.quantidade || 0)} {mov.produtos?.unidade || ''}
                  </td>

                  <td className="px-4 py-3">
                    {Number(mov.estoque_anterior || 0)}
                  </td>

                  <td className="px-4 py-3 font-medium">
                    {Number(mov.estoque_atual || 0)}
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {mov.referencia || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                    {mov.observacao || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {formatarData(mov.criado_em)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Novo ajuste de estoque
                </h2>

                <p className="text-sm text-gray-500">
                  Use apenas para correções manuais, perdas, avarias ou contagem.
                </p>
              </div>

              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="bg-orange-50 border border-orange-100 text-orange-700 rounded-xl px-3 py-2 text-sm mb-4 flex gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              Ajustes manuais alteram o estoque diretamente e ficam registrados no
              histórico.
            </div>

            <div className="space-y-3">
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
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                >
                  <option value="">Selecione</option>

                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} — estoque atual: {produto.estoque_atual}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Tipo *
                  </label>

                  <select
                    value={form.tipo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tipo: e.target.value
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="ajuste">Definir estoque final</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {form.tipo === 'ajuste'
                      ? 'Novo estoque final *'
                      : 'Quantidade *'}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.quantidade}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        quantidade: e.target.value
                      })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  Observação
                </label>

                <textarea
                  value={form.observacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      observacao: e.target.value
                    })
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                  placeholder="Ex: Perda, avaria, contagem física, correção..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={fecharModal}
                disabled={salvando}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>

              <button
                onClick={registrarAjusteManual}
                disabled={salvando}
                className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                {salvando ? 'Salvando...' : 'Registrar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
