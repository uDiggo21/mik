import { supabase } from '../services/supabase'

export async function registrarAuditoria({
  tipo,
  modulo,
  descricao,
  valor = null,
  referencia_id = null
}) {
  const { error } = await supabase
    .from('auditoria')
    .insert([
      {
        tipo,
        modulo,
        descricao,
        valor,
        referencia_id
      }
    ])

  if (error) {
    console.error('Erro ao registrar auditoria:', error)
  }
}