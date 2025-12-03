import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: 'Supabase não configurado' },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar estatísticas de licitações
    const { data: licitacoes, error: licitacoesError } = await supabase
      .from('processos_administrativos')
      .select('status, modalidade, secretaria, valor_estimado')

    if (licitacoesError) {
      console.error('Erro ao buscar licitações:', licitacoesError)
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar dados' },
        { status: 500 }
      )
    }

    // Calcular estatísticas
    const stats = {
      licitacoes_abertas: licitacoes?.filter(l => l.status === 'aberta').length || 0,
      licitacoes_andamento: licitacoes?.filter(l => l.status === 'em_andamento').length || 0,
      licitacoes_concluidas: licitacoes?.filter(l => l.status === 'concluida').length || 0,
      contratos_vigentes: licitacoes?.filter(l => l.status === 'vigente').length || 0,
      contratos_encerrados: licitacoes?.filter(l => l.status === 'encerrado').length || 0,
      contratos_vencer_90dias: 0, // Implementar lógica de data se necessário
      valor_total: licitacoes?.reduce((sum, l) => sum + (parseFloat(l.valor_estimado) || 0), 0) || 0,
      saldo_remanescente: 0 // Implementar lógica de cálculo se necessário
    }

    // Agrupar por modalidade
    const modalidadeMap = new Map()
    licitacoes?.forEach(l => {
      const modalidade = l.modalidade || 'Não especificada'
      modalidadeMap.set(modalidade, (modalidadeMap.get(modalidade) || 0) + 1)
    })

    const licitacoesPorModalidade = Array.from(modalidadeMap.entries()).map(([name, value]) => ({
      name,
      value
    }))

    // Agrupar por secretaria
    const secretariaMap = new Map()
    licitacoes?.forEach(l => {
      const secretaria = l.secretaria || 'Não especificada'
      secretariaMap.set(secretaria, (secretariaMap.get(secretaria) || 0) + 1)
    })

    const contratosPorSecretaria = Array.from(secretariaMap.entries()).map(([secretaria, quantidade]) => ({
      secretaria,
      quantidade
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats,
        licitacoesPorModalidade,
        contratosPorSecretaria
      }
    })
  } catch (error: any) {
    console.error('Erro na API do dashboard:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
