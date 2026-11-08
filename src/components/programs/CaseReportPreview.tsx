import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n, type AppLanguage } from '../../lib/i18n'
import type { CaseReportData } from '../../lib/programs/case-report'
import '../../styles/case-report-print.css'

type PrintCopy = { preview: string; close: string; print: string; advice: string; saved: string; failed: string; docs: string; document: string; status: string; note: string; none: string; generated: string }
const copy: Record<AppLanguage, PrintCopy> = {
  en: { preview: 'Case report preview', close: 'Close report preview', print: 'Print / Save as PDF', advice: 'On mobile, select Save as PDF from browser print options if supported. Keep the file private.', saved: 'This report uses last saved case data. Save review edits before printing.', failed: 'Printing is unavailable. Try your browser Share or Print menu, or a desktop browser.', docs: 'Document Verification', document: 'Document', status: 'Status', note: 'Admin Note', none: 'No documents uploaded.', generated: 'Generated' },
  ur: { preview: 'کیس رپورٹ کا پیش منظر', close: 'رپورٹ بند کریں', print: 'پرنٹ / PDF محفوظ کریں', advice: 'موبائل پر پرنٹ کے اختیارات میں Save as PDF منتخب کریں، اگر دستیاب ہو۔ فائل نجی رکھیں۔', saved: 'یہ رپورٹ آخری محفوظ شدہ معلومات پر مبنی ہے۔ پرنٹ سے پہلے تبدیلیاں محفوظ کریں۔', failed: 'اس براؤزر میں پرنٹ دستیاب نہیں۔ شیئر یا پرنٹ مینو استعمال کریں۔', docs: 'دستاویزات کی تصدیق', document: 'دستاویز', status: 'حیثیت', note: 'ایڈمن نوٹ', none: 'کوئی دستاویز اپ لوڈ نہیں ہوئی۔', generated: 'تیار کردہ' },
  sd: { preview: 'ڪيس رپورٽ جو ڏيک', close: 'رپورٽ بند ڪريو', print: 'پرنٽ / PDF محفوظ ڪريو', advice: 'موبائل تي Save as PDF چونڊيو، جيڪڏهن دستياب هجي. فائل خانگي رکو.', saved: 'رپورٽ آخري محفوظ ڪيل معلومات تي ٻڌل آهي. پرنٽ کان اڳ تبديليون محفوظ ڪريو.', failed: 'هن برائوزر ۾ پرنٽ دستياب ناهي. شيئر يا پرنٽ مينيو استعمال ڪريو.', docs: 'دستاويزن جي تصديق', document: 'دستاويز', status: 'حيثيت', note: 'ايڊمن نوٽ', none: 'ڪا به دستاويز اپ لوڊ نه ٿي آهي.', generated: 'تيار ڪيل' },
}

export function CaseReportPreview({ report, onClose }: { report: CaseReportData | null; onClose: () => void }) {
  const { language } = useI18n()
  const t = copy[language]
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeCallback = useRef(onClose)
  const [failed, setFailed] = useState(false)
  useEffect(() => { closeCallback.current = onClose }, [onClose])
  useEffect(() => { setFailed(false) }, [report])
  useEffect(() => {
    if (!report || typeof document === 'undefined') return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    const previousTitle = document.title
    document.body.style.overflow = 'hidden'
    document.title = report.type === 'health' ? 'JWAS Health Case Report' : 'JWAS Welfare Case Report'
    closeRef.current?.focus()
    function handleKeys(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeCallback.current() }
      if (event.key !== 'Tab') return
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
      if (!buttons?.length) return
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeys)
    return () => {
      document.removeEventListener('keydown', handleKeys)
      document.body.style.overflow = previousOverflow
      document.title = previousTitle
      previousFocus?.focus()
    }
  }, [report])
  if (!report || typeof document === 'undefined') return null
  function printReport() {
    setFailed(false)
    try { if (typeof window.print !== 'function') throw new Error('print unavailable'); window.print() }
    catch { setFailed(true) }
  }
  return createPortal(
    <div id="jas-case-report-portal">
      <div className="jas-case-report-overlay">
        <section role="dialog" aria-modal="true" aria-labelledby="jas-case-report-heading" dir={language === 'en' ? 'ltr' : 'rtl'} ref={dialogRef} className="jas-case-report-dialog">
          <header className="jas-case-report-controls">
            <h2 id="jas-case-report-heading">{t.preview}</h2>
            <p>{t.saved}</p>
            <div className="jas-case-report-actions">
              <button ref={closeRef} type="button" onClick={onClose}>{t.close}</button>
              <button type="button" onClick={printReport}>{t.print}</button>
            </div>
            <p>{t.advice}</p>
            {failed ? <p role="alert">{t.failed}</p> : null}
          </header>
          <article className="jas-case-report-paper" dir="auto" aria-label={report.title}>
            <h1>{report.title}</h1>
            <p className="jas-case-report-meta">{report.reference} · {t.generated}: {report.generatedAt}</p>
            <p className="jas-case-report-confidential">{report.confidential}</p>
            <table aria-label={`${report.type} case summary`}><tbody>{report.fields.map(([label, value], index) => <tr key={`${label}-${index}`}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table>
            {report.sections.map((section, index) => <section className="jas-case-report-section" key={`${section.title}-${index}`}><h2>{section.title}</h2><p>{section.text}</p></section>)}
            {report.documents ? <section className="jas-case-report-section"><h2>{t.docs}</h2><table aria-label={t.docs}><thead><tr><th scope="col">{t.document}</th><th scope="col">{t.status}</th><th scope="col">{t.note}</th></tr></thead><tbody>{report.documents.length ? report.documents.map((doc, i) => <tr key={i}><td>{doc.label}</td><td>{doc.status}</td><td>{doc.note}</td></tr>) : <tr><td colSpan={3}>{t.none}</td></tr>}</tbody></table></section> : null}
          </article>
        </section>
      </div>
    </div>, document.body)
}
