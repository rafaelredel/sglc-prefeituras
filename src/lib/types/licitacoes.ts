export interface Licitacao {
  id: string
  numero_protocolo: string
  modalidade: string
  objeto: string
  secretaria: string
  data_abertura: string
  data_encerramento_prevista?: string
  valor_estimado?: number
  fonte_recursos?: string
  responsavel: string
  status: string
  observacoes?: string
  cityhall_id: string
  criado_por: string
  atualizado_por?: string
  created_at: string
  updated_at: string
  cityhalls?: {
    name: string
  }
}

export interface CreateLicitacaoData {
  modalidade: string
  objeto: string
  secretaria: string
  data_abertura: string
  data_encerramento_prevista?: string
  valor_estimado?: number
  fonte_recursos?: string
  responsavel: string
  status?: string
  observacoes?: string
}

export interface UpdateLicitacaoData extends Partial<CreateLicitacaoData> {}

export const MODALIDADES = [
  { value: 'pregao_eletronico', label: 'Pregão Eletrônico' },
  { value: 'pregao_presencial', label: 'Pregão Presencial' },
  { value: 'concorrencia', label: 'Concorrência' },
  { value: 'tomada_precos', label: 'Tomada de Preços' },
  { value: 'dispensa', label: 'Dispensa de Licitação' },
  { value: 'inexigibilidade', label: 'Inexigibilidade' },
  { value: 'rdc', label: 'RDC - Regime Diferenciado de Contratação' },
  { value: 'dialogo_competitivo', label: 'Diálogo Competitivo' },
]

export const STATUS_LICITACAO = [
  { value: 'em_aberto', label: 'Em Aberto', color: 'blue' },
  { value: 'em_andamento', label: 'Em Andamento', color: 'yellow' },
  { value: 'aguardando_docs', label: 'Aguardando Documentos', color: 'orange' },
  { value: 'em_julgamento', label: 'Em Julgamento', color: 'purple' },
  { value: 'homologada', label: 'Homologada', color: 'green' },
  { value: 'cancelada', label: 'Cancelada', color: 'red' },
  { value: 'deserta', label: 'Deserta', color: 'gray' },
  { value: 'fracassada', label: 'Fracassada', color: 'red' },
  { value: 'suspensa', label: 'Suspensa', color: 'orange' },
]

export function getStatusColor(status: string): string {
  const statusObj = STATUS_LICITACAO.find(s => s.value === status)
  return statusObj?.color || 'gray'
}

export function getStatusLabel(status: string): string {
  const statusObj = STATUS_LICITACAO.find(s => s.value === status)
  return statusObj?.label || status
}

export function getModalidadeLabel(modalidade: string): string {
  const modalidadeObj = MODALIDADES.find(m => m.value === modalidade)
  return modalidadeObj?.label || modalidade
}

export function formatCurrency(value: number | undefined): string {
  if (!value) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR')
}
