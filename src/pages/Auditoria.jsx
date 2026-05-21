import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Search, Clock } from 'lucide-react'

export default function Auditoria() {
  const [eventos, setEventos] = useState([])
  const [busca, setBusca] = useState('')
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarAuditoria()
  }, [])

  async function buscarAuditoria() {
    setCarregando(true)

    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .order('criado_em', { ascending: false })

    if (error) console.error(error)

    setEventos(data || [])
    setCarregando(false)
  }

  function formatarDataHora(data) {
    if (!data) return '—'

    return new Date(data).toLocaleString('pt-BR')
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return '—'

    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  function corModulo(modulo) {
    if (modulo === 'produtos') return 'bg-blue-100 text-blue-700'
    if (modulo === 'financeiro') return 'bg-green-100 text-green-700'
    if (modulo === 'vendas') return 'bg-purple-100 text-purple-700'
    if (modulo === 'compras') return 'bg-orange-100 text-orange-700'
    if (modulo === 'fiado') return 'bg-red-100 text-red-700'
    if (modulo === 'clientes') return 'bg-cyan-100 text-cyan-700'
    if (modulo === 'fornecedores') return 'bg-yellow-100 text-yellow-700'

    return 'bg-gray-100 text-gray-700'
  }

  const eventosFiltrados = eventos.filter((e) => {
    const textoBusca = String(busca || '').toLowerCase()

    const bateBusca =
      String(e.tipo || '').toLowerCase().includes(textoBusca) ||
      String(e.modulo || '').toLowerCase().includes(textoBusca) ||
      String(e.descricao || '').toLowerCase().includes(textoBusca)

    const bateModulo = filtroModulo === 'todos' || e.modulo === filtroModulo

    return bateBusca && bateModulo
  })

  const totalEventos = eventos.length
  const eventosProdutos = eventos.filter((e) => e.modulo === 'produtos').length
  const eventosFinanceiro = eventos.filter((e) => e.modulo === 'financeiro').length
  const eventosVendas = eventos.filter((e) => e.modulo === 'vendas').length

  return (
    <div className="p-6">

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Histórico / Auditoria
          </h1>

          <p className="text-sm text-gray-500">
            Registro de alterações, entradas, saídas e movimentos do ERP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Total de eventos
          </div>

          <div className="text-2xl font-semibold text-gray-800">
            {totalEventos}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Produtos
          </div>

          <div className="text-2xl font-semibold text-blue-600">
            {eventosProdutos}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Financeiro
          </div>

          <div className="text-2xl font-semibold text-green-600">
            {eventosFinanceiro}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">
            Vendas
          </div>

          <div className="text-2xl font-semibold text-purple-600">
            {eventosVendas}
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 mb-4">

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full max-w-md">
          <Search size={16} className="text-gray-400" />

          <input
            type="text"
            placeholder="Buscar por tipo, módulo ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 text-sm outline-none text-gray-700"
          />
        </div>

        <select
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none text-gray-700"
        >
          <option value="todos">Todos</option>
          <option value="produtos">Produtos</option>
          <option value="financeiro">Financeiro</option>
          <option value="vendas">Vendas</option>
          <option value="compras">Compras</option>
          <option value="fiado">Fiado</option>
          <option value="clientes">Clientes</option>
          <option value="fornecedores">Fornecedores</option>
        </select>

      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">

          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Data/Hora
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Módulo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Tipo
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Descrição
              </th>

              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">
                Valor
              </th>
            </tr>
          </thead>

          <tbody>
            {carregando ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : eventosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  Nenhum evento encontrado.
                </td>
              </tr>
            ) : (
              eventosFiltrados.map((evento) => (
                <tr key={evento.id} className="border-b border-gray-100 hover:bg-gray-50">

                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      {formatarDataHora(evento.criado_em)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${corModulo(evento.modulo)}`}
                    >
                      {evento.modulo}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-gray-600">
                    {evento.tipo}
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    {evento.descricao}
                  </td>

                  <td className="px-4 py-3 font-medium text-gray-700">
                    {formatarMoeda(evento.valor)}
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