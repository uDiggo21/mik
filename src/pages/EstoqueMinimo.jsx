import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

import {
  AlertTriangle,
  Package,
  Search,
  Boxes
} from 'lucide-react'

export default function EstoqueMinimo() {
  const [produtos, setProdutos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarProdutos()
  }, [])

  async function buscarProdutos() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('produtos')
      .select(`
        *,
        fornecedores (
          nome
        )
      `)
      .order('nome')

    if (error) {
      console.error(error)
    }

    setProdutos(data || [])
    setCarregando(false)
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  const produtosFiltrados = useMemo(() => {
    return produtos.filter((produto) => {
      const texto = busca.toLowerCase()

      return (
        produto.nome?.toLowerCase().includes(texto) ||
        produto.codigo?.toLowerCase().includes(texto) ||
        produto.categoria?.toLowerCase().includes(texto)
      )
    })
  }, [produtos, busca])

  const produtosCriticos = produtosFiltrados.filter(
    (produto) =>
      Number(produto.estoque_atual || 0) <=
      Number(produto.estoque_minimo || 0)
  )

  const totalCriticos = produtosCriticos.length

  const valorParado = produtosCriticos.reduce((acc, produto) => {
    return (
      acc +
      Number(produto.estoque_atual || 0) *
      Number(produto.preco_custo || 0)
    )
  }, 0)

  return (
    <div className="p-6">

      <div className="mb-6">

        <h1 className="text-xl font-semibold text-gray-800">
          Estoque Mínimo
        </h1>

        <p className="text-sm text-gray-500">
          Produtos abaixo do estoque ideal
        </p>

      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Produtos críticos
            </div>

            <div className="bg-red-100 text-red-600 p-2 rounded-xl">
              <AlertTriangle size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-red-600">
            {totalCriticos}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Total produtos
            </div>

            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <Boxes size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {produtos.length}
          </div>

        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">

          <div className="flex items-center justify-between mb-3">

            <div className="text-sm text-gray-500">
              Valor estoque crítico
            </div>

            <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
              <Package size={18} />
            </div>

          </div>

          <div className="text-2xl font-semibold text-orange-600">
            {formatarMoeda(valorParado)}
          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">

        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">

          <div>

            <h2 className="font-semibold text-gray-800">
              Produtos em alerta
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Produtos abaixo do estoque mínimo configurado
            </p>

          </div>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">

            <Search size={16} className="text-gray-400" />

            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="outline-none text-sm"
            />

          </div>

        </div>

        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">

            <tr>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Produto
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Código
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Categoria
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Fornecedor
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque Atual
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Estoque Mínimo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Situação
              </th>

            </tr>

          </thead>

          <tbody>

            {carregando ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-10 text-gray-400"
                >
                  Carregando...
                </td>
              </tr>
            ) : produtosCriticos.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-10 text-gray-400"
                >
                  Nenhum produto crítico encontrado.
                </td>
              </tr>
            ) : (
              produtosCriticos.map((produto) => (
                <tr
                  key={produto.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >

                  <td className="px-4 py-3">

                    <div className="font-medium text-gray-800">
                      {produto.nome}
                    </div>

                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {produto.codigo || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {produto.categoria || '—'}
                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {produto.fornecedores?.nome || '—'}
                  </td>

                  <td className="px-4 py-3">

                    <span className="font-semibold text-red-600">
                      {produto.estoque_atual}
                    </span>

                  </td>

                  <td className="px-4 py-3 text-gray-500">
                    {produto.estoque_minimo}
                  </td>

                  <td className="px-4 py-3">

                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Reposição necessária
                    </span>

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