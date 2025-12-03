import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface RegistroHistorico {
  processo_id: string
  cityhall_id: string
  usuario_id: string
  usuario_nome: string
  aba: 'geral' | 'financeiro' | 'notas_fiscais'
  acao: 'criou' | 'alterou' | 'deletou'
  campo_alterado?: string
  valor_anterior?: any
  valor_novo?: any
  descricao: string
}

/**
 * Registra uma alteração no histórico do processo
 */
export async function registrarHistorico(registro: RegistroHistorico) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar se a tabela existe
    const { error: checkError } = await supabase
      .from('processo_historico')
      .select('id')
      .limit(1)
      .maybeSingle()

    // Se a tabela não existir, apenas logar e retornar sucesso
    if (checkError && (
      checkError.message.includes('not found') || 
      checkError.message.includes('does not exist') ||
      checkError.message.includes('schema cache')
    )) {
      console.log('Tabela processo_historico não existe - histórico não será registrado')
      return { success: true, message: 'Histórico não disponível' }
    }

    const { error } = await supabase
      .from('processo_historico')
      .insert({
        processo_id: registro.processo_id,
        cityhall_id: registro.cityhall_id,
        usuario_id: registro.usuario_id,
        usuario_nome: registro.usuario_nome,
        aba: registro.aba,
        acao: registro.acao,
        campo_alterado: registro.campo_alterado || null,
        valor_anterior: registro.valor_anterior ? JSON.stringify(registro.valor_anterior) : null,
        valor_novo: registro.valor_novo ? JSON.stringify(registro.valor_novo) : null,
        descricao: registro.descricao,
        criado_em: new Date().toISOString()
      })

    if (error) {
      console.error('Erro ao registrar histórico:', error)
      return { success: false, message: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Erro ao registrar histórico:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Gera descrição legível para alterações de campos
 */
export function gerarDescricaoAlteracao(
  campo: string,
  valorAnterior: any,
  valorNovo: any
): string {
  const nomeCampo = formatarNomeCampo(campo)
  
  if (valorAnterior === null || valorAnterior === undefined) {
    return `Definiu ${nomeCampo} como "${valorNovo}"`
  }
  
  if (valorNovo === null || valorNovo === undefined) {
    return `Removeu ${nomeCampo} (era "${valorAnterior}")`
  }
  
  return `Alterou ${nomeCampo} de "${valorAnterior}" para "${valorNovo}"`
}

/**
 * Formata nome do campo para exibição
 */
function formatarNomeCampo(campo: string): string {
  const mapeamento: Record<string, string> = {
    numero_processo: 'número do processo',
    tipo: 'tipo',
    status: 'status',
    descricao: 'descrição',
    data_abertura: 'data de abertura',
    data_encerramento: 'data de encerramento',
    valor_total: 'valor total',
    valor_pago: 'valor pago',
    numero_nota: 'número da nota',
    data_emissao: 'data de emissão',
    data_vencimento: 'data de vencimento',
    valor: 'valor',
    status_pagamento: 'status de pagamento'
  }
  
  return mapeamento[campo] || campo.replace(/_/g, ' ')
}
