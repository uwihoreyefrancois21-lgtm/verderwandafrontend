
import { useState } from 'react'

export default function TermsModal({ terms, onAccept, onClose }) {
  const [agreed, setAgreed] = useState(false)

  if (!terms || terms.length === 0) {
    return (
      <div className="modalOverlay" onClick={onClose}>
        <div className="modalContent" onClick={(e) => e.stopPropagation()}>
          <div className="modalHeader">
            <h3 className="modalTitle">Terms & Conditions</h3>
            <button className="modalClose" onClick={onClose}>×</button>
          </div>
          <div className="modalBody">
            <p>No active terms available.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent modalLarge" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h3 className="modalTitle">Terms & Conditions</h3>
          <button className="modalClose" onClick={onClose}>×</button>
        </div>
        <div className="modalBody">
          {terms.map((term) => (
            <div key={term.term_id} className="termItem">
              <h4>{term.title} (Version {term.version})</h4>
              <div className="termContent" dangerouslySetInnerHTML={{ __html: term.content.replace(/\n/g, '<br>') }} />

              {/* Required agreement checkbox */}
              <div className="termsAgreement" style={{ marginTop: 16, marginBottom: 16 }}>
                <label className="checkRow">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                  />
                  <span style={{ fontWeight: 600 }}>I have read and agree to the Terms & Conditions *</span>
                </label>
              </div>

              <button
                className="btn btnPrimary"
                onClick={() => onAccept(term.term_id)}
                disabled={!agreed}
              >
                I Agree to This Version
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}