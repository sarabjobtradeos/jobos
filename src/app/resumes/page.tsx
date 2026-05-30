'use client'
import { useState, useEffect, useCallback } from 'react'
import AppLayout from '@/components/AppLayout'
import { supabase } from '@/lib/supabase'
import { Resume, CoverLetter } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Trash2, Star, Eye, Plus, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [tab, setTab] = useState<'resumes' | 'cover_letters'>('resumes')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadRegion, setUploadRegion] = useState<'india'|'ireland'>('india')
  const [uploadName, setUploadName] = useState('')
  const [previewDoc, setPreviewDoc] = useState<{name: string, content: string} | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: r }, { data: cl }] = await Promise.all([
      supabase.from('resumes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    setResumes(r || [])
    setCoverLetters(cl || [])
  }

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not logged in'); setUploading(false); return }

    const name = uploadName || file.name.replace(/\.[^.]+$/, '')

    // Extract text using FileReader — works for any file type, no server needed
    let text = ''
    try {
      text = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string || ''
          // Clean up binary/non-printable characters from PDF
          const cleaned = result
            .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
            .replace(/\s{3,}/g, '\n')
            .trim()
          resolve(cleaned)
        }
        reader.onerror = () => resolve('')
        reader.readAsText(file, 'utf-8')
      })
    } catch (e) {
      text = ''
    }

    // Upload file to storage
    let fileUrl: string | undefined
    try {
      const path = `${user.id}/resumes/${Date.now()}_${file.name}`
      const { data: storageData } = await supabase.storage.from('documents').upload(path, file)
      if (storageData?.path) {
        fileUrl = supabase.storage.from('documents').getPublicUrl(storageData.path).data.publicUrl
      }
    } catch (e) {
      console.warn('Storage upload failed:', e)
    }

    const { error } = await supabase.from('resumes').insert({
      user_id: user.id,
      name,
      region: uploadRegion,
      content: text || `Resume: ${file.name}`,
      file_url: fileUrl,
      file_name: file.name,
      is_base: resumes.filter(r => r.region === uploadRegion && r.is_base).length === 0,
      word_count: text.split(/\s+/).filter(Boolean).length,
      version: 1,
    })

    if (error) {
      console.error('Insert error:', error)
      toast.error('Upload failed: ' + error.message)
    } else {
      toast.success('Resume uploaded!')
      load()
      setShowUpload(false)
      setUploadName('')
    }
    setUploading(false)
  }, [uploadRegion, uploadName, resumes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  async function setBase(id: string, region: string, table: 'resumes' | 'cover_letters') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from(table).update({ is_base: false }).eq('user_id', user.id).eq('region', region)
    await supabase.from(table).update({ is_base: true }).eq('id', id)
    load()
  }

  async function deleteDoc(id: string, table: 'resumes' | 'cover_letters') {
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  const docs = tab === 'resumes' ? resumes : coverLetters
  const table = tab === 'resumes' ? 'resumes' : 'cover_letters'

  const indiaItems = docs.filter(d => d.region === 'india')
  const irelandItems = docs.filter(d => d.region === 'ireland')

  function DocCard({ doc }: { doc: any }) {
    return (
      <div className={cn('card p-4 transition-all', doc.is_base && 'ring-2 ring-brand-400')}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
            <FileText size={16} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">{doc.name}</span>
              {doc.is_base && (
                <span className="flex items-center gap-1 text-[10px] font-medium bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Star size={9} /> Base
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
              <span>{doc.region === 'india' ? '🇮🇳 India' : '🇮🇪 Ireland'}</span>
              <span>·</span>
              <span>{doc.word_count > 3 ? `${doc.word_count} words` : 'Upload again to extract'}</span>
              <span>·</span>
              <Clock size={10} />
              <span>{formatDate(doc.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!doc.is_base && (
              <button onClick={() => setBase(doc.id, doc.region, table)} className="btn-ghost p-1.5 text-gray-400 hover:text-brand-600" title="Set as base">
                <Star size={14} />
              </button>
            )}
            <button
              className="btn-ghost p-1.5 text-gray-400 hover:text-gray-700"
              title="Preview"
              onClick={() => setPreviewDoc({ name: doc.name, content: doc.content })}
            >
              <Eye size={14} />
            </button>
            <button onClick={() => deleteDoc(doc.id, table)} className="btn-ghost p-1.5 text-gray-400 hover:text-red-600" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {doc.content && doc.content.length > 10 && (
          <div className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 font-mono leading-relaxed line-clamp-2">
            {doc.content.slice(0, 150)}...
          </div>
        )}
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Resumes & Cover Letters</h1>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-brand text-sm px-3 py-2">
            <Plus size={14} /> Upload
          </button>
        </div>

        {/* Upload form */}
        {showUpload && (
          <div className="card p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                placeholder="e.g. India Resume v2"
                className="input text-sm"
              />
              <select
                value={uploadRegion}
                onChange={e => setUploadRegion(e.target.value as any)}
                className="input text-sm"
              >
                <option value="india">🇮🇳 India</option>
                <option value="ireland">🇮🇪 Ireland / Europe</option>
              </select>
            </div>
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
                isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
              )}
            >
              <input {...getInputProps()} />
              <Upload size={20} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {uploading ? 'Uploading...' : isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setTab('resumes')} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'resumes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            Resumes ({resumes.length})
          </button>
          <button onClick={() => setTab('cover_letters')} className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-all', tab === 'cover_letters' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>
            Cover Letters ({coverLetters.length})
          </button>
        </div>

        {/* India section */}
        {indiaItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">India (1)</div>
            {indiaItems.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>
        )}

        {/* Ireland section */}
        {irelandItems.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Ireland / Europe ({irelandItems.length})</div>
            {irelandItems.map(doc => <DocCard key={doc.id} doc={doc} />)}
          </div>
        )}

        {docs.length === 0 && (
          <div className="card p-8 text-center">
            <FileText size={24} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No {tab === 'resumes' ? 'resumes' : 'cover letters'} yet</p>
            <button onClick={() => setShowUpload(true)} className="btn-brand text-sm px-4 py-2 mt-3">
              <Plus size={14} /> Upload your first one
            </button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">{previewDoc.name}</h2>
              <button onClick={() => setPreviewDoc(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {previewDoc.content && previewDoc.content.length > 10
                  ? previewDoc.content
                  : 'No text extracted. Delete and re-upload this resume.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
