"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  FileSignature,
  Calendar,
  DollarSign,
  Building2,
  User,
  ArrowLeft,
  MessageSquare,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  Receipt,
  History,
  Plus,
  Download,
  Trash2,
  Eye,
  X
} from 'lucide-react'
import { authenticatedFetch, isSupabaseConfigured, supabase, ensureBucketExists } from '@/lib/supabase'

interface Processo {
  id: string
  tipo: 'licitacao' | 'contrato'
  numero_processo: string
  objeto: string
  status: string
  criado_em: string
  orcamento_inicial?: number
  
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
  observacoes?: string
}

interface Observacao {
  id: string
  conteudo: string
  usuario_nome: string
  created_at: string
}

interface Documento {
  id: string
  tipo: string
  descricao: string
  arquivo_nome: string
  arquivo_url: string
  arquivo_tamanho: number
  created_at: string
}

interface MovimentacaoFinanceira {
  id: string
  tipo: 'credito' | 'debito'
  valor: number
  data: string
  descricao: string
  responsavel: string
  created_at: string
}

interface NotaFiscal {
  id: string
  numero_nota: string
  data_emissao: string
  valor: number
  descricao: string // Campo real do banco
  url_arquivo?: string // Campo real do banco
  nome_arquivo?: string // Campo real do banco
  criado_em: string // Campo real do banco
}

interface HistoricoItem {
  id: string
  aba: string
  acao: string
  campo_alterado?: string
  valor_anterior?: string
  valor_novo?: string
  descricao: string
  usuario_nome: string
  criado_em: string
}

