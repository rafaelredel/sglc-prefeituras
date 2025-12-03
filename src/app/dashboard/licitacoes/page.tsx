"use client"

import { useState, useEffect } from 'react'
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, FileText, Calendar, DollarSign, Building2, User, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { SetupCityhall } from '@/components/custom/setup-cityhall'
import {
  Licitacao,
  CreateLicitacaoData,
  MODALIDADES,
  STATUS_LICITACAO,
  getStatusColor,
  getStatusLabel,
  getModalidadeLabel,
  formatCurrency,
  formatDate,
} from '@/lib/types/licitacoes'

export default function LicitacoesPage() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterModalidade, setFilterModalidade] = useState<string>('all')
  const [needsSetup, setNeedsSetup] = useState(false)
  const [showDatabaseAlert, setShowDatabaseAlert] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState<CreateLicitacaoData>({
    modalidade: '',
    objeto: '',
    secretaria: '',
    data_abertura: '',
    data_encerramento_prevista: '',
    valor_estimado: undefined,
    fonte_recursos: '',
    responsavel: '',
    status: 'em_aberto',
    observacoes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    checkSetupAndLoadLicitacoes()
  }, [])

  async function checkSetupAndLoadLicitacoes() {
    try {
      setLoading(true)

      if (!supabase) {
        console.error('Supabase não configurado')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('Usuário não autenticado')
        return
      }

      // Verificar se usuário tem cityhall_id
      const cityhallId = session.user.user_metadata?.cityhall_id

      if (!cityhallId) {
        // Tentar buscar uma prefeitura ativa
        const { data: cityhalls } = await supabase
          .from('cityhalls')
          .select('id, name')
          .eq('status', 'active')
          .limit(1)
          .single()

        if (!cityhalls) {
          // Não há prefeitura cadastrada - mostrar setup
          setNeedsSetup(true)
          setLoading(false)
          return
        }
      }

      // Carregar licitações
      await loadLicitacoes()
    } catch (error) {
      console.error('Erro ao verificar configuração:', error)
      setLoading(false)
    }
  }

  async function loadLicitacoes() {
    try {
      setLoading(true)

      if (!supabase) {
        console.error('Supabase não configurado')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('Usuário não autenticado')
        return
      }

      const response = await fetch('/api/licitacoes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setLicitacoes(result.data || [])
      } else {
        const error = await response.json()
        if (error.message?.includes('prefeitura')) {
          setNeedsSetup(true)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar licitações:', error)
    } finally {
      setLoading(false)
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.modalidade) {
      errors.modalidade = 'Modalidade é obrigatória'
    }
    if (!formData.objeto || formData.objeto.trim().length < 10) {
      errors.objeto = 'Objeto deve ter pelo menos 10 caracteres'
    }
    if (!formData.secretaria || formData.secretaria.trim().length < 3) {
      errors.secretaria = 'Secretaria é obrigatória'
    }
    if (!formData.data_abertura) {
      errors.data_abertura = 'Data de abertura é obrigatória'
    }
    if (!formData.responsavel || formData.responsavel.trim().length < 3) {
      errors.responsavel = 'Responsável é obrigatório'
    }

    // Validar data de encerramento (se fornecida)
    if (formData.data_encerramento_prevista && formData.data_abertura) {
      const dataAbertura = new Date(formData.data_abertura)
      const dataEncerramento = new Date(formData.data_encerramento_prevista)
      if (dataEncerramento < dataAbertura) {
        errors.data_encerramento_prevista = 'Data de encerramento deve ser posterior à data de abertura'
      }
    }

    // Validar valor estimado (se fornecido)
    if (formData.valor_estimado !== undefined && formData.valor_estimado <= 0) {
      errors.valor_estimado = 'Valor estimado deve ser maior que zero'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    console.log('🚀 [FRONTEND] Iniciando criação de licitação...')
    
    // Limpar erros anteriores
    setFormErrors({})
    setShowDatabaseAlert(false)

    // Validar formulário
    if (!validateForm()) {
      console.log('❌ [FRONTEND] Validação falhou')
      return
    }

    console.log('✅ [FRONTEND] Validação passou')
    setSubmitting(true)

    try {
      if (!supabase) {
        console.error('❌ [FRONTEND] Supabase não configurado')
        alert('❌ Erro: Supabase não configurado. Configure as variáveis de ambiente.')
        setSubmitting(false)
        return
      }

      console.log('✅ [FRONTEND] Supabase configurado')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ [FRONTEND] Usuário não autenticado')
        alert('❌ Erro: Usuário não autenticado. Faça login novamente.')
        setSubmitting(false)
        return
      }

      console.log('✅ [FRONTEND] Usuário autenticado:', session.user.email)

      // Preparar dados para envio
      const dataToSend = {
        ...formData,
        objeto: formData.objeto.trim(),
        secretaria: formData.secretaria.trim(),
        responsavel: formData.responsavel.trim(),
        fonte_recursos: formData.fonte_recursos?.trim() || '',
        observacoes: formData.observacoes?.trim() || '',
      }

      console.log('📤 [FRONTEND] Enviando dados:', dataToSend)

      const response = await fetch('/api/licitacoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(dataToSend)
      })

      console.log('📥 [FRONTEND] Resposta recebida - Status:', response.status)
      console.log('📥 [FRONTEND] Headers:', Object.fromEntries(response.headers.entries()))

      // Verificar se a resposta tem conteúdo
      const contentType = response.headers.get('content-type')
      console.log('📦 [FRONTEND] Content-Type:', contentType)

      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ [FRONTEND] Resposta não é JSON válido')
        const textResponse = await response.text()
        console.error('📄 [FRONTEND] Resposta como texto:', textResponse)
        alert(`❌ Erro: Servidor retornou resposta inválida.\n\nStatus: ${response.status}\nResposta: ${textResponse.substring(0, 200)}`)
        setSubmitting(false)
        return
      }

      // Ler resposta como texto primeiro para debug
      const rawResponse = await response.text()
      console.log('📦 [FRONTEND] Resposta bruta:', rawResponse)

      // Verificar se resposta está vazia
      if (!rawResponse || rawResponse.trim() === '' || rawResponse === '{}') {
        console.error('❌ [FRONTEND] Resposta vazia do servidor')
        alert(`❌ Erro: Servidor retornou resposta vazia.\n\nStatus: ${response.status}\n\nIsso indica um problema no backend. Verifique os logs do servidor.`)
        setSubmitting(false)
        return
      }

      let result
      try {
        result = JSON.parse(rawResponse)
        console.log('✅ [FRONTEND] JSON parseado:', result)
      } catch (parseError) {
        console.error('❌ [FRONTEND] Erro ao parsear JSON:', parseError)
        console.error('📄 [FRONTEND] Resposta inválida:', rawResponse)
        alert(`❌ Erro ao criar licitação: resposta inválida do servidor.\n\nResposta recebida: ${rawResponse.substring(0, 200)}`)
        setSubmitting(false)
        return
      }

      // Verificar se result é um objeto válido
      if (!result || typeof result !== 'object') {
        console.error('❌ [FRONTEND] Resultado não é um objeto válido:', result)
        alert(`❌ Erro: Resposta do servidor não é válida.\n\nResposta: ${JSON.stringify(result)}`)
        setSubmitting(false)
        return
      }

      // Verificar se é erro de banco de dados (PGRST204)
      if (result.code === 'PGRST204' || result.message?.includes('BANCO DE DADOS PRECISA SER ATUALIZADO')) {
        console.error('❌ [FRONTEND] Erro de estrutura do banco:', result)
        setShowDatabaseAlert(true)
        setSubmitting(false)
        return
      }

      if (response.ok && result.success) {
        // Sucesso!
        console.log('✅ [FRONTEND] Licitação criada com sucesso!')
        console.log('📄 [FRONTEND] Dados da licitação:', result.data)
        alert('✅ Licitação criada com sucesso!')
        setShowModal(false)
        resetForm()
        await loadLicitacoes() // Recarregar lista
      } else {
        // Erro do servidor
        console.error('❌ [FRONTEND] Erro do servidor:', result)
        
        let errorMessage = result.message || 'Erro desconhecido'
        if (result.details) {
          errorMessage += `\n\nDetalhes: ${result.details}`
        }
        if (result.hint) {
          errorMessage += `\n\nDica: ${result.hint}`
        }
        if (result.missingFields && result.missingFields.length > 0) {
          errorMessage += `\n\nCampos faltando: ${result.missingFields.join(', ')}`
        }
        
        alert(`❌ Erro ao criar licitação:\n\n${errorMessage}`)
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao criar licitação:', error)
      console.error('❌ [FRONTEND] Stack:', error instanceof Error ? error.stack : 'N/A')
      alert(`❌ Erro ao criar licitação:\n\n${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nVerifique sua conexão e tente novamente.`)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormData({
      modalidade: '',
      objeto: '',
      secretaria: '',
      data_abertura: '',
      data_encerramento_prevista: '',
      valor_estimado: undefined,
      fonte_recursos: '',
      responsavel: '',
      status: 'em_aberto',
      observacoes: '',
    })
    setFormErrors({})
    setShowDatabaseAlert(false)
  }

  function handleSetupComplete() {
    setNeedsSetup(false)
    checkSetupAndLoadLicitacoes()
  }

  // Se precisa de configuração inicial
  if (needsSetup) {
    return <SetupCityhall onComplete={handleSetupComplete} />
  }

  // Filtrar licitações
  const filteredLicitacoes = licitacoes.filter(lic => {
    const matchSearch = searchTerm === '' || 
      lic.numero_protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.objeto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lic.responsavel.toLowerCase().includes(searchTerm.toLowerCase())

    const matchStatus = filterStatus === 'all' || lic.status === filterStatus
    const matchModalidade = filterModalidade === 'all' || lic.modalidade === filterModalidade

    return matchSearch && matchStatus && matchModalidade
  })

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Licitações</h1>
          <p className="text-gray-600 mt-1">Gerencie todos os processos licitatórios</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Licitação
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, objeto ou responsável..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {STATUS_LICITACAO.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterModalidade} onValueChange={setFilterModalidade}>
              <SelectTrigger>
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Modalidades</SelectItem>
                {MODALIDADES.map(mod => (
                  <SelectItem key={mod.value} value={mod.value}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Licitações */}
      <Card>
        <CardHeader>
          <CardTitle>Processos Licitatórios ({filteredLicitacoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Carregando licitações...</p>
            </div>
          ) : filteredLicitacoes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma licitação encontrada</p>
              <p className="text-sm mt-2">Clique em "Nova Licitação" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLicitacoes.map((licitacao) => (
                <div
                  key={licitacao.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {licitacao.numero_protocolo}
                        </span>
                        <Badge variant="outline" className={`bg-${getStatusColor(licitacao.status)}-50 text-${getStatusColor(licitacao.status)}-700 border-${getStatusColor(licitacao.status)}-200`}>
                          {getStatusLabel(licitacao.status)}
                        </Badge>
                        <Badge variant="secondary">
                          {getModalidadeLabel(licitacao.modalidade)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-900 font-medium line-clamp-2">
                        {licitacao.objeto}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{licitacao.secretaria}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{licitacao.responsavel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(licitacao.data_abertura)}</span>
                        </div>
                        {licitacao.valor_estimado && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(licitacao.valor_estimado)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Nova Licitação */}
      <Dialog open={showModal} onOpenChange={(open) => {
        setShowModal(open)
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Licitação</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo processo licitatório. Campos marcados com * são obrigatórios.
            </DialogDescription>
          </DialogHeader>

          {/* Alerta de banco de dados */}
          {showDatabaseAlert && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>⚠️ Banco de Dados Precisa Ser Atualizado</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>A tabela de licitações no banco de dados não possui todas as colunas necessárias.</p>
                <div className="bg-red-50 p-3 rounded-md mt-2 text-sm">
                  <p className="font-semibold mb-2">📋 Instruções para corrigir:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Acesse o <strong>Supabase Dashboard</strong></li>
                    <li>Vá em <strong>"SQL Editor"</strong></li>
                    <li>Abra o arquivo <code className="bg-red-100 px-1 rounded">database/fix-licitacoes-columns.sql</code></li>
                    <li>Cole o conteúdo no editor SQL</li>
                    <li>Clique em <strong>"Run"</strong> para executar</li>
                    <li>Tente criar a licitação novamente</li>
                  </ol>
                </div>
                <p className="text-xs mt-2">
                  💡 Este script adiciona as colunas: numero_protocolo, modalidade, objeto, secretaria, data_abertura, e outras necessárias.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modalidade">Modalidade *</Label>
                <Select
                  value={formData.modalidade}
                  onValueChange={(value) => {
                    setFormData({ ...formData, modalidade: value })
                    setFormErrors({ ...formErrors, modalidade: '' })
                  }}
                >
                  <SelectTrigger className={formErrors.modalidade ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODALIDADES.map(mod => (
                      <SelectItem key={mod.value} value={mod.value}>
                        {mod.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.modalidade && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.modalidade}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_LICITACAO.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objeto">Objeto da Licitação *</Label>
              <Textarea
                id="objeto"
                placeholder="Descreva detalhadamente o objeto da licitação (mínimo 10 caracteres)..."
                value={formData.objeto}
                onChange={(e) => {
                  setFormData({ ...formData, objeto: e.target.value })
                  setFormErrors({ ...formErrors, objeto: '' })
                }}
                className={formErrors.objeto ? 'border-red-500' : ''}
                rows={3}
              />
              {formErrors.objeto && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.objeto}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secretaria">Secretaria Responsável *</Label>
                <Input
                  id="secretaria"
                  placeholder="Ex: Secretaria de Obras"
                  value={formData.secretaria}
                  onChange={(e) => {
                    setFormData({ ...formData, secretaria: e.target.value })
                    setFormErrors({ ...formErrors, secretaria: '' })
                  }}
                  className={formErrors.secretaria ? 'border-red-500' : ''}
                />
                {formErrors.secretaria && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.secretaria}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável Interno *</Label>
                <Input
                  id="responsavel"
                  placeholder="Nome do responsável"
                  value={formData.responsavel}
                  onChange={(e) => {
                    setFormData({ ...formData, responsavel: e.target.value })
                    setFormErrors({ ...formErrors, responsavel: '' })
                  }}
                  className={formErrors.responsavel ? 'border-red-500' : ''}
                />
                {formErrors.responsavel && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.responsavel}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_abertura">Data de Abertura *</Label>
                <Input
                  id="data_abertura"
                  type="date"
                  value={formData.data_abertura}
                  onChange={(e) => {
                    setFormData({ ...formData, data_abertura: e.target.value })
                    setFormErrors({ ...formErrors, data_abertura: '' })
                  }}
                  className={formErrors.data_abertura ? 'border-red-500' : ''}
                />
                {formErrors.data_abertura && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.data_abertura}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_encerramento">Data de Encerramento Prevista</Label>
                <Input
                  id="data_encerramento"
                  type="date"
                  value={formData.data_encerramento_prevista}
                  onChange={(e) => {
                    setFormData({ ...formData, data_encerramento_prevista: e.target.value })
                    setFormErrors({ ...formErrors, data_encerramento_prevista: '' })
                  }}
                  className={formErrors.data_encerramento_prevista ? 'border-red-500' : ''}
                />
                {formErrors.data_encerramento_prevista && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.data_encerramento_prevista}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valor_estimado">Valor Estimado (R$)</Label>
                <Input
                  id="valor_estimado"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formData.valor_estimado || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, valor_estimado: e.target.value ? parseFloat(e.target.value) : undefined })
                    setFormErrors({ ...formErrors, valor_estimado: '' })
                  }}
                  className={formErrors.valor_estimado ? 'border-red-500' : ''}
                />
                {formErrors.valor_estimado && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.valor_estimado}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonte_recursos">Fonte de Recursos</Label>
                <Input
                  id="fonte_recursos"
                  placeholder="Ex: Recursos Próprios"
                  value={formData.fonte_recursos}
                  onChange={(e) => setFormData({ ...formData, fonte_recursos: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações adicionais sobre o processo licitatório..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
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
                {submitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Criando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Criar Licitação
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
