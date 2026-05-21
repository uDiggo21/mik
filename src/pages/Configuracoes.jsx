import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import {
  Save,
  Building2,
  Palette,
  Receipt,
  Database,
  MonitorSmartphone
} from 'lucide-react'

export default function Configuracoes() {
  const [salvando, setSalvando] = useState(false)

  const [config, setConfig] = useState({
    nome_empresa: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    tema: 'claro',
    margem_lucro_padrao: 30,
    pdv_ativo: true
  })

  useEffect(() => {
    carregarConfiguracoes()
  }, [])

  async function carregarConfiguracoes() {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error(error)
      return
    }

    if (data) {
      setConfig(data)
    }
  }

  async function salvarConfiguracoes() {
    setSalvando(true)

    const { data: existente } = await supabase
      .from('configuracoes')
      .select('id')
      .limit(1)
      .single()

    let error

    if (existente) {
      const resposta = await supabase
        .from('configuracoes')
        .update(config)
        .eq('id', existente.id)

      error = resposta.error
    } else {
      const resposta = await supabase
        .from('configuracoes')
        .insert([config])

      error = resposta.error
    }

    setSalvando(false)

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }

    alert('Configurações salvas com sucesso.')
  }

  return (
    <div className="p-6">

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">
          Configurações
        </h1>

        <p className="text-sm text-gray-500">
          Configurações gerais do ERP
        </p>
      </div>

      <div className="space-y-6">

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Building2 size={18} className="text-green-600" />

            <h2 className="font-semibold text-gray-800">
              Empresa
            </h2>
          </div>

          <div className="p-5 grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                Nome da empresa
              </label>

              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.nome_empresa || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    nome_empresa: e.target.value
                  })
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                CNPJ
              </label>

              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.cnpj || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cnpj: e.target.value
                  })
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Telefone
              </label>

              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.telefone || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    telefone: e.target.value
                  })
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                E-mail
              </label>

              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.email || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    email: e.target.value
                  })
                }
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Endereço
              </label>

              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.endereco || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    endereco: e.target.value
                  })
                }
              />
            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Palette size={18} className="text-purple-600" />

            <h2 className="font-semibold text-gray-800">
              Aparência e Sistema
            </h2>
          </div>

          <div className="p-5 grid grid-cols-2 gap-4">

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Tema
              </label>

              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.tema || 'claro'}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    tema: e.target.value
                  })
                }
              >
                <option value="claro">Claro</option>
                <option value="escuro">Escuro</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Margem de lucro padrão (%)
              </label>

              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                value={config.margem_lucro_padrao || 30}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    margem_lucro_padrao: e.target.value
                  })
                }
              />
            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Receipt size={18} className="text-orange-600" />

            <h2 className="font-semibold text-gray-800">
              PDV e Fiscal
            </h2>
          </div>

          <div className="p-5 space-y-4">

            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <div className="font-medium text-gray-800">
                  PDV habilitado
                </div>

                <div className="text-sm text-gray-500">
                  Permitir uso do módulo de vendas/PDV
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.pdv_ativo || false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    pdv_ativo: e.target.checked
                  })
                }
              />
            </div>

            <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Integração fiscal futura
              </div>

              <div className="text-xs text-gray-500">
                Área reservada para emissão de NF-e, SAT, NFC-e e certificados digitais.
              </div>
            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <Database size={18} className="text-blue-600" />

            <h2 className="font-semibold text-gray-800">
              Banco de Dados e Backup
            </h2>
          </div>

          <div className="p-5 space-y-4">

            <div className="border border-gray-200 rounded-lg p-4">
              <div className="font-medium text-gray-800 mb-1">
                Banco atual
              </div>

              <div className="text-sm text-gray-500">
                Supabase PostgreSQL Cloud
              </div>
            </div>

            <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-sm font-medium text-gray-700 mb-1">
                Planejamento futuro
              </div>

              <div className="text-xs text-gray-500">
                Backup automático, exportação Excel/PDF, sincronização local e modo offline.
              </div>
            </div>

          </div>

        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

          <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
            <MonitorSmartphone size={18} className="text-cyan-600" />

            <h2 className="font-semibold text-gray-800">
              Integrações Futuras
            </h2>
          </div>

          <div className="p-5">

            <div className="grid grid-cols-2 gap-4">

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-gray-700 mb-1">
                  Maquininha
                </div>

                <div className="text-xs text-gray-500">
                  Stone, PagSeguro, Mercado Pago, Cielo
                </div>
              </div>

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-gray-700 mb-1">
                  Impressoras
                </div>

                <div className="text-xs text-gray-500">
                  Impressão térmica, cupom e etiquetas
                </div>
              </div>

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-gray-700 mb-1">
                  Código de barras
                </div>

                <div className="text-xs text-gray-500">
                  Scanner e leitura automática
                </div>
              </div>

              <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="font-medium text-gray-700 mb-1">
                  ERP Desktop
                </div>

                <div className="text-xs text-gray-500">
                  Electron + banco local futuramente
                </div>
              </div>

            </div>

          </div>

        </div>

        <div className="flex justify-end">

          <button
            onClick={salvarConfiguracoes}
            disabled={salvando}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            <Save size={16} />

            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>

        </div>

      </div>

    </div>
  )
}