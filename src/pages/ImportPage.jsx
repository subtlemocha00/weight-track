import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { downloadTemplate } from '../features/import/downloadTemplate'
import { parseXlsxFile } from '../features/import/parseXlsx'
import { MOCK_IMPORT } from '../features/import/mockImport'
import styles from './ImportPage.module.css'

/**
 * Import screen — entry point to the import workflow.
 *
 * Accepts a .xlsx upload, parses it into a RawImport, and hands it to the
 * shared preview screen. Structural parse errors are shown here, before the
 * preview stage; row-level data issues are caught by the validator on preview.
 */
export function ImportPage() {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [parsing, setParsing] = useState(false)

  const openFilePicker = () => {
    setError('')
    inputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    // Reset so picking the same file again re-fires onChange.
    event.target.value = ''
    if (!file) return

    setError('')
    setParsing(true)
    try {
      const { raw, skipped } = await parseXlsxFile(file, {
        fallbackName: deriveRoutineName(file.name)
      })
      navigate('/import/preview', { state: { rawImport: raw, skipped } })
    } catch (err) {
      setError(err?.message || 'Could not read this spreadsheet.')
    } finally {
      setParsing(false)
    }
  }

  const previewSample = () => {
    navigate('/import/preview', { state: { rawImport: MOCK_IMPORT } })
  }

  return (
    <section className={styles.page}>
      <AppHeader title="Import Routine" />

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Import method</span>

        <div className={styles.method}>
          <div className={styles.methodHead}>
            <span className={styles.methodName}>XLSX Spreadsheet</span>
          </div>
          <p className={styles.methodDesc}>
            Upload a filled-in <code>.xlsx</code> spreadsheet using the template
            below. You&rsquo;ll review everything on the next screen before
            anything is saved.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileChange}
            hidden
          />

          <div className={styles.methodActions}>
            <button
              type="button"
              className={styles.selectFile}
              onClick={openFilePicker}
              disabled={parsing}
            >
              {parsing ? 'Reading…' : 'Select File'}
            </button>
            <button
              type="button"
              className={styles.previewSample}
              onClick={previewSample}
              disabled={parsing}
            >
              Preview sample import →
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Template</span>
        <div className={styles.templateRow}>
          <div className={styles.templateInfo}>
            <span className={styles.templateName}>Import template</span>
            <span className={styles.templateHint}>
              Columns: Day · Exercise · Sets · Reps · Weight · Notes
            </span>
          </div>
          <button
            type="button"
            className={styles.download}
            onClick={downloadTemplate}
          >
            Download Template
          </button>
        </div>
      </div>
    </section>
  )
}

/** Spreadsheets carry no routine-name column; derive a sensible one from the filename. */
function deriveRoutineName(filename) {
  return filename
    .replace(/\.xlsx$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
}
