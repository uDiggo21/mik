import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Upload, Search, FileText, PackageCheck, Link as LinkIcon } from 'lucide-react'
import { registrarAuditoria } from '../utils/auditoria'

export default function ImportacaoNfe() {
  const [importacoes, setImportacoes] = useState([])
  const [produtos, setProdutos] = useState([])
  const [itensSelecionados, setItensSelecionados] = useState([])
  const [importacaoSelecionada, setImportacaoSelecionada] = useState(null)

  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setCarregando(true)

    const [importacoesRes, produtosRes] = await Promise.all([
      supabase
        .from('importacoes_nfe')
        .select('*')
        .order('criado_em', { ascending: false }),

      supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
    ])

    setImportacoes(importacoesRes.data || [])
    setProdutos(produtosRes.data || [])
    setCarregando(false)
  }

  async function carregarItens(importacao) {
    setImportacaoSelecionada(importacao)

    const { data, error } = await supabase
      .from('importacoes_nfe_itens')
      .select(`
        *,
        produtos (
          nome,
          codigo,
          unidade
        )
      `)
      .eq('importacao_id', importacao.id)
      .order('descricao_xml')

    if (error) {
      alert('Erro ao carregar itens: ' + error.message)
      return
    }

    setItensSelecionados(data || [])
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

  function textoTag(xml, tag) {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 'i')
    const match = xml.match(regex)
    return match ? match[1] : ''
  }

  function numero(valor) {
    return Number(String(valor || '0').replace(',', '.')) || 0
  }

  function extrairItensXml(xml) {
    const detRegex = /<det[\s\S]*?<\/det>/gi
    const blocos = xml.match(detRegex) || []

    return blocos.map((bloco) => {
      const prod = bloco.match(/<prod>[\s\S]*?<\/prod>/i)?.[0] || ''
      const imposto = bloco.match(/<imposto>[\s\S]*?<\/imposto>/i)?.[0] || ''

      return {
        codigo_xml: textoTag(prod, 'cProd'),
        descricao_xml: textoTag(prod, 'xProd'),
        ean: textoTag(prod, 'cEAN'),
        quantidade: numero(textoTag(prod, 'qCom')),
        unidade: textoTag(prod, 'uCom'),
        valor_unitario: numero(textoTag(prod, 'vUnCom')),
        valor_total: numero(textoTag(prod, 'vProd')),
        cfop: textoTag(prod, 'CFOP'),
        cst: textoTag(imposto, 'CST') || textoTag(imposto, 'CSOSN'),
        icms: numero(textoTag(imposto, 'vICMS')),
        ipi: numero(textoTag(imposto, 'vIPI')),
        associado: false
      }
    })
  }

  async function importarXml(event) {
    const arquivo = event.target.files?.[0]

    if (!arquivo) return

    setProcessando(true)

    try {
      const xml = await arquivo.text()

      const chave = textoTag(xml, 'chNFe')
      const numeroNota = textoTag(xml, 'nNF')
      const serie = textoTag(xml, 'serie')

      const fornecedorNome = textoTag(xml, 'xNome')
      const fornecedorCnpj = textoTag(xml, 'CNPJ')

      const dataEmissaoBruta = textoTag(xml, 'dhEmi') || textoTag(xml, 'dEmi')
      const dataEmissao = dataEmissaoBruta ? dataEmissaoBruta.slice(0, 10) : null

      const valorProdutos = numero(textoTag(xml, 'vProd'))
      const valorFrete = numero(textoTag(xml, 'vFrete'))
      const valorDesconto = numero(textoTag(xml, 'vDesc'))
      const valorIpi = numero(textoTag(xml, 'vIPI'))
      const valorIcms = numero(textoTag(xml, 'vICMS'))
      const valorTotal = numero(textoTag(xml, 'vNF'))

      const itens = extrairItensXml(xml)

      const { data: importacaoCriada, error: erroImportacao } = await supabase
        .from('importacoes_nfe')
        .insert([
          {
            chave_acesso: chave,
            numero_nota: numeroNota,
            serie,
            fornecedor_nome: fornecedorNome,
            fornecedor_cnpj: fornecedorCnpj,
            data_emissao: dataEmissao,
            valor_produtos: valorProdutos,
            valor_frete: valorFrete,
            valor_desconto: valorDesconto,
            valor_ipi: valorIpi,
            valor_icms: valorIcms,
            valor_total: valorTotal,
            status: 'pendente',
            xml_texto: xml
          }
        ])
        .select()
        .single()

      if (erroImportacao) {
        alert('Erro ao importar NF-e: ' + erroImportacao.message)
        setProcessando(false)
        return
      }

      if (itens.length > 0) {
        const itensParaSalvar = itens.map((item) => ({
          ...item,
          importacao_id: importacaoCriada.id
        }))

        const { error: erroItens } = await supabase
          .from('importacoes_nfe_itens')
          .insert(itensParaSalvar)

        if (erroItens) {
          alert('NF-e importada, mas erro ao salvar itens: ' + erroItens.message)
          setProcessando(false)
          return
        }
      }

      await registrarAuditoria({
        tipo: 'criação',
        modulo: 'nfe',
        descricao: `XML NF-e importado: nota ${numeroNota || 'sem número'} - ${fornecedorNome || 'fornecedor não identificado'}`,
        valor: valorTotal,
        referencia_id: importacaoCriada.id
      })

      alert('XML importado com sucesso!')

      await carregarDados()
      await carregarItens(importacaoCriada)
    } catch (erro) {
      alert('Erro ao processar XML. Verifique se o arquivo é uma NF-e válida.')
      console.error(erro)
    }

    setProcessando(false)
    event.target.value = ''
  }

  async function associarProduto(itemId, produtoId) {
    const { error } = await supabase
      .from('importacoes_nfe_itens')
      .update({
        produto_id: produtoId || null,
        associado: !!produtoId
      })
      .eq('id', itemId)

    if (error) {
      alert('Erro ao associar produto: ' + error.message)
      return
    }

    if (importacaoSelecionada) {
      carregarItens(importacaoSelecionada)
    }
  }

  async function confirmarEntradaEstoque() {
    if (!importacaoSelecionada) return

    const itensSemProduto = itensSelecionados.filter((item) => !item.produto_id)

    if (itensSemProduto.length > 0) {
      alert('Associe todos os itens a produtos antes de confirmar a entrada.')
      return
    }

    const confirmar = confirm(
      `Confirmar entrada de estoque da NF-e ${importacaoSelecionada.numero_nota || ''}?`
    )

    if (!confirmar) return

    for (const item of itensSelecionados) {
      const produto = produtos.find((p) => p.id === item.produto_id)

      if (!produto) continue

      const novoEstoque = Number(produto.estoque_atual || 0) + Number(item.quantidade || 0)

      await supabase
        .from('produtos')
        .update({
          estoque_atual: novoEstoque,
          preco_custo: Number(item.valor_unitario || 0)
        })
        .eq('id', produto.id)

      await registrarAuditoria({
        tipo: 'entrada',
        modulo: 'produtos',
        descricao: `Entrada de estoque via XML NF-e: ${produto.nome} (${item.quantidade})`,
        valor: item.valor_total,
        referencia_id: produto.id
      })
    }

    await supabase
      .from('financeiro')
      .insert([
        {
          tipo: 'saida',
          descricao: `NF-e importada - ${importacaoSelecionada.fornecedor_nome || 'Fornecedor'}`,
          valor: Number(importacaoSelecionada.valor_total || 0),
          categoria: 'compra_nfe',
          origem: 'nfe'
        }
      ])

    await registrarAuditoria({
      tipo: 'saída',
      modulo: 'financeiro',
      descricao: `Conta/saída gerada por importação de NF-e ${importacaoSelecionada.numero_nota || ''}`,
      valor: importacaoSelecionada.valor_total,
      referencia_id: importacaoSelecionada.id
    })

    const { error } = await supabase
      .from('importacoes_nfe')
      .update({
        status: 'confirmada'
      })
      .eq('id', importacaoSelecionada.id)

    if (error) {
      alert('Entrada feita, mas erro ao confirmar NF-e: ' + error.message)
      return
    }

    await registrarAuditoria({
      tipo: 'edição',
      modulo: 'nfe',
      descricao: `NF-e confirmada e entrada de estoque aplicada: ${importacaoSelecionada.numero_nota || ''}`,
      valor: importacaoSelecionada.valor_total,
      referencia_id: importacaoSelecionada.id
    })

    alert('Entrada de estoque confirmada com sucesso.')

    await carregarDados()

    setImportacaoSelecionada({
      ...importacaoSelecionada,
      status: 'confirmada'
    })
  }

  const importacoesFiltradas = importacoes.filter((nfe) => {
    const textoBusca = String(busca || '').toLowerCase()

    return (
      String(nfe.numero_nota || '').toLowerCase().includes(textoBusca) ||
      String(nfe.chave_acesso || '').toLowerCase().includes(textoBusca) ||
      String(nfe.fornecedor_nome || '').toLowerCase().includes(textoBusca) ||
      String(nfe.fornecedor_cnpj || '').toLowerCase().includes(textoBusca) ||
      String(nfe.status || '').toLowerCase().includes(textoBusca)
    )
  })

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Importação XML NF-e
          </h1>

          <p className="text-sm text-gray-500">
            Importe XML, associe produtos e confirme entrada de estoque
          </p>
        </div>

        <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 cursor-pointer">
          <Upload size={16} />
          {processando ? 'Importando...' : 'Importar XML'}
          <input
            type="file"
            accept=".xml,text/xml"
            onChange={importarXml}
            disabled={processando}
            className="hidden"
          />
        </label>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            XMLs importados
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {importacoes.length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Pendentes
          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {importacoes.filter((n) => n.status === 'pendente').length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Confirmadas
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {importacoes.filter((n) => n.status === 'confirmada').length}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Valor total
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {formatarMoeda(
              importacoes.reduce((acc, n) => acc + Number(n.valor_total || 0), 0)
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-5 gap-6">

        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={17} className="text-green-600" />

              <h2 className="font-semibold text-gray-800">
                NF-e importadas
              </h2>
            </div>

            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Search size={16} className="text-gray-400" />

              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nota, fornecedor ou chave..."
                className="flex-1 text-sm outline-none text-gray-700"
              />
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto">
            {carregando ? (
              <div className="p-6 text-center text-gray-400">
                Carregando...
              </div>
            ) : importacoesFiltradas.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                Nenhuma NF-e importada.
              </div>
            ) : (
              importacoesFiltradas.map((nfe) => (
                <button
                  key={nfe.id}
                  onClick={() => carregarItens(nfe)}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 ${
                    importacaoSelecionada?.id === nfe.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-800">
                      NF {nfe.numero_nota || '—'}
                    </div>

                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        nfe.status === 'confirmada'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {nfe.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-1">
                    {nfe.fornecedor_nome || 'Fornecedor não identificado'}
                  </div>

                  <div className="text-xs text-gray-400">
                    {formatarData(nfe.data_emissao)} • {formatarMoeda(nfe.valor_total)}
                  </div>
                </button>
              ))
            )}
          </div>

        </div>

        <div className="col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">

          {!importacaoSelecionada ? (
            <div className="p-10 text-center text-gray-400">
              Selecione uma NF-e importada para visualizar os itens.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">

                <div>
                  <h2 className="font-semibold text-gray-800">
                    NF-e {importacaoSelecionada.numero_nota || '—'}
                  </h2>

                  <p className="text-xs text-gray-500 mt-1">
                    {importacaoSelecionada.fornecedor_nome || 'Fornecedor'} • {formatarMoeda(importacaoSelecionada.valor_total)}
                  </p>
                </div>

                <button
                  onClick={confirmarEntradaEstoque}
                  disabled={importacaoSelecionada.status === 'confirmada'}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  <PackageCheck size={16} />
                  {importacaoSelecionada.status === 'confirmada'
                    ? 'Entrada confirmada'
                    : 'Confirmar entrada'}
                </button>

              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">

                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Produto XML
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Qtd
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Unit.
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Total
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        CFOP/CST
                      </th>

                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                        Produto do estoque
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {itensSelecionados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">
                          Nenhum item encontrado no XML.
                        </td>
                      </tr>
                    ) : (
                      itensSelecionados.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">

                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">
                              {item.descricao_xml || 'Produto sem descrição'}
                            </div>

                            <div className="text-xs text-gray-400">
                              Código: {item.codigo_xml || '—'} • EAN: {item.ean || '—'}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-gray-600">
                            {item.quantidade} {item.unidade}
                          </td>

                          <td className="px-4 py-3">
                            {formatarMoeda(item.valor_unitario)}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {formatarMoeda(item.valor_total)}
                          </td>

                          <td className="px-4 py-3 text-gray-500">
                            {item.cfop || '—'} / {item.cst || '—'}
                          </td>

                          <td className="px-4 py-3 min-w-[240px]">
                            <div className="flex items-center gap-2">
                              <LinkIcon size={14} className="text-gray-400" />

                              <select
                                value={item.produto_id || ''}
                                disabled={importacaoSelecionada.status === 'confirmada'}
                                onChange={(e) => associarProduto(item.id, e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs outline-none focus:border-green-500 disabled:bg-gray-100"
                              >
                                <option value="">Associar produto</option>

                                {produtos.map((produto) => (
                                  <option key={produto.id} value={produto.id}>
                                    {produto.nome} — estoque: {produto.estoque_atual}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>

                </table>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  )
}