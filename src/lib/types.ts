// ==========================================
// TIPOS DO SISTEMA SGLC
// ==========================================

// Perfis de usuário
export type UserRole = 
  | 'master_admin'
  | 'admin_prefeitura'
  | 'setor_licitacoes'
  | 'setor_juridico'
  | 'controle_interno'
  | 'setor_financeiro'
  | 'operacional'

// Status de prefeitura
export type PrefeituraStatus = 'ativa' | 'inativa' | 'suspensa'

// Modalidades de licitação
export type ModalidadeLicitacao = 
  | 'pregao'
  | 'concorrencia'
  | 'tomada_preco'
  | 'dispensa'
  | 'inexigibilidade'
  | 'chamamento_publico'

// Status de licitação
export type StatusLicitacao = 
  | 'em_elaboracao'
  | 'em_andamento'
  | 'homologada'
  | 'adjudicada'
  | 'encerrada'
  | 'cancelada'

// Status de contrato
export type StatusContrato = 
  | 'elaboracao'
  | 'assinado'
  | 'publicado'
  | 'em_execucao'
  | 'encerrado'
  | 'rescindido'

// Status de etapa
export type StatusEtapa = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'

// ==========================================
// INTERFACES PRINCIPAIS
// ==========================================

export interface Prefeitura {
  id: string
  nome: string
  cnpj: string
  cidade: string
  estado: string
  status: PrefeituraStatus
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface Usuario {
  id: string
  prefeitura_id: string
  email: string
  nome: string
  role: UserRole
  ativo: boolean
  ultimo_acesso?: string
  created_at: string
  updated_at: string
}

export interface Licitacao {
  id: string
  prefeitura_id: string
  numero_processo: string
  modalidade: ModalidadeLicitacao
  objeto: string
  secretaria_solicitante: string
  responsavel_tecnico: string
  valor_estimado: number
  justificativa: string
  data_prevista_abertura: string
  status: StatusLicitacao
  created_by: string
  created_at: string
  updated_at: string
}

export interface EtapaLicitacao {
  id: string
  licitacao_id: string
  nome: string
  ordem: number
  status: StatusEtapa
  data_conclusao?: string
  responsavel?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Contrato {
  id: string
  prefeitura_id: string
  numero_contrato: string
  tipo: 'licitatorio' | 'nao_licitatorio'
  licitacao_id?: string
  secretaria_contratante: string
  fornecedor: string
  objeto: string
  valor_total: number
  data_inicio: string
  data_fim: string
  fiscal_contrato: string
  status: StatusContrato
  created_by: string
  created_at: string
  updated_at: string
}

export interface AditivoContrato {
  id: string
  contrato_id: string
  tipo: 'prazo' | 'valor' | 'ambos'
  descricao: string
  valor_adicional?: number
  nova_data_fim?: string
  data_aditivo: string
  created_by: string
  created_at: string
}

export interface Anexo {
  id: string
  entidade_tipo: 'licitacao' | 'contrato' | 'etapa'
  entidade_id: string
  nome_arquivo: string
  tipo_arquivo: string
  tamanho: number
  url: string
  uploaded_by: string
  created_at: string
}

export interface LogAuditoria {
  id: string
  prefeitura_id: string
  usuario_id: string
  acao: string
  entidade_tipo: string
  entidade_id: string
  detalhes?: Record<string, unknown>
  created_at: string
}

// ==========================================
// DASHBOARD TYPES
// ==========================================

export interface DashboardStats {
  licitacoes_abertas: number
  licitacoes_andamento: number
  licitacoes_encerradas: number
  contratos_vigentes: number
  contratos_vencer_90dias: number
  contratos_encerrados: number
  anexos_pendentes: number
}

export interface AlertaDashboard {
  id: string
  tipo: 'vencimento' | 'publicacao' | 'etapa' | 'documento'
  titulo: string
  descricao: string
  prioridade: 'alta' | 'media' | 'baixa'
  entidade_tipo: 'licitacao' | 'contrato'
  entidade_id: string
  created_at: string
}
