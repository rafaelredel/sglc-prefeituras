"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, FileText, FileSignature, Calendar, DollarSign, Building2, User, Eye, Info } from 'lucide-react'
import { authenticatedFetch, isSupabaseConfigured } from '@/lib/supabase'

interface Processo {
  id: string
  tipo: 'licitacao' | 'contrato'
  numero_processo: string
  objeto: string
  status: string
  criado_em: string
  
  // Licitação
  modalidade?: string
  secretaria?: string
  data_abertura?: string
  valor_estimado?: number
  responsavel?: string
  empresa_vencedora?: string
  cnpj_vencedor?: string
  
  // Contrato
  empresa_contratada?: string
  cnpj_contratada?: string
  valor_total?: number
  data_assinatura?: string
  data_inicio_vigencia?: string
  data_fim_vigencia?: string
}

// Função para renderizar badge de status com cores apropriadas
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    em_aberto: {
      label: 'Processo em Aberto',
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    em_andamento: {
      label: 'Em Andamento',
      className: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    concluido: {
      label: 'Concluído',
      className: 'bg-gray-100 text-gray-800 border-gray-300'
    },
    vigente: {
      label: 'Vigente',
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    encerrado: {
      label: 'Encerrado',
      className: 'bg-red-100 text-red-800 border-red-300'
    }
  }

  const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800 border-gray-300' }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

export default function ProcessosAdministrativosPage() {
  const router = useRouter()
  const [processos, setProcessos] = useState<Processo[]>([])
  const [loading, setLoading] = useState(true)
  const [showModalTipo, setShowModalTipo] = useState(false)
  const [showModalForm, setShowModalForm] = useState(false)
  const [tipoSelecionado, setTipoSelecionado] = useState<'licitacao' | 'contrato' | null>(null)
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Form data
  const [formData, setFormData] = useState<any>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadProcessos()
  }, [])

  async function loadProcessos() {
    try {
      setLoading(true)

      if (!isSupabaseConfigured()) {
        console.error('Supabase não configurado')
        return
      }

      const result = await authenticatedFetch('/api/processos-administrativos')
      setProcessos(result.data || [])
    } catch (error) {
      console.error('Erro ao carregar processos:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleAddProcesso() {
    setShowModalTipo(true)
  }

  function handleSelectTipo(tipo: 'licitacao' | 'contrato') {
    setTipoSelecionado(tipo)
    setShowModalTipo(false)
    // Inicializar formData com campos obrigatórios
    setFormData({ 
      tipo,
      status: tipo === 'licitacao' ? 'em_aberto' : 'vigente'
    })
    setShowModalForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!isSupabaseConfigured()) {
        alert('Supabase não configurado')
        return
      }

      if (!formData.tipo) {
        alert('❌ O campo "Tipo" é obrigatório')
        setSubmitting(false)
        return
      }

      // Validações específicas por tipo
      if (tipoSelecionado === 'licitacao') {
        if (!formData.modalidade || !formData.secretaria || !formData.objeto || 
            !formData.data_abertura || !formData.responsavel) {
          alert('❌ Preencha todos os campos obrigatórios marcados com *')
          setSubmitting(false)
          return
        }
      } else if (tipoSelecionado === 'contrato') {
        if (!formData.objeto || !formData.empresa_contratada || !formData.cnpj_contratada ||
            !formData.valor_total || !formData.data_assinatura || 
            !formData.data_inicio_vigencia || !formData.data_fim_vigencia) {
          alert('❌ Preencha todos os campos obrigatórios marcados com *')
          setSubmitting(false)
          return
        }
      }

      const result = await authenticatedFetch('/api/processos-administrativos', {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      if (result.success) {
        alert(`✅ ${tipoSelecionado === 'licitacao' ? 'Licitação' : 'Contrato'} criado com sucesso!\n\nNúmero gerado: ${result.data.numero_processo}`)
        setShowModalForm(false)
        setFormData({})
        setTipoSelecionado(null)
        await loadProcessos()
      } else {
        alert(`❌ Erro: ${result.message}`)
      }
    } catch (error: any) {
      console.error('Erro ao criar processo:', error)
      alert(`❌ Erro ao criar processo: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  function handleConsultarInfo(processoId: string) {
    router.push(`/dashboard/processos-administrativos/${processoId}`)
  }

  // Filtrar processos
  const filteredProcessos = processos.filter(proc => {
    const matchSearch = searchTerm === '' || 
      proc.numero_processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.empresa_contratada?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proc.empresa_vencedora?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchTipo = filterTipo === 'all' || proc.tipo === filterTipo
    const matchStatus = filterStatus === 'all' || proc.status === filterStatus

    return matchSearch && matchTipo && matchStatus
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Processos Administrativos</h1>
          <p className="text-gray-600 mt-1">Gerencie licitações e contratos em um único lugar</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={handleAddProcesso}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Processo
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, objeto ou empresa..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="licitacao">Licitações</SelectItem>
                <SelectItem value="contrato">Contratos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="em_aberto">Processo em Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Processos */}
      <Card>
        <CardHeader>
          <CardTitle>Processos ({filteredProcessos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Carregando processos...</p>
            </div>
          ) : filteredProcessos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum processo encontrado</p>
              <p className="text-sm mt-2">Clique em "Adicionar Processo" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProcessos.map((processo) => (
                <div
                  key={processo.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {processo.tipo === 'licitacao' ? (
                          <FileText className="h-5 w-5 text-blue-600" />
                        ) : (
                          <FileSignature className="h-5 w-5 text-green-600" />
                        )}
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {processo.numero_processo}
                        </span>
                        <Badge variant="outline" className={processo.tipo === 'licitacao' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
                          {processo.tipo === 'licitacao' ? 'Licitação' : 'Contrato'}
                        </Badge>
                        <StatusBadge status={processo.status} />
                      </div>
                      
                      <p className="text-gray-900 font-medium line-clamp-2">
                        {processo.objeto}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {processo.tipo === 'licitacao' && (
                          <>
                            {processo.secretaria && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{processo.secretaria}</span>
                              </div>
                            )}
                            {processo.responsavel && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{processo.responsavel}</span>
                              </div>
                            )}
                            {processo.data_abertura && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(processo.data_abertura).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                            {processo.valor_estimado && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>R$ {processo.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </>
                        )}
                        {processo.tipo === 'contrato' && (
                          <>
                            {processo.empresa_contratada && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{processo.empresa_contratada}</span>
                              </div>
                            )}
                            {processo.cnpj_contratada && (
                              <div className="flex items-center gap-1">
                                <span>CNPJ: {processo.cnpj_contratada}</span>
                              </div>
                            )}
                            {processo.data_assinatura && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(processo.data_assinatura).toLocaleDateString('pt-BR')}</span>
                              </div>
                            )}
                            {processo.valor_total && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                <span>R$ {processo.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Botão Consultar Informações */}
                    <div className="flex items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                        onClick={() => handleConsultarInfo(processo.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Consultar informações
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Escolher Tipo */}
      <Dialog open={showModalTipo} onOpenChange={setShowModalTipo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Processo</DialogTitle>
            <DialogDescription>
              Escolha o tipo de processo que deseja criar
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 hover:bg-blue-50 hover:border-blue-600"
              onClick={() => handleSelectTipo('licitacao')}
            >
              <FileText className="h-12 w-12 text-blue-600" />
              <span className="font-semibold">Criar Licitação</span>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3 hover:bg-green-50 hover:border-green-600"
              onClick={() => handleSelectTipo('contrato')}
            >
              <FileSignature className="h-12 w-12 text-green-600" />
              <span className="font-semibold">Criar Contrato</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Formulário */}
      <Dialog open={showModalForm} onOpenChange={(open) => {
        setShowModalForm(open)
        if (!open) {
          setFormData({})
          setTipoSelecionado(null)
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tipoSelecionado === 'licitacao' ? 'Nova Licitação' : 'Novo Contrato'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo {tipoSelecionado === 'licitacao' ? 'processo licitatório' : 'contrato'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Aviso sobre geração automática do número */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Número do Processo Gerado Automaticamente</p>
                <p>O sistema irá gerar automaticamente o número do processo no formato:</p>
                <p className="font-mono mt-1">
                  {tipoSelecionado === 'contrato' ? 'CTR' : 'LIC'}-{new Date().getFullYear()}-{String(new Date().getMonth() + 1).padStart(2, '0')}-XXXXX
                </p>
              </div>
            </div>

            {tipoSelecionado === 'licitacao' ? (
              <>
                {/* Formulário de Licitação */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modalidade">Modalidade *</Label>
                    <Select
                      value={formData.modalidade || ''}
                      onValueChange={(value) => setFormData({ ...formData, modalidade: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pregao_eletronico">Pregão Eletrônico</SelectItem>
                        <SelectItem value="pregao_presencial">Pregão Presencial</SelectItem>
                        <SelectItem value="concorrencia">Concorrência</SelectItem>
                        <SelectItem value="tomada_precos">Tomada de Preços</SelectItem>
                        <SelectItem value="dispensa">Dispensa</SelectItem>
                        <SelectItem value="inexigibilidade">Inexigibilidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secretaria">Secretaria *</Label>
                    <Input
                      id="secretaria"
                      value={formData.secretaria || ''}
                      onChange={(e) => setFormData({ ...formData, secretaria: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objeto">Objeto *</Label>
                  <Textarea
                    id="objeto"
                    rows={3}
                    value={formData.objeto || ''}
                    onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_abertura">Data de Abertura *</Label>
                    <Input
                      id="data_abertura"
                      type="date"
                      value={formData.data_abertura || ''}
                      onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsável *</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel || ''}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    rows={2}
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Formulário de Contrato */}
                <div className="space-y-2">
                  <Label htmlFor="objeto">Objeto *</Label>
                  <Textarea
                    id="objeto"
                    rows={3}
                    value={formData.objeto || ''}
                    onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="empresa_contratada">Empresa Contratada *</Label>
                    <Input
                      id="empresa_contratada"
                      value={formData.empresa_contratada || ''}
                      onChange={(e) => setFormData({ ...formData, empresa_contratada: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj_contratada">CNPJ *</Label>
                    <Input
                      id="cnpj_contratada"
                      value={formData.cnpj_contratada || ''}
                      onChange={(e) => setFormData({ ...formData, cnpj_contratada: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor_total">Valor Total *</Label>
                    <Input
                      id="valor_total"
                      type="number"
                      step="0.01"
                      value={formData.valor_total || ''}
                      onChange={(e) => setFormData({ ...formData, valor_total: parseFloat(e.target.value) })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_assinatura">Data de Assinatura *</Label>
                    <Input
                      id="data_assinatura"
                      type="date"
                      value={formData.data_assinatura || ''}
                      onChange={(e) => setFormData({ ...formData, data_assinatura: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data_inicio_vigencia">Início da Vigência *</Label>
                    <Input
                      id="data_inicio_vigencia"
                      type="date"
                      value={formData.data_inicio_vigencia || ''}
                      onChange={(e) => setFormData({ ...formData, data_inicio_vigencia: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_fim_vigencia">Fim da Vigência *</Label>
                    <Input
                      id="data_fim_vigencia"
                      type="date"
                      value={formData.data_fim_vigencia || ''}
                      onChange={(e) => setFormData({ ...formData, data_fim_vigencia: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    rows={2}
                    value={formData.observacoes || ''}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  />
                </div>
              </>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModalForm(false)
                  setFormData({})
                  setTipoSelecionado(null)
                }}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Criando...' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
