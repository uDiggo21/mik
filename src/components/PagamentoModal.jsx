import {
  useEffect,
  useState
} from 'react'

import {
  X,
  DollarSign,
  CreditCard,
  Wallet
} from 'lucide-react'

export default function PagamentoModal({
  aberto,
  total,
  onFechar,
  onConfirmar
}) {
  const [
    formaPagamento,
    setFormaPagamento
  ] = useState('dinheiro')

  const [
    valorRecebido,
    setValorRecebido
  ] = useState(total)

  useEffect(() => {
    setValorRecebido(total)
  }, [total])

  useEffect(() => {
    function handleKeyDown(e) {
      if (!aberto) return

      if (e.key === 'Escape') {
        onFechar()
      }

      if (e.key === 'F2') {
        e.preventDefault()

        confirmarPagamento()
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [
    aberto,
    formaPagamento,
    valorRecebido
  ])

  if (!aberto) return null

  const troco =
    Number(valorRecebido || 0) -
    Number(total || 0)

  function confirmarPagamento() {
    onConfirmar({
      formaPagamento,
      valorRecebido
    })
  }

  function formatarMoeda(valor) {
    return Number(
      valor || 0
    ).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">

          <div>

            <h2 className="text-xl font-semibold text-gray-800">
              Finalizar venda
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Escolha a forma de pagamento
            </p>

          </div>

          <button
            onClick={onFechar}
            className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center"
          >

            <X size={18} />

          </button>

        </div>

        <div className="p-6">

          <div className="grid grid-cols-3 gap-3 mb-6">

            <button
              onClick={() =>
                setFormaPagamento(
                  'dinheiro'
                )
              }
              className={`
                rounded-2xl
                border
                p-4
                transition

                ${
                  formaPagamento ===
                  'dinheiro'
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200'
                }
              `}
            >

              <div className="flex justify-center mb-2">

                <Wallet
                  size={22}
                  className="text-green-600"
                />

              </div>

              <div className="text-sm font-medium">
                Dinheiro
              </div>

            </button>

            <button
              onClick={() =>
                setFormaPagamento(
                  'pix'
                )
              }
              className={`
                rounded-2xl
                border
                p-4
                transition

                ${
                  formaPagamento ===
                  'pix'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200'
                }
              `}
            >

              <div className="flex justify-center mb-2">

                <DollarSign
                  size={22}
                  className="text-blue-600"
                />

              </div>

              <div className="text-sm font-medium">
                PIX
              </div>

            </button>

            <button
              onClick={() =>
                setFormaPagamento(
                  'cartao'
                )
              }
              className={`
                rounded-2xl
                border
                p-4
                transition

                ${
                  formaPagamento ===
                  'cartao'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200'
                }
              `}
            >

              <div className="flex justify-center mb-2">

                <CreditCard
                  size={22}
                  className="text-purple-600"
                />

              </div>

              <div className="text-sm font-medium">
                Cartão
              </div>

            </button>

          </div>

          <div className="bg-gray-50 rounded-2xl p-5 mb-6">

            <div className="flex items-center justify-between mb-3">

              <span className="text-gray-500">
                Total da venda
              </span>

              <span className="text-2xl font-bold text-green-600">
                {formatarMoeda(total)}
              </span>

            </div>

            {formaPagamento ===
              'dinheiro' && (
              <div>

                <label className="block text-sm text-gray-600 mb-2">
                  Valor recebido
                </label>

                <input
                  autoFocus
                  type="number"
                  value={
                    valorRecebido
                  }
                  onChange={(e) =>
                    setValorRecebido(
                      e.target.value
                    )
                  }
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none"
                />

                <div className="mt-4 flex items-center justify-between">

                  <span className="text-gray-500">
                    Troco
                  </span>

                  <span
                    className={`
                      text-xl
                      font-semibold

                      ${
                        troco >= 0
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }
                    `}
                  >
                    {formatarMoeda(
                      troco
                    )}
                  </span>

                </div>

              </div>
            )}

          </div>

          <button
            onClick={
              confirmarPagamento
            }
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-2xl py-4 text-lg font-medium transition"
          >
            Confirmar pagamento (F2)
          </button>

        </div>

      </div>

    </div>
  )
}