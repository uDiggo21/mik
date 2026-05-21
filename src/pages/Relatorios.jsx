import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../services/supabase'

import {
  Download,
  FileText,
  RefreshCcw,
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  Truck,
  CreditCard,
  Search,
  CalendarDays,
  BarChart3
} from 'lucide-react'

export default function Relatorios() {
  const [dados, setDados] = useState({
    financeiro: [],
    vendas: [],
    produtos: [],
    clientes: [],
    fornecedores: [],
    compras: [],
    fiado: [],
    movimentacoesEstoque: []
  })

  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [periodoFiltro, setPeriodoFiltro] = useState('todos')

  useEffect(() => {
    buscarDados()
  }, [])

  async function buscarDados() {
    setCarregando(true)

    const [
      financeiroRes,
      vendasRes,
      produtosRes,
      clientesRes,
      fornecedoresRes,
      comprasRes,
      fiadoRes,
      movimentacoesRes
    ] = await Promise.all([
      supabase.from('financeiro').select('*').order('data', { ascending: false }),

      supabase
        .from('vendas')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .order('criado_em', { ascending: false }),

      supabase.from('produtos').select('*').order('nome'),

      supabase.from('clientes').select('*').order('nome'),

      supabase.from('fornecedores').select('*').order('nome'),

      supabase
        .from('compras')
        .select(`
          *,
          fornecedores (
            nome
          ),
          produtos (
            nome
          )
        `)
        .order('criado_em', { ascending: false }),

      supabase
        .from('fiado')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .order('criado_em', { ascending: false }),

      supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          produtos (
            nome,
            codigo
          )
        `)
        .order('criado_em', { ascending: false })
    ])

    setDados({
      financeiro: financeiroRes.data || [],
      vendas: vendasRes.data || [],
      produtos: produtosRes.data || [],
      clientes: clientesRes.data || [],
      fornecedores: fornecedoresRes.data || [],
      compras: comprasRes.data || [],
      fiado: fiadoRes.data || [],
      movimentacoesEstoque: movimentacoesRes.data || []
    })

    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function formatarData(data) {
    if (!data) return ''

    return new Date(String(data).slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  function obterData(item) {
    return String(item.data || item.criado_em || '').slice(0, 10)
  }

  function dentroPeriodo(item) {
    if (periodoFiltro === 'todos') return true

    const data = obterData(item)

    if (!data) return false

    const dias = Number(periodoFiltro)
    const hoje = new Date()
    const limite = new Date()

    limite.setDate(hoje.getDate() - dias)

    return new Date(data + 'T00:00:00') >= limite
  }

  const resumo = useMemo(() => {
    const vendasValidas = dados.vendas.filter((venda) => venda.status !== 'cancelada')

    const faturamento = vendasValidas.reduce(
      (acc, venda) => acc + Number(venda.total || 0),
      0
    )

    const entradas = dados.financeiro
      .filter((mov) => mov.tipo === 'entrada')
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const saidas = dados.financeiro
      .filter((mov) => mov.tipo === 'saida')
      .reduce((acc, mov) => acc + Number(mov.valor || 0), 0)

    const estoqueCusto = dados.produtos.reduce((acc, produto) => {
      return acc + Number(produto.estoque_atual || 0) * Number(produto.preco_custo || 0)
    }, 0)

    const fiadoAberto = dados.fiado
      .filter((item) => item.status !== 'pago' && item.status !== 'cancelado')
      .reduce((acc, item) => {
        return acc + Number(item.valor || 0) - Number(item.valor_pago || 0)
      }, 0)

    return {
      faturamento,
      entradas,
      saidas,
      saldo: entradas - saidas,
      estoqueCusto,
      fiadoAberto
    }
  }, [dados])

  const relatorios = useMemo(() => {
    const vendas = dados.vendas.filter(dentroPeriodo).map((venda) => ({
      id: venda.id,
      data: formatarData(venda.criado_em),
      cliente: venda.clientes?.nome || 'Não informado',
      total: venda.total,
      desconto: venda.desconto,
      forma_pagamento: venda.forma_pagamento,
      status: venda.status,
      operador: venda.operador,
      observacao: venda.observacao
    }))

    const financeiro = dados.financeiro.filter(dentroPeriodo).map((mov) => ({
      id: mov.id,
      data: formatarData(mov.data || mov.criado_em),
      tipo: mov.tipo,
      descricao: mov.descricao,
      categoria: mov.categoria,
      origem: mov.origem,
      valor: mov.valor,
      observacao: mov.observacao
    }))

    const produtos = dados.produtos.map((produto) => ({
      id: produto.id,
      codigo: produto.codigo,
      nome: produto.nome,
      unidade: produto.unidade,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      ativo: produto.ativo
    }))

    const compras = dados.compras.filter(dentroPeriodo).map((compra) => ({
      id: compra.id,
      data: formatarData(compra.criado_em),
      fornecedor: compra.fornecedores?.nome || '—',
      produto: compra.produtos?.nome || '—',
      quantidade: compra.quantidade,
      custo_unitario: compra.custo_unitario,
      total: compra.total,
      observacao: compra.observacao
    }))

    const fiado = dados.fiado.filter(dentroPeriodo).map((item) => ({
      id: item.id,
      data: formatarData(item.criado_em),
      cliente: item.clientes?.nome || '—',
      valor: item.valor,
      valor_pago: item.valor_pago,
      valor_aberto: Number(item.valor || 0) - Number(item.valor_pago || 0),
      status: item.status
    }))

    const clientes = dados.clientes.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone,
      email: cliente.email,
      documento: cliente.documento,
      ativo: cliente.ativo
    }))

    const fornecedores = dados.fornecedores.map((fornecedor) => ({
      id: fornecedor.id,
      nome: fornecedor.nome,
      telefone: fornecedor.telefone,
      email: fornecedor.email,
      documento: fornecedor.documento,
      ativo: fornecedor.ativo
    }))

    const kardex = dados.movimentacoesEstoque.filter(dentroPeriodo).map((mov) => ({
      id: mov.id,
      data: formatarData(mov.criado_em),
      produto: mov.produtos?.nome || '—',
      codigo: mov.produtos?.codigo || '—',
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      estoque_anterior: mov.estoque_anterior,
      estoque_atual: mov.estoque_atual,
      referencia: mov.referencia,
      observacao: mov.observacao
    }))

    return {
      vendas,
      financeiro,
      produtos,
      compras,
      fiado,
      clientes,
      fornecedores,
      kardex
    }
  }, [dados, periodoFiltro])

  function exportarCSV(nome, lista) {
    if (!lista.length) {
      alert('Nenhum dado disponível para exportar.')
      return
    }

    const cabecalho = Object.keys(lista[0])

    const linhas = lista.map((item) => {
      return cabecalho
        .map((campo) => {
          const valor = item[campo] ?? ''
          return `"${String(valor).replace(/"/g, '""')}"`
        })
        .join(';')
    })

    const csv = [cabecalho.join(';'), ...linhas].join('\n')

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;'
    })

    const link = document.createElement('a')
    const dataAtual = new Date().toISOString().slice(0, 10)

    link.href = URL.createObjectURL(blob)
    link.download = `${nome}_${dataAtual}.csv`
    link.click()

    URL.revokeObjectURL(link.href)
  }

  function filtrarCards(lista) {
    const texto = String(busca || '').toLowerCase()

    if (!texto) return lista

    return lista.filter((item) => {
      return (
        item.titulo.toLowerCase().includes(texto) ||
        item.descricao.toLowerCase().includes(texto) ||
        item.categoria.toLowerCase().includes(texto)
      )
    })
  }

  const cards = filtrarCards([
    {
      titulo: 'Vendas',
      descricao: 'Histórico completo de vendas, pagamentos e status',
      categoria: 'Comercial',
      quantidade: relatorios.vendas.length,
      icone: <ShoppingCart size={20} />,
      acao: () => exportarCSV('vendas', relatorios.vendas)
    },
    {
      titulo: 'Financeiro',
      descricao: 'Entradas, saídas, categorias, origens e valores',
      categoria: 'Financeiro',
      quantidade: relatorios.financeiro.length,
      icone: <DollarSign size={20} />,
      acao: () => exportarCSV('financeiro', relatorios.financeiro)
    },
    {
      titulo: 'Produtos / Estoque',
      descricao: 'Cadastro de produtos, preços e quantidades atuais',
      categoria: 'Estoque',
      quantidade: relatorios.produtos.length,
      icone: <Package size={20} />,
      acao: () => exportarCSV('produtos_estoque', relatorios.produtos)
    },
    {
      titulo: 'Kardex',
      descricao: 'Movimentações de estoque, entradas, saídas e referências',
      categoria: 'Estoque',
      quantidade: relatorios.kardex.length,
      icone: <BarChart3 size={20} />,
      acao: () => exportarCSV('kardex', relatorios.kardex)
    },
    {
      titulo: 'Compras',
      descricao: 'Entradas de estoque, fornecedores, custos e totais',
      categoria: 'Operacional',
      quantidade: relatorios.compras.length,
      icone: <Truck size={20} />,
      acao: () => exportarCSV('compras', relatorios.compras)
    },
    {
      titulo: 'Fiado',
      descricao: 'Valores em aberto, pagos e pendências por cliente',
      categoria: 'Financeiro',
      quantidade: relatorios.fiado.length,
      icone: <CreditCard size={20} />,
      acao: () => exportarCSV('fiado', relatorios.fiado)
    },
    {
      titulo: 'Clientes',
      descricao: 'Base de clientes cadastrados',
      categoria: 'Cadastros',
      quantidade: relatorios.clientes.length,
      icone: <Users size={20} />,
      acao: () => exportarCSV('clientes', relatorios.clientes)
    },
    {
      titulo: 'Fornecedores',
      descricao: 'Base de fornecedores cadastrados',
      categoria: 'Cadastros',
      quantidade: relatorios.fornecedores.length,
      icone: <Truck size={20} />,
      acao: () => exportarCSV('fornecedores', relatorios.fornecedores)
    }
  ])

  if (carregando) {
    return (
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-gray-500">
          Carregando relatórios...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">

        <div>

          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={22} />
            Relatórios
          </h1>

          <p className="text-sm text-gray-500">
            Exportação gerencial dos principais módulos do ERP
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

      <div className="grid grid-cols-4 gap-4 mb-6">

        <CardResumo titulo="Faturamento" valor={formatarMoeda(resumo.faturamento)} />
        <CardResumo titulo="Saldo financeiro" valor={formatarMoeda(resumo.saldo)} />
        <CardResumo titulo="Fiado aberto" valor={formatarMoeda(resumo.fiadoAberto)} />
        <CardResumo titulo="Estoque a custo" valor={formatarMoeda(resumo.estoqueCusto)} />

      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">

        <div className="grid grid-cols-3 gap-3">

          <div className="col-span-2 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

            <Search size={16} className="text-gray-400" />

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar relatório por nome, categoria ou descrição..."
              className="flex-1 text-sm outline-none text-gray-700"
            />

          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

            <CalendarDays size={16} className="text-gray-400" />

            <select
              value={periodoFiltro}
              onChange={(e) => setPeriodoFiltro(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent text-gray-700"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="todos">Todo período</option>
            </select>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 gap-5">

        {cards.length === 0 ? (
          <div className="col-span-2 bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-400">
            Nenhum relatório encontrado.
          </div>
        ) : (
          cards.map((card) => (
            <button
              key={card.titulo}
              onClick={card.acao}
              className="bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-green-300 hover:shadow-sm transition"
            >

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-start gap-4">

                  <div className="p-3 rounded-xl bg-gray-50 text-green-600">
                    {card.icone}
                  </div>

                  <div>

                    <div className="flex items-center gap-2">

                      <h2 className="font-semibold text-gray-800">
                        {card.titulo}
                      </h2>

                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {card.categoria}
                      </span>

                    </div>

                    <p className="text-sm text-gray-500 mt-1">
                      {card.descricao}
                    </p>

                    <p className="text-xs text-gray-400 mt-3">
                      {card.quantidade} registros disponíveis
                    </p>

                  </div>

                </div>

                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">

                  <Download size={16} />
                  CSV

                </div>

              </div>

            </button>
          ))
        )}

      </div>

    </div>
  )
}

function CardResumo({ titulo, valor }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">

      <p className="text-sm text-gray-500">
        {titulo}
      </p>

      <h2 className="text-xl font-bold text-gray-800 mt-1">
        {valor}
      </h2>

    </div>
  )
}
