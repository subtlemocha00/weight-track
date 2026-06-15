import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { AppHeader } from '../components/AppHeader'
import { ImportPreview } from '../features/import/ImportPreview'
import { MOCK_IMPORT } from '../features/import/mockImport'
import {
  prepareImportPreview,
  saveImportedRoutines
} from '../features/import/pipeline'
import styles from './ImportPreviewPage.module.css'

/**
 * Import preview screen — the mandatory checkpoint every import passes through
 * before saving.
 *
 * Receives a raw import via router state from the import screen; falls back to
 * the mock payload so the page is demonstrable on a direct visit. Runs the
 * read-only pipeline (normalize → validate → resolve) on mount, renders the
 * shared <ImportPreview>, and on Import builds + saves standard routines.
 */
export function ImportPreviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const rawImport = location.state?.rawImport ?? MOCK_IMPORT
  // Row-level skips reported by the parser (empty for the sample/mock path).
  const skipped = location.state?.skipped ?? []

  const [model, setModel] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setModel(null)

    prepareImportPreview(rawImport, user.uid)
      .then((result) => {
        if (!cancelled) setModel(result)
      })
      .catch((err) => {
        if (cancelled) return
        // A failure here is unexpected (the read-only pipeline is pure aside
        // from one custom-exercise read). Surface it as an empty, invalid model.
        setModel({
          normalized: null,
          validation: {
            valid: false,
            errors: [
              { path: 'Import', message: err?.message || 'Failed to prepare import.' }
            ],
            warnings: []
          },
          resolved: { name: '', days: [], summary: { builtin: 0, custom: 0, notFound: 0 } }
        })
      })

    return () => {
      cancelled = true
    }
  }, [user, rawImport])

  const handleCancel = useCallback(() => {
    navigate('/import')
  }, [navigate])

  const handleImport = useCallback(async () => {
    if (!user || !model?.validation?.valid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      const saved = await saveImportedRoutines(user.uid, model.resolved)
      // Land on the first imported routine so it's immediately visible and
      // editable, exactly like a freshly created one.
      if (saved.length > 0) {
        navigate(`/routine/${saved[0].id}`, { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    } catch (err) {
      setSaveError(err?.message || 'Failed to save the imported routine.')
      setSaving(false)
    }
  }, [user, model, saving, navigate])

  return (
    <section className={styles.page}>
      <AppHeader title="Import Preview" backTo="/import" />

      {model === null ? (
        <div className={styles.loading}>Preparing preview…</div>
      ) : (
        <ImportPreview
          resolved={model.resolved}
          validation={model.validation}
          skipped={skipped}
          saving={saving}
          error={saveError}
          onImport={handleImport}
          onCancel={handleCancel}
        />
      )}
    </section>
  )
}