export default function ProcessoDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const processoId = params.id as string

  const [processo, setProcesso] = useState<Processo | null>(null)
  const [observacoes, setObservacoes] = useState<Observacao[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoFinanceira[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([])
  const [historico, setHistorico] = useState<HistoricoItem[]>([])
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('geral')
  
  // Estados para Observações
  const [novaObservacao, setNovaObservacao] = useState('')
  const [enviandoObservacao, setEnviandoObservacao] = useState(false)
  const [mensagemObservacao, setMensagemObservacao] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Estados para Upload de Documentos
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docTipo, setDocTipo] = useState('')
  const [docDescricao, setDocDescricao] = useState('')
  const [docArquivo, setDocArquivo] = useState<File | null>(null)
  const [mensagemUpload, setMensagemUpload] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Estados para Movimentação Financeira
  const [showAddMovimentacao, setShowAddMovimentacao] = useState(false)
  const [novaMovimentacao, setNovaMovimentacao] = useState({
    tipo: 'debito' as 'credito' | 'debito',
    valor: '',
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    responsavel: ''
  })

  // Estados para Nota Fiscal
  const [showAddNota, setShowAddNota] = useState(false)
  const [salvandoNota, setSalvandoNota] = useState(false)
  const [mensagemNota, setMensagemNota] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)
  const [novaNota, setNovaNota] = useState({
    numero_nota: '',
    data_emissao: new Date().toISOString().split('T')[0],
    valor: '',
    fornecedor: '',
    observacao: '',
    arquivo: null as File | null
  })

  // Estados para Modal de Visualização
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerFileName, setViewerFileName] = useState('')
  const [viewerFileType, setViewerFileType] = useState('')

  useEffect(() => {
    loadProcesso()
    loadDadosRelacionados()
  }, [processoId])

  async function loadProcesso() {
    try {
      setLoading(true)

      if (!isSupabaseConfigured()) {
        console.error('Supabase não configurado')
        return
      }

      const result = await authenticatedFetch(`/api/processos-administrativos/${processoId}`)
      
      if (result.success) {
        setProcesso(result.data)
      }
    } catch (error) {
      console.error('Erro ao carregar processo:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadDadosRelacionados() {
    try {
      if (!isSupabaseConfigured()) {
        return
      }

      // Carregar observações
      const obsResult = await authenticatedFetch(`/api/processos-administrativos/${processoId}/observacoes`)
      if (obsResult.success) {
        setObservacoes(obsResult.data || [])
      }

      // Carregar documentos
      const docsResult = await authenticatedFetch(`/api/processos-administrativos/${processoId}/documentos`)
      if (docsResult.success) {
        setDocumentos(docsResult.data || [])
      }

      // Carregar movimentações financeiras
      const finResult = await authenticatedFetch(`/api/processos-administrativos/${processoId}/financeiro`)
      if (finResult.success) {
        setMovimentacoes(finResult.data || [])
      }

      // Carregar notas fiscais
      const notasResult = await authenticatedFetch(`/api/processos-administrativos/${processoId}/notas-fiscais`)
      if (notasResult.success) {
        setNotasFiscais(notasResult.data || [])
      }

      // Carregar histórico
      const histResult = await authenticatedFetch(`/api/processos-administrativos/${processoId}/historico`)
      if (histResult.success) {
        setHistorico(histResult.data || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados relacionados:', error)
    }
  }

  async function handleAdicionarObservacao() {
    if (!novaObservacao.trim()) {
      setMensagemObservacao({ tipo: 'erro', texto: 'Por favor, escreva uma observação antes de enviar.' })
      setTimeout(() => setMensagemObservacao(null), 3000)
      return
    }

    setEnviandoObservacao(true)
    setMensagemObservacao(null)

    try {
      if (!isSupabaseConfigured()) {
        setMensagemObservacao({ tipo: 'erro', texto: 'Supabase não configurado' })
        return
      }

      const result = await authenticatedFetch(
        `/api/processos-administrativos/${processoId}/observacoes`,
        {
          method: 'POST',
          body: JSON.stringify({ conteudo: novaObservacao })
        }
      )

      if (result.success) {
        setMensagemObservacao({ tipo: 'sucesso', texto: '✅ Observação adicionada com sucesso!' })
        setNovaObservacao('')
        await loadDadosRelacionados()
        setTimeout(() => setMensagemObservacao(null), 3000)
      } else {
        setMensagemObservacao({ tipo: 'erro', texto: `❌ Erro: ${result.message || 'Erro desconhecido'}` })
        setTimeout(() => setMensagemObservacao(null), 5000)
      }
    } catch (error: any) {
      console.error('Erro ao adicionar observação:', error)
      setMensagemObservacao({ tipo: 'erro', texto: `❌ Erro ao adicionar observação: ${error.message}` })
      setTimeout(() => setMensagemObservacao(null), 5000)
    } finally {
      setEnviandoObservacao(false)
    }
  }

  async function handleUploadDocumento() {
    if (!docTipo || !docDescricao || !docArquivo) {
      setMensagemUpload({ tipo: 'erro', texto: 'Por favor, preencha todos os campos obrigatórios.' })
      setTimeout(() => setMensagemUpload(null), 3000)
      return
    }

    setUploadingDoc(true)
    setMensagemUpload(null)

    try {
      if (!supabase) {
        setMensagemUpload({ tipo: 'erro', texto: 'Supabase não configurado' })
        return
      }

      // Garantir que o bucket existe
      try {
        await ensureBucketExists()
      } catch (bucketError: any) {
        setMensagemUpload({ tipo: 'erro', texto: `❌ ${bucketError.message}` })
        setTimeout(() => setMensagemUpload(null), 8000)
        return
      }

      // Sanitizar nome do arquivo (remover caracteres especiais)
      const sanitizedFileName = docArquivo.name
        .replace(/[\[\]]/g, '') // Remove colchetes
        .replace(/[^\w\s.-]/g, '_') // Substitui outros caracteres especiais por underscore
        .replace(/\s+/g, '_') // Substitui espaços por underscore
      
      // Upload do arquivo
      const fileName = `${processoId}/${Date.now()}_${sanitizedFileName}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('processo-documentos')
        .upload(fileName, docArquivo)

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        setMensagemUpload({ tipo: 'erro', texto: `❌ Erro no upload: ${uploadError.message}` })
        setTimeout(() => setMensagemUpload(null), 5000)
        return
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('processo-documentos')
        .getPublicUrl(fileName)

      // Salvar registro no banco
      const result = await authenticatedFetch(
        `/api/processos-administrativos/${processoId}/documentos`,
        {
          method: 'POST',
          body: JSON.stringify({
            tipo: docTipo,
            descricao: docDescricao,
            arquivo_nome: docArquivo.name,
            arquivo_url: publicUrl,
            arquivo_tamanho: docArquivo.size,
            arquivo_mime_type: docArquivo.type
          })
        }
      )

      if (result.success) {
        setMensagemUpload({ tipo: 'sucesso', texto: '✅ Documento enviado com sucesso!' })
        setDocTipo('')
        setDocDescricao('')
        setDocArquivo(null)
        await loadDadosRelacionados()
        setTimeout(() => setMensagemUpload(null), 3000)
      } else {
        setMensagemUpload({ tipo: 'erro', texto: `❌ Erro ao salvar documento: ${result.message || 'Erro desconhecido'}` })
        setTimeout(() => setMensagemUpload(null), 5000)
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      setMensagemUpload({ tipo: 'erro', texto: `❌ Erro ao fazer upload: ${error.message}` })
      setTimeout(() => setMensagemUpload(null), 5000)
    } finally {
      setUploadingDoc(false)
    }
  }

  // Função para obter signed URL do Supabase (mais seguro)
  async function getSignedUrl(filePath: string): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase não configurado')
    }

    try {
      // Extrair o path do arquivo da URL pública
      const urlParts = filePath.split('/processo-documentos/')
      const path = urlParts[1] || filePath

      // Obter signed URL com validade de 1 hora
      const { data, error } = await supabase.storage
        .from('processo-documentos')
        .createSignedUrl(path, 3600)

      if (error) {
        console.error('Erro ao gerar signed URL:', error)
        // Se falhar, retorna a URL pública original
        return filePath
      }

      return data.signedUrl
    } catch (error) {
      console.error('Erro ao processar signed URL:', error)
      return filePath
    }
  }

  // Função para fazer download do arquivo
  async function handleDownloadArquivo(url: string, fileName: string) {
    try {
      if (!url) {
        alert('Erro: URL do arquivo não encontrada.')
        return
      }

      // Obter signed URL se for do Supabase
      let downloadUrl = url
      if (url.includes('supabase')) {
        downloadUrl = await getSignedUrl(url)
      }

      // Fazer fetch do arquivo
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error(`Erro ao baixar: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      
      // Criar URL temporária
      const blobUrl = window.URL.createObjectURL(blob)
      
      // Criar link temporário e clicar
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName || 'documento'
      document.body.appendChild(link)
      link.click()
      
      // Limpar
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      alert('Erro ao baixar arquivo. Tente novamente.')
    }
  }

  // Função para visualizar arquivo no modal
  async function handleVisualizarArquivo(url: string, fileName: string) {
    try {
      if (!url) {
        alert('Erro: URL do arquivo não encontrada.')
        return
      }

      // Obter signed URL se for do Supabase
      let viewUrl = url
      if (url.includes('supabase')) {
        viewUrl = await getSignedUrl(url)
      }

      // Detectar tipo de arquivo pela extensão
      const extension = fileName.split('.').pop()?.toLowerCase() || ''
      let fileType = 'other'
      
      if (['pdf'].includes(extension)) {
        fileType = 'pdf'
      } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
        fileType = 'image'
      } else if (['doc', 'docx'].includes(extension)) {
        fileType = 'doc'
      }

      setViewerUrl(viewUrl)
      setViewerFileName(fileName)
      setViewerFileType(fileType)
      setViewerOpen(true)
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error)
      alert('Erro ao visualizar arquivo. Tente novamente.')
    }
  }

  async function handleAdicionarMovimentacao() {
    try {
      const result = await authenticatedFetch(
        `/api/processos-administrativos/${processoId}/financeiro`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...novaMovimentacao,
            valor: parseFloat(novaMovimentacao.valor)
          })
        }
      )

      if (result.success) {
        setShowAddMovimentacao(false)
        setNovaMovimentacao({
          tipo: 'debito',
          valor: '',
          data: new Date().toISOString().split('T')[0],
          descricao: '',
          responsavel: ''
        })
        await loadDadosRelacionados()
      }
    } catch (error) {
      console.error('Erro ao adicionar movimentação:', error)
    }
  }

  async function handleAdicionarNota() {
    // Validação dos campos obrigatórios
    if (!novaNota.numero_nota || !novaNota.data_emissao || !novaNota.valor || !novaNota.fornecedor) {
      setMensagemNota({ tipo: 'erro', texto: 'Por favor, preencha todos os campos obrigatórios.' })
      setTimeout(() => setMensagemNota(null), 3000)
      return
    }

    setSalvandoNota(true)
    setMensagemNota(null)

    try {
      let arquivo_url = ''
      let arquivo_nome = ''

      // Upload do arquivo se existir
      if (novaNota.arquivo) {
        if (!supabase) {
          setMensagemNota({ tipo: 'erro', texto: 'Supabase não configurado' })
          return
        }

        await ensureBucketExists()
        
        // Sanitizar nome do arquivo
        const sanitizedFileName = novaNota.arquivo.name
          .replace(/[\[\]]/g, '') // Remove colchetes
          .replace(/[^\w\s.-]/g, '_') // Substitui outros caracteres especiais por underscore
          .replace(/\s+/g, '_') // Substitui espaços por underscore

        const fileName = `${processoId}/notas/${Date.now()}_${sanitizedFileName}`
        
        const { data, error } = await supabase.storage
          .from('processo-documentos')
          .upload(fileName, novaNota.arquivo)

        if (error) {
          console.error('Erro no upload:', error)
          setMensagemNota({ tipo: 'erro', texto: `❌ Erro no upload: ${error.message}` })
          setTimeout(() => setMensagemNota(null), 5000)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('processo-documentos')
          .getPublicUrl(fileName)
        
        arquivo_url = publicUrl
        arquivo_nome = novaNota.arquivo.name
      }

      // Salvar nota fiscal no banco
      const result = await authenticatedFetch(
        `/api/processos-administrativos/${processoId}/notas-fiscais`,
        {
          method: 'POST',
          body: JSON.stringify({
            numero_nota: novaNota.numero_nota,
            data_emissao: novaNota.data_emissao,
            valor: parseFloat(novaNota.valor),
            fornecedor: novaNota.fornecedor,
            observacao: novaNota.observacao,
            arquivo_url,
            arquivo_nome
          })
        }
      )

      if (result.success) {
        setMensagemNota({ tipo: 'sucesso', texto: '✅ Nota fiscal salva com sucesso!' })
        setShowAddNota(false)
        setNovaNota({
          numero_nota: '',
          data_emissao: new Date().toISOString().split('T')[0],
          valor: '',
          fornecedor: '',
          observacao: '',
          arquivo: null
        })
        await loadDadosRelacionados()
        setTimeout(() => setMensagemNota(null), 3000)
      } else {
        setMensagemNota({ tipo: 'erro', texto: `❌ Erro ao salvar: ${result.message || 'Erro desconhecido'}` })
        setTimeout(() => setMensagemNota(null), 5000)
      }
    } catch (error: any) {
      console.error('Erro ao adicionar nota fiscal:', error)
      setMensagemNota({ tipo: 'erro', texto: `❌ Erro ao adicionar nota fiscal: ${error.message}` })
      setTimeout(() => setMensagemNota(null), 5000)
    } finally {
      setSalvandoNota(false)
    }
  }

  // Calcular saldo financeiro
  const calcularSaldoFinanceiro = () => {
    const orcamento = processo?.orcamento_inicial || processo?.valor_estimado || processo?.valor_total || 0
    const totalDebitos = movimentacoes
      .filter(m => m.tipo === 'debito')
      .reduce((sum, m) => sum + m.valor, 0)
    const totalCreditos = movimentacoes
      .filter(m => m.tipo === 'credito')
      .reduce((sum, m) => sum + m.valor, 0)
    
    return {
      orcamento,
      totalDebitos,
      totalCreditos,
      saldo: orcamento + totalCreditos - totalDebitos
    }
  }

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando processo...</p>
        </div>
      </div>
    )
  }

  if (!processo) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold">Processo não encontrado</p>
          <Button className="mt-4" onClick={() => router.back()}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  const saldoFinanceiro = calcularSaldoFinanceiro()

  return (
    <div className="space-y-6">
      {/* Modal de Visualização de Documentos */}
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate flex-1">{viewerFileName}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewerOpen(false)}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {viewerFileType === 'pdf' && (
              <iframe
                src={viewerUrl}
                className="w-full h-full border-0"
                title={viewerFileName}
              />
            )}
            {viewerFileType === 'image' && (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <img
                  src={viewerUrl}
                  alt={viewerFileName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            {viewerFileType === 'doc' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
                <FileText className="h-16 w-16 text-blue-600 mb-4" />
                <p className="text-gray-700 mb-4">Visualização de documentos Word não disponível diretamente.</p>
                <Button onClick={() => handleDownloadArquivo(viewerUrl, viewerFileName)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar para visualizar
                </Button>
              </div>
            )}
            {viewerFileType === 'other' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
                <FileText className="h-16 w-16 text-gray-600 mb-4" />
                <p className="text-gray-700 mb-4">Visualização não disponível para este tipo de arquivo.</p>
                <Button onClick={() => handleDownloadArquivo(viewerUrl, viewerFileName)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar arquivo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            {processo.tipo === 'licitacao' ? (
              <FileText className="h-6 w-6 text-blue-600" />
            ) : (
              <FileSignature className="h-6 w-6 text-green-600" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{processo.numero_processo}</h1>
            <Badge variant="outline" className={processo.tipo === 'licitacao' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}>
              {processo.tipo === 'licitacao' ? 'Licitação' : 'Contrato'}
            </Badge>
            <Badge 
              variant="secondary" 
              className={processo.status === 'em_aberto' ? 'border-transparent bg-green-100 text-green-800 hover:bg-green-200' : ''}
            >
              {processo.status === 'em_aberto' ? 'Processo em Aberto' : processo.status}
            </Badge>
          </div>
          <p className="text-gray-600 mt-1">{processo.objeto}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="notas">Notas Fiscais</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Aba Geral */}
        <TabsContent value="geral" className="space-y-6">
          {/* Informações Principais */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Principais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {processo.tipo === 'licitacao' ? (
                  <>
                    {processo.modalidade && (
                      <div>
                        <p className="text-sm text-gray-600">Modalidade</p>
                        <p className="font-medium">{processo.modalidade}</p>
                      </div>
                    )}
                    {processo.secretaria && (
                      <div>
                        <p className="text-sm text-gray-600">Secretaria</p>
                        <p className="font-medium">{processo.secretaria}</p>
                      </div>
                    )}
                    {processo.responsavel && (
                      <div>
                        <p className="text-sm text-gray-600">Responsável</p>
                        <p className="font-medium">{processo.responsavel}</p>
                      </div>
                    )}
                    {processo.data_abertura && (
                      <div>
                        <p className="text-sm text-gray-600">Data de Abertura</p>
                        <p className="font-medium">{new Date(processo.data_abertura).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {processo.valor_estimado && (
                      <div>
                        <p className="text-sm text-gray-600">Valor Estimado</p>
                        <p className="font-medium">{formatarMoeda(processo.valor_estimado)}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {processo.empresa_contratada && (
                      <div>
                        <p className="text-sm text-gray-600">Empresa Contratada</p>
                        <p className="font-medium">{processo.empresa_contratada}</p>
                      </div>
                    )}
                    {processo.cnpj_contratada && (
                      <div>
                        <p className="text-sm text-gray-600">CNPJ</p>
                        <p className="font-medium">{processo.cnpj_contratada}</p>
                      </div>
                    )}
                    {processo.valor_total && (
                      <div>
                        <p className="text-sm text-gray-600">Valor Total</p>
                        <p className="font-medium">{formatarMoeda(processo.valor_total)}</p>
                      </div>
                    )}
                    {processo.data_assinatura && (
                      <div>
                        <p className="text-sm text-gray-600">Data de Assinatura</p>
                        <p className="font-medium">{new Date(processo.data_assinatura).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {processo.data_inicio_vigencia && (
                      <div>
                        <p className="text-sm text-gray-600">Início da Vigência</p>
                        <p className="font-medium">{new Date(processo.data_inicio_vigencia).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                    {processo.data_fim_vigencia && (
                      <div>
                        <p className="text-sm text-gray-600">Fim da Vigência</p>
                        <p className="font-medium">{new Date(processo.data_fim_vigencia).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {processo.observacoes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">Observações Gerais</p>
                  <p className="mt-1 text-gray-900">{processo.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observações/Comentários */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Observações e Comentários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de Observações */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {observacoes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma observação registrada</p>
                ) : (
                  observacoes.map((obs) => (
                    <div key={obs.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{obs.usuario_nome}</p>
                          <p className="text-sm text-gray-600 mt-1">{obs.conteudo}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(obs.created_at).toLocaleDateString('pt-BR')} {new Date(obs.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Adicionar Nova Observação */}
              <div className="border-t pt-4 space-y-3">
                <Textarea
                  placeholder="Escreva uma observação..."
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  rows={3}
                  disabled={enviandoObservacao}
                />
                
                {mensagemObservacao && (
                  <div className={`p-3 rounded-lg ${
                    mensagemObservacao.tipo === 'sucesso' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {mensagemObservacao.texto}
                  </div>
                )}

                <Button
                  onClick={handleAdicionarObservacao}
                  disabled={enviandoObservacao || !novaObservacao.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {enviandoObservacao ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Adicionar Observação
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upload de Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Documentos Anexados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de Documentos */}
              {documentos.length > 0 && (
                <div className="space-y-2 mb-4">
                  {documentos.map((doc) => {
                    // Validar se documento tem URL válida
                    const hasValidUrl = doc.arquivo_url && doc.arquivo_url.trim() !== ''
                    
                    return (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-5 w-5 text-gray-600" />
                          <div className="flex-1">
                            <p className="text-base font-semibold text-gray-900">{doc.tipo}</p>
                            <p className="text-xs text-gray-500">{doc.arquivo_nome}</p>
                            <p className="text-xs text-gray-600 mt-1">{doc.descricao}</p>
                            {!hasValidUrl && (
                              <p className="text-xs text-red-500 mt-1">⚠️ URL do arquivo não disponível</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasValidUrl ? (
                            <>
                              {/* Botão de visualização */}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleVisualizarArquivo(doc.arquivo_url, doc.arquivo_nome)}
                                title="Visualizar documento"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              {/* Botão de download */}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDownloadArquivo(doc.arquivo_url, doc.arquivo_nome)}
                                title="Baixar arquivo"
                              >
                                <Download className="h-4 w-4 text-green-600" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Arquivo indisponível</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Formulário de Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="docTipo">Tipo de Documento *</Label>
                  <Input
                    id="docTipo"
                    placeholder="Ex: Nota Fiscal, Comprovante"
                    value={docTipo}
                    onChange={(e) => setDocTipo(e.target.value)}
                    disabled={uploadingDoc}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docArquivo">Arquivo *</Label>
                  <Input
                    id="docArquivo"
                    type="file"
                    onChange={(e) => setDocArquivo(e.target.files?.[0] || null)}
                    disabled={uploadingDoc}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="docDescricao">Descrição *</Label>
                <Textarea
                  id="docDescricao"
                  placeholder="Descreva o documento..."
                  value={docDescricao}
                  onChange={(e) => setDocDescricao(e.target.value)}
                  rows={2}
                  disabled={uploadingDoc}
                />
              </div>

              {mensagemUpload && (
                <div className={`p-3 rounded-lg ${
                  mensagemUpload.tipo === 'sucesso' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {mensagemUpload.texto}
                </div>
              )}

              <Button
                onClick={handleUploadDocumento}
                disabled={uploadingDoc || !docTipo || !docDescricao || !docArquivo}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {uploadingDoc ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar Documento
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Financeiro */}
        <TabsContent value="financeiro" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Controle de Verba
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Orçamento Inicial</p>
                  <p className="text-2xl font-bold text-blue-900">{formatarMoeda(saldoFinanceiro.orcamento)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Total Débitos</p>
                  <p className="text-2xl font-bold text-red-900">{formatarMoeda(saldoFinanceiro.totalDebitos)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Créditos</p>
                  <p className="text-2xl font-bold text-green-900">{formatarMoeda(saldoFinanceiro.totalCreditos)}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Saldo Atual</p>
                  <p className="text-2xl font-bold text-purple-900">{formatarMoeda(saldoFinanceiro.saldo)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Movimentações</h3>
                <Button onClick={() => setShowAddMovimentacao(!showAddMovimentacao)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Movimentação
                </Button>
              </div>

              {showAddMovimentacao && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Tipo *</Label>
                      <select
                        className="w-full mt-1 p-2 border rounded"
                        value={novaMovimentacao.tipo}
                        onChange={(e) => setNovaMovimentacao({...novaMovimentacao, tipo: e.target.value as 'credito' | 'debito'})}
                      >
                        <option value="debito">Débito</option>
                        <option value="credito">Crédito</option>
                      </select>
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novaMovimentacao.valor}
                        onChange={(e) => setNovaMovimentacao({...novaMovimentacao, valor: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={novaMovimentacao.data}
                        onChange={(e) => setNovaMovimentacao({...novaMovimentacao, data: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Responsável</Label>
                      <Input
                        value={novaMovimentacao.responsavel}
                        onChange={(e) => setNovaMovimentacao({...novaMovimentacao, responsavel: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição *</Label>
                    <Textarea
                      value={novaMovimentacao.descricao}
                      onChange={(e) => setNovaMovimentacao({...novaMovimentacao, descricao: e.target.value})}
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAdicionarMovimentacao} className="flex-1">Salvar</Button>
                    <Button variant="outline" onClick={() => setShowAddMovimentacao(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {movimentacoes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma movimentação registrada</p>
                ) : (
                  movimentacoes.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={mov.tipo === 'credito' ? 'default' : 'destructive'}>
                            {mov.tipo === 'credito' ? 'Crédito' : 'Débito'}
                          </Badge>
                          <span className="font-medium">{formatarMoeda(mov.valor)}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{mov.descricao}</p>
                        {mov.responsavel && (
                          <p className="text-xs text-gray-500">Responsável: {mov.responsavel}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{new Date(mov.data).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Notas Fiscais */}
        <TabsContent value="notas" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Notas Fiscais
                </CardTitle>
                <Button onClick={() => setShowAddNota(!showAddNota)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Nota Fiscal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddNota && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>Número da Nota *</Label>
                      <Input
                        value={novaNota.numero_nota}
                        onChange={(e) => setNovaNota({...novaNota, numero_nota: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Data de Emissão *</Label>
                      <Input
                        type="date"
                        value={novaNota.data_emissao}
                        onChange={(e) => setNovaNota({...novaNota, data_emissao: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Valor *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novaNota.valor}
                        onChange={(e) => setNovaNota({...novaNota, valor: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Fornecedor *</Label>
                      <Input
                        value={novaNota.fornecedor}
                        onChange={(e) => setNovaNota({...novaNota, fornecedor: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Arquivo (PDF/Imagem)</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setNovaNota({...novaNota, arquivo: e.target.files?.[0] || null})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Observação</Label>
                    <Textarea
                      value={novaNota.observacao}
                      onChange={(e) => setNovaNota({...novaNota, observacao: e.target.value})}
                      rows={2}
                    />
                  </div>

                  {mensagemNota && (
                    <div className={`p-3 rounded-lg ${
                      mensagemNota.tipo === 'sucesso' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      {mensagemNota.texto}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAdicionarNota} 
                      className="flex-1"
                      disabled={salvandoNota}
                    >
                      {salvandoNota ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddNota(false)}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Histórico de Notas Fiscais */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold mb-3">Histórico de Notas Fiscais</h3>
                {notasFiscais.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhuma nota fiscal registrada</p>
                ) : (
                  notasFiscais.map((nota) => (
                    <div key={nota.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">NF {nota.numero_nota}</span>
                          <span className="text-green-600 font-semibold">{formatarMoeda(nota.valor)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{nota.descricao}</p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm text-gray-600">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</p>
                        </div>
                        {nota.url_arquivo && nota.nome_arquivo && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleVisualizarArquivo(nota.url_arquivo!, nota.nome_arquivo!)}
                              title="Visualizar nota fiscal"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDownloadArquivo(nota.url_arquivo!, nota.nome_arquivo!)}
                              title="Baixar nota fiscal"
                            >
                              <Download className="h-4 w-4 text-green-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="historico" className="space-y-6">
          <Card className="flex flex-col gap-6 rounded-xl border py-6 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Alterações
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Log imutável de todas as alterações realizadas neste processo
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historico.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Nenhuma alteração registrada</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Todas as alterações feitas neste processo serão registradas aqui
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historico.map((item) => {
                      // Definir cor da borda baseado na aba
                      const borderColor = 
                        item.aba === 'geral' ? 'border-blue-500' :
                        item.aba === 'financeiro' ? 'border-green-500' :
                        item.aba === 'notas_fiscais' ? 'border-purple-500' :
                        'border-gray-500'
                      
                      // Definir cor do badge baseado na ação
                      const badgeColor = 
                        item.acao === 'criou' ? 'bg-green-100 text-green-800' :
                        item.acao === 'alterou' ? 'bg-blue-100 text-blue-800' :
                        item.acao === 'deletou' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'

                      return (
                        <div 
                          key={item.id} 
                          className={`border-l-4 ${borderColor} bg-gray-50 rounded-r-lg p-4 hover:bg-gray-100 transition-colors`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              {/* Cabeçalho com aba e ação */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {item.aba === 'geral' ? 'Geral' :
                                   item.aba === 'financeiro' ? 'Financeiro' :
                                   item.aba === 'notas_fiscais' ? 'Notas Fiscais' :
                                   item.aba}
                                </Badge>
                                <Badge className={`text-xs ${badgeColor}`}>
                                  {item.acao === 'criou' ? 'Criou' :
                                   item.acao === 'alterou' ? 'Alterou' :
                                   item.acao === 'deletou' ? 'Deletou' :
                                   item.acao}
                                </Badge>
                              </div>

                              {/* Descrição da ação */}
                              <p className="text-sm font-medium text-gray-900">
                                {item.descricao}
                              </p>

                              {/* Detalhes da alteração (se houver) */}
                              {item.campo_alterado && (
                                <div className="text-xs text-gray-600 space-y-1 bg-white p-2 rounded border">
                                  <p className="font-medium">Campo alterado: <span className="text-blue-600">{item.campo_alterado}</span></p>
                                  {item.valor_anterior && (
                                    <p>Valor anterior: <span className="line-through text-red-600">{item.valor_anterior}</span></p>
                                  )}
                                  {item.valor_novo && (
                                    <p>Novo valor: <span className="font-medium text-green-600">{item.valor_novo}</span></p>
                                  )}
                                </div>
                              )}

                              {/* Usuário */}
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <User className="h-3 w-3" />
                                <span>{item.usuario_nome}</span>
                              </div>
                            </div>

                            {/* Data e hora */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-600 font-medium">
                                {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(item.criado_em).toLocaleTimeString('pt-BR', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Informação sobre imutabilidade */}
              {historico.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">Registro Imutável</p>
                      <p className="text-blue-700 mt-1">
                        Este histórico é permanente e não pode ser editado ou excluído. 
                        Todas as alterações são registradas automaticamente para fins de auditoria.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
