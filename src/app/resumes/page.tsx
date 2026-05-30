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
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumes'|'covers'>('resumes')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadRegion, setUploadRegion] = useState<'india'|'ireland'>('india')
  const [uploadName, setUploadName] = useState('')
  const [uploadContent, setUploadContent] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.from('resumes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('cover_letters').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])
    if (r) setResumes(r)
    if (c) setCoverLetters(c)
    setLoading(false)
  }

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Read file content
    // For PDFs, store file name only — content extracted server-side
    // For text/doc files, read as text
    let text = ''
    if (file.type === 'application/pdf') {
      text = `[PDF Resume: ${file.name}]`
    } else {
      text = await file.text()
    }
    const name = uploadName || file.name.replace(/\.[^.]+$/, '')

    // Upload to Supabase Storage (non-blocking — save to DB regardless)
    let fileUrl: string | undefined
    try {
      const path = `${user.id}/resumes/${Date.now()}_${file.name}`
      const { data: storageData, error: storageError } = await supabase.storage.from('documents').upload(path, file)
      if (storageError) console.warn('Storage upload failed, saving content only:', storageError.message)
      if (storageData?.path) {
        fileUrl = supabase.storage.from('documents').getPublicUrl(storageData.path).data.publicUrl
      }
    } catch (e) {
      console.warn('Storage error:', e)
    }

    const { error } = await supabase.from('resumes').insert({
      user_id: user.id,
      name,
      region: uploadRegion,
      content: text,
      file_url: fileUrl,
      file_name: file.name,
      is_base: resumes.filter(r => r.region === uploadRegion && r.is_base).length === 0,
      word_count: text.split(/\s+/).length,
      version: 1,
    })

    if (error) { console.error('DB insert error:', error); toast.error('Upload failed: ' + error.message) }
    else { toast.success('Resume uploaded!'); load() }
    setUploading(false)
    setShowUpload(false)
  }, [uploadRegion, uploadName, resumes])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/msword': ['.doc'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  })

  async function setBase(id: string, region: string, table: 'resumes'|'cover_letters') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Unset all bases for this region
    await supabase.from(table).update({ is_base: false }).eq('user_id', user.id).eq('region', region)
    // Set new base
    await supabase.from(table).update({ is_base: true }).eq('id', id)
    load()
    toast.success('Set as base version')
  }

  async function deleteDoc(id: string, table: 'resumes'|'cover_letters') {
    if (!confirm('Delete this document?')) return
    await supabase.from(table).delete().eq('id', id)
    load()
    toast.success('Deleted')
  }

  const tabs = [
    { key: 'resumes', label: 'Resumes', count: resumes.length },
    { key: 'covers', label: 'Cover Letters', count: coverLetters.length },
  ]

  const DocCard = ({ doc, table }: { doc: Resume | CoverLetter, table: 'resumes'|'cover_letters' }) => (
    <div className={cn('card p-4 transition-all', doc.is_base && 'ring-1 ring-brand-400')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', doc.region === 'india' ? 'bg-india-50' : 'bg-ireland-50')}>
            <FileText size={15} className={doc.region === 'india' ? 'text-india-600' : 'text-ireland-600'} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 truncate">{doc.name}</span>
              {doc.is_base && (
                <span className="badge badge-brand text-[10px] flex-shrink-0">
                  <Star size={9} /> Base
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              <span>{doc.region === 'india' ? '🇮🇳 India' : '🇮🇪 Ireland'}</span>
              <span>·</span>
              {'word_count' in doc && doc.word_count && <span>{doc.word_count} words</span>}
              <span>·</span>
              <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(doc.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!doc.is_base && (
            <button onClick={() => setBase(doc.id, doc.region, table)} className="btn-ghost p-1.5 text-gray-400 hover:text-brand-600" title="Set as base">
              <Star size={14} />
            </button>
          )}
          <button className="btn-ghost p-1.5 text-gray-400 hover:text-gray-700" title="Preview">
            <Eye size={14} />
          </button>
          <button onClick={() => deleteDoc(doc.id, table)} className="btn-ghost p-1.5 text-gray-400 hover:text-red-600" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {doc.content && (
        <div className="mt-3 text-xs text-gray-400 bg-gray-50 rounded-lg p-2.5 font-mono leading-relaxed line-clamp-2">
          {doc.content.slice(0, 200)}...
        </div>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Resumes & Cover Letters</h1>
          <button onClick={() => setShowUpload(!showUpload)} className="btn-brand text-sm px-3 py-1.5">
            <Plus size={14} /> Upload
          </button>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div className="card p-5 space-y-3 border-brand-200 bg-brand-50/30">
            <h2 className="text-sm font-semibold text-gray-700">Upload new document</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="e.g. India Resume v2" className="input text-sm" />
              </div>
              <div>
                <label className="label">Region</label>
                <select value={uploadRegion} onChange={e => setUploadRegion(e.target.value as any)} className="input text-sm">
                  <option value="india">🇮🇳 India</option>
                  <option value="ireland">🇮🇪 Ireland / Europe</option>
                </select>
              </div>
            </div>
            <div {...getRootProps()} className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isDragActive ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
            )}>
              <input {...getInputProps()} />
              <Upload size={24} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {uploading ? 'Uploading...' : isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, TXT</p>
            </div>
            <p className="text-xs text-gray-400 text-center">Or paste content directly — the AI uses the text version for tailoring</p>
            <textarea
              value={uploadContent}
              onChange={e => setUploadContent(e.target.value)}
              rows={6}
              placeholder="Paste your resume/cover letter text here..."
              className="input text-xs font-mono resize-none"
            />
            {uploadContent && (
              <button
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser()
                  if (!user || !uploadContent.trim()) return
                  const name = uploadName || `${activeTab === 'resumes' ? 'Resume' : 'Cover Letter'} ${uploadRegion} ${new Date().toLocaleDateString()}`
                  const table = activeTab === 'resumes' ? 'resumes' : 'cover_letters'
                  await supabase.from(table).insert({
                    user_id: user.id, name, region: uploadRegion, content: uploadContent,
                    is_base: false, word_count: uploadContent.split(/\s+/).length,
                  })
                  toast.success('Saved!')
                  setUploadContent(''); setUploadName(''); setShowUpload(false); load()
                }}
                className="btn-brand text-sm w-full py-2"
              >
                Save pasted content
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
                activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label} <span className="text-xs opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Region sections */}
        {loading ? (
          <div className="space-y-3">{[1,2].map(i=><div key={i} className="skeleton h-24 rounded-xl"/>)}</div>
        ) : (
          ['india','ireland'].map(region => {
            const docs = activeTab === 'resumes'
              ? resumes.filter(r => r.region === region)
              : coverLetters.filter(c => c.region === region)
            return (
              <div key={region}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{region === 'india' ? '🇮🇳' : '🇮🇪'}</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {region === 'india' ? 'India' : 'Ireland / Europe'}
                  </span>
                  <span className="text-xs text-gray-400">({docs.length})</span>
                </div>
                {docs.length === 0 ? (
                  <div className="card p-6 text-center border-dashed">
                    <p className="text-sm text-gray-400">No {activeTab === 'resumes' ? 'resume' : 'cover letter'} for {region} yet</p>
                    <button onClick={() => { setUploadRegion(region as any); setShowUpload(true) }} className="text-xs text-brand-600 mt-1">
                      Upload one →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.map(doc => (
                      <DocCard key={doc.id} doc={doc} table={activeTab === 'resumes' ? 'resumes' : 'cover_letters'} />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </AppLayout>
  )
}
