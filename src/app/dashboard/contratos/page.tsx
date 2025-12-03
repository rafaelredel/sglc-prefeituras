"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Filter, Eye, FileText, Calendar, DollarSign, Building2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// =====================================================
// TIPOS E INTERFACES
// =====================================================

interface Contrato {
  id: string
  prefeitura_id: string
  numero_contrato: string
  processo_administrativo?: string
  modalidade: string
  objeto: string
  valor_total: number
  cnpj_contratada: string
  nome_contratada: string
  responsavel_contratada?: string
  data_assinatura: string
  data_inicio_vigencia: string
  data_fim_vigencia: string
  status_contrato: 'vigente' | 'encerrado' | 'suspenso' | 'cancelado'
  arquivo_pdf?: string
  dotacao_orcamentaria?: string
  fiscal_contrato?: string
  gestor_contrato?: string
  observacoes?: string
  criado_em?: string
  atualizado_em?: string
}

interface FormData {
  numero_contrato: string
  processo_administrativo: string
  modalidade: string
  objeto: string
  valor_total: string
  cnpj_contratada: string
  nome_contratada: string
  responsavel_contratada: string
  data_assinatura: string
  data_inicio_vigencia: string
  data_fim_vigencia: string
  status_contrato: 'vigente' | 'encerrado' | 'suspenso' | 'cancelado'
  dotacao_orcamentaria: string
  fiscal_contrato: string
  gestor_contrato: string
  observacoes: string
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ContratosPage() {
  // Estados
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false)
  const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false)
  const [contratoSelecionado, setContratoSelecionado] = useState<Contrato | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  
  // Filtros
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState({
    status_contrato: '',
    data_inicio: '',
    data_fim: '',
    valor_min: '',
    valor_max: ''
  })

  // Form data
  const [formData, setFormData] = useState<FormData>({
    numero_contrato: '',
    processo_administrativo: '',
    modalidade: '',
    objeto: '',
    valor_total: '',
    cnpj_contratada: '',
    nome_contratada: '',
    responsavel_contratada: '',
    data_assinatura: '',
    data_inicio_vigencia: '',
    data_fim_vigencia: '',
    status_contrato: 'vigente',
    dotacao_orcamentaria: '',
    fiscal_contrato: '',
    gestor_contrato: '',
    observacoes: ''
  })

  // ID da prefeitura (simulado - em produção viria do contexto de autenticação)
  const PREFEITURA_ID = 'prefeitura-exemplo-uuid'

  // =====================================================
  // FUNÇÕES DE CARREGAMENTO
  // =====================================================

  const carregarContratos = async () => {
    console.log('🔄 [FRONTEND] Carregando contratos...')
    setLoading(true)
    setErro(null)

    try {
      // Construir URL com filtros
      const params = new URLSearchParams({
        prefeitura_id: PREFEITURA_ID
      })

      if (busca) params.append('nome_contratada', busca)
      if (filtros.status_contrato) params.append('status_contrato', filtros.status_contrato)
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio)
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim)
      if (filtros.valor_min) params.append('valor_min', filtros.valor_min)
      if (filtros.valor_max) params.append('valor_max', filtros.valor_max)

      const response = await fetch(`/api/contratos?${params.toString()}`)
      const result = await response.json()

      console.log('📦 [FRONTEND] Resposta recebida:', result)

      if (result.success) {
        setContratos(result.data || [])
        console.log(`✅ [FRONTEND] ${result.data?.length || 0} contratos carregados`)
      } else {
        console.error('❌ [FRONTEND] Erro ao carregar:', result)
        setErro(result.message || 'Erro ao carregar contratos')
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Erro na requisição:', error)
      setErro('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  // Carregar contratos ao montar o componente
  useEffect(() => {
    carregarContratos()
  }, [])

  // =====================================================
  // FUNÇÕES DE FORMULÁRIO
  // =====================================================

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validarFormulario = (): string | null => {
    if (!formData.numero_contrato) return 'Número do contrato é obrigatório'
    if (!formData.modalidade) return 'Modalidade é obrigatória'
    if (!formData.objeto) return 'Objeto é obrigatório'
    if (!formData.valor_total || parseFloat(formData.valor_total) <= 0) return 'Valor total deve ser maior que zero'
    if (!formData.cnpj_contratada) return 'CNPJ da contratada é obrigatório'
    if (!formData.nome_contratada) return 'Nome da contratada é obrigatório'
    if (!formData.data_assinatura) return 'Data de assinatura é obrigatória'
    if (!formData.data_inicio_vigencia) return 'Data de início de vigência é obrigatória'
    if (!formData.data_fim_vigencia) return 'Data de fim de vigência é obrigatória'

    // Validar CNPJ (formato básico)
    const cnpjLimpo = formData.cnpj_contratada.replace(/[^\d]/g, '')
    if (cnpjLimpo.length !== 14) return 'CNPJ deve conter 14 dígitos'

    // Validar datas
    const inicio = new Date(formData.data_inicio_vigencia)
    const fim = new Date(formData.data_fim_vigencia)
    if (fim < inicio) return 'Data de fim deve ser posterior à data de início'

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📤 [FRONTEND] Iniciando criação de contrato...')

    // Validar formulário
    const erroValidacao = validarFormulario()
    if (erroValidacao) {
      setErro(erroValidacao)
      console.error('❌ [FRONTEND] Validação falhou:', erroValidacao)
      return
    }

    setSalvando(true)
    setErro(null)

    try {
      const payload = {
        prefeitura_id: PREFEITURA_ID,
        numero_contrato: formData.numero_contrato,
        processo_administrativo: formData.processo_administrativo || undefined,
        modalidade: formData.modalidade,
        objeto: formData.objeto,
        valor_total: parseFloat(formData.valor_total),
        cnpj_contratada: formData.cnpj_contratada,
        nome_contratada: formData.nome_contratada,
        responsavel_contratada: formData.responsavel_contratada || undefined,
        data_assinatura: formData.data_assinatura,
        data_inicio_vigencia: formData.data_inicio_vigencia,
        data_fim_vigencia: formData.data_fim_vigencia,
        status_contrato: formData.status_contrato,
        dotacao_orcamentaria: formData.dotacao_orcamentaria || undefined,
        fiscal_contrato: formData.fiscal_contrato || undefined,
        gestor_contrato: formData.gestor_contrato || undefined,
        observacoes: formData.observacoes || undefined
      }

      console.log('📦 [FRONTEND] Enviando payload:', payload)

      const response = await fetch('/api/contratos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      console.log('📥 [FRONTEND] Resposta recebida:', result)

      if (result.success) {
        console.log('✅ [FRONTEND] Contrato criado com sucesso:', result.id)
        
        // Fechar modal e limpar formulário
        setModalNovoAberto(false)
        setFormData({
          numero_contrato: '',
          processo_administrativo: '',
          modalidade: '',
          objeto: '',
          valor_total: '',
          cnpj_contratada: '',
          nome_contratada: '',
          responsavel_contratada: '',
          data_assinatura: '',
          data_inicio_vigencia: '',
          data_fim_vigencia: '',
          status_contrato: 'vigente',
          dotacao_orcamentaria: '',
          fiscal_contrato: '',
          gestor_contrato: '',
          observacoes: ''
        })

        // Recarregar lista
        await carregarContratos()
      } else {
        console.error('❌ [FRONTEND] Erro do servidor:', result)
        setErro(result.message || 'Erro ao criar contrato')
      }
    } catch (error) {
      console.error('❌ [FRONTEND] Erro na requisição:', error)
      setErro('Erro ao conectar com o servidor')
    } finally {
      setSalvando(false)
    }
  }

  // =====================================================
  // FUNÇÕES DE FILTROS
  // =====================================================

  const aplicarFiltros = () => {
    setModalFiltrosAberto(false)
    carregarContratos()
  }

  const limparFiltros = () => {
    setFiltros({
      status_contrato: '',
      data_inicio: '',
      data_fim: '',
      valor_min: '',
      valor_max: ''
    })
    setBusca('')
  }

  // =====================================================
  // FUNÇÕES DE VISUALIZAÇÃO
  // =====================================================

  const abrirDetalhes = (contrato: Contrato) => {
    setContratoSelecionado(contrato)
    setModalDetalhesAberto(true)
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarCNPJ = (cnpj: string) => {
    const limpo = cnpj.replace(/[^\d]/g, '')
    return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      vigente: { variant: "default", label: "Vigente" },
      encerrado: { variant: "secondary", label: "Encerrado" },
      suspenso: { variant: "outline", label: "Suspenso" },
      cancelado: { variant: "destructive", label: "Cancelado" }
    }
    const config = variants[status] || variants.vigente
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-600 mt-1">Gerencie contratos licitatórios e não licitatórios</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setModalNovoAberto(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por número, fornecedor ou objeto..."
                className="pl-10"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && carregarContratos()}
              />
            </div>
            <Button 
              variant="outline"
              onClick={() => setModalFiltrosAberto(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros Avançados
            </Button>
            <Button 
              variant="outline"
              onClick={carregarContratos}
            >
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos Cadastrados ({contratos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <p>Carregando contratos...</p>
            </div>
          ) : erro ? (
            <div className="text-center py-12 text-red-500">
              <p>{erro}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={carregarContratos}
              >
                Tentar novamente
              </Button>
            </div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Nenhum contrato cadastrado</p>
              <p className="text-sm mt-2">Clique em "Novo Contrato" para adicionar o primeiro</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contratada</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assinatura</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contratos.map((contrato) => (
                    <tr key={contrato.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {contrato.numero_contrato}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {contrato.nome_contratada}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatarCNPJ(contrato.cnpj_contratada)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatarData(contrato.data_assinatura)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {formatarMoeda(contrato.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(contrato.status_contrato)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirDetalhes(contrato)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Novo Contrato */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Preencha os dados do contrato administrativo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {erro}
              </div>
            )}

            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados Básicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_contrato">Número do Contrato *</Label>
                  <Input
                    id="numero_contrato"
                    value={formData.numero_contrato}
                    onChange={(e) => handleInputChange('numero_contrato', e.target.value)}
                    placeholder="Ex: 001/2024"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="processo_administrativo">Processo Administrativo</Label>
                  <Input
                    id="processo_administrativo"
                    value={formData.processo_administrativo}
                    onChange={(e) => handleInputChange('processo_administrativo', e.target.value)}
                    placeholder="Ex: PA 123/2024"
                  />
                </div>
                <div>
                  <Label htmlFor="modalidade">Modalidade *</Label>
                  <Select
                    value={formData.modalidade}
                    onValueChange={(value) => handleInputChange('modalidade', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pregão Eletrônico">Pregão Eletrônico</SelectItem>
                      <SelectItem value="Pregão Presencial">Pregão Presencial</SelectItem>
                      <SelectItem value="Concorrência">Concorrência</SelectItem>
                      <SelectItem value="Tomada de Preços">Tomada de Preços</SelectItem>
                      <SelectItem value="Convite">Convite</SelectItem>
                      <SelectItem value="Dispensa">Dispensa</SelectItem>
                      <SelectItem value="Inexigibilidade">Inexigibilidade</SelectItem>
                      <SelectItem value="Não Licitatório">Não Licitatório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="valor_total">Valor Total (R$) *</Label>
                  <Input
                    id="valor_total"
                    type="number"
                    step="0.01"
                    value={formData.valor_total}
                    onChange={(e) => handleInputChange('valor_total', e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="objeto">Objeto do Contrato *</Label>
                <Textarea
                  id="objeto"
                  value={formData.objeto}
                  onChange={(e) => handleInputChange('objeto', e.target.value)}
                  placeholder="Descreva o objeto do contrato..."
                  rows={3}
                  required
                />
              </div>
            </div>

            {/* Dados da Contratada */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados da Contratada</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cnpj_contratada">CNPJ *</Label>
                  <Input
                    id="cnpj_contratada"
                    value={formData.cnpj_contratada}
                    onChange={(e) => handleInputChange('cnpj_contratada', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="nome_contratada">Nome da Empresa *</Label>
                  <Input
                    id="nome_contratada"
                    value={formData.nome_contratada}
                    onChange={(e) => handleInputChange('nome_contratada', e.target.value)}
                    placeholder="Razão social"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="responsavel_contratada">Responsável Legal</Label>
                  <Input
                    id="responsavel_contratada"
                    value={formData.responsavel_contratada}
                    onChange={(e) => handleInputChange('responsavel_contratada', e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
            </div>

            {/* Datas e Vigência */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Datas e Vigência</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data_assinatura">Data de Assinatura *</Label>
                  <Input
                    id="data_assinatura"
                    type="date"
                    value={formData.data_assinatura}
                    onChange={(e) => handleInputChange('data_assinatura', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_inicio_vigencia">Início da Vigência *</Label>
                  <Input
                    id="data_inicio_vigencia"
                    type="date"
                    value={formData.data_inicio_vigencia}
                    onChange={(e) => handleInputChange('data_inicio_vigencia', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="data_fim_vigencia">Fim da Vigência *</Label>
                  <Input
                    id="data_fim_vigencia"
                    type="date"
                    value={formData.data_fim_vigencia}
                    onChange={(e) => handleInputChange('data_fim_vigencia', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Gestão e Status */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Gestão e Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status_contrato">Status *</Label>
                  <Select
                    value={formData.status_contrato}
                    onValueChange={(value: any) => handleInputChange('status_contrato', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vigente">Vigente</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dotacao_orcamentaria">Dotação Orçamentária</Label>
                  <Input
                    id="dotacao_orcamentaria"
                    value={formData.dotacao_orcamentaria}
                    onChange={(e) => handleInputChange('dotacao_orcamentaria', e.target.value)}
                    placeholder="Ex: 3.3.90.39"
                  />
                </div>
                <div>
                  <Label htmlFor="fiscal_contrato">Fiscal do Contrato</Label>
                  <Input
                    id="fiscal_contrato"
                    value={formData.fiscal_contrato}
                    onChange={(e) => handleInputChange('fiscal_contrato', e.target.value)}
                    placeholder="Nome do fiscal"
                  />
                </div>
                <div>
                  <Label htmlFor="gestor_contrato">Gestor do Contrato</Label>
                  <Input
                    id="gestor_contrato"
                    value={formData.gestor_contrato}
                    onChange={(e) => handleInputChange('gestor_contrato', e.target.value)}
                    placeholder="Nome do gestor"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => handleInputChange('observacoes', e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {salvando ? 'Salvando...' : 'Criar Contrato'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>

          {contratoSelecionado && (
            <div className="space-y-6">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{contratoSelecionado.numero_contrato}</h2>
                  <p className="text-gray-600">{contratoSelecionado.nome_contratada}</p>
                </div>
                {getStatusBadge(contratoSelecionado.status_contrato)}
              </div>

              {/* Informações */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Dados do Contrato
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Processo Administrativo:</dt>
                      <dd className="font-medium">{contratoSelecionado.processo_administrativo || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Modalidade:</dt>
                      <dd className="font-medium">{contratoSelecionado.modalidade}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Objeto:</dt>
                      <dd className="font-medium">{contratoSelecionado.objeto}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Contratada
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">CNPJ:</dt>
                      <dd className="font-medium">{formatarCNPJ(contratoSelecionado.cnpj_contratada)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Responsável:</dt>
                      <dd className="font-medium">{contratoSelecionado.responsavel_contratada || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Assinatura:</dt>
                      <dd className="font-medium">{formatarData(contratoSelecionado.data_assinatura)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Vigência:</dt>
                      <dd className="font-medium">
                        {formatarData(contratoSelecionado.data_inicio_vigencia)} até {formatarData(contratoSelecionado.data_fim_vigencia)}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valores
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-gray-600">Valor Total:</dt>
                      <dd className="font-bold text-lg text-blue-600">
                        {formatarMoeda(contratoSelecionado.valor_total)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Dotação:</dt>
                      <dd className="font-medium">{contratoSelecionado.dotacao_orcamentaria || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Gestão */}
              {(contratoSelecionado.fiscal_contrato || contratoSelecionado.gestor_contrato) && (
                <div>
                  <h3 className="font-semibold mb-2">Gestão</h3>
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    {contratoSelecionado.fiscal_contrato && (
                      <div>
                        <dt className="text-gray-600">Fiscal:</dt>
                        <dd className="font-medium">{contratoSelecionado.fiscal_contrato}</dd>
                      </div>
                    )}
                    {contratoSelecionado.gestor_contrato && (
                      <div>
                        <dt className="text-gray-600">Gestor:</dt>
                        <dd className="font-medium">{contratoSelecionado.gestor_contrato}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Observações */}
              {contratoSelecionado.observacoes && (
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {contratoSelecionado.observacoes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalDetalhesAberto(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Filtros Avançados */}
      <Dialog open={modalFiltrosAberto} onOpenChange={setModalFiltrosAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="filtro_status">Status</Label>
              <Select
                value={filtros.status_contrato}
                onValueChange={(value) => setFiltros(prev => ({ ...prev, status_contrato: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="encerrado">Encerrado</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filtro_data_inicio">Data Início</Label>
                <Input
                  id="filtro_data_inicio"
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="filtro_data_fim">Data Fim</Label>
                <Input
                  id="filtro_data_fim"
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filtro_valor_min">Valor Mínimo</Label>
                <Input
                  id="filtro_valor_min"
                  type="number"
                  step="0.01"
                  value={filtros.valor_min}
                  onChange={(e) => setFiltros(prev => ({ ...prev, valor_min: e.target.value }))}
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <Label htmlFor="filtro_valor_max">Valor Máximo</Label>
                <Input
                  id="filtro_valor_max"
                  type="number"
                  step="0.01"
                  value={filtros.valor_max}
                  onChange={(e) => setFiltros(prev => ({ ...prev, valor_max: e.target.value }))}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={limparFiltros}
            >
              Limpar
            </Button>
            <Button
              onClick={aplicarFiltros}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
