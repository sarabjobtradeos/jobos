// Indeed Apply content script

;(async () => {
  const { pendingJob } = await chrome.storage.local.get('pendingJob')
  if (!pendingJob || pendingJob.portal !== 'indeed') return
  if (Date.now() - pendingJob.timestamp > 60000) return

  await sleep(3000)

  try {
    const success = await attemptIndeedApply(pendingJob)
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success })
    await chrome.storage.local.remove('pendingJob')
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success: false, error: err.message })
  }
})()

async function attemptIndeedApply(job) {
  // Find Indeed Apply button
  const applyBtn = document.querySelector(
    '[id="indeedApplyButton"], .jobsearch-IndeedApplyButton-newDesign, [aria-label*="Apply now"]'
  )
  if (!applyBtn) return false

  // Check already applied
  if (document.querySelector('[data-testid="applied-badge"]')) return false

  applyBtn.click()
  await sleep(2500)

  // Indeed opens an iframe or new page — handle both
  const applyFrame = document.querySelector('iframe[title*="Apply"]')

  if (applyFrame) {
    // Multi-step apply within iframe — complex, mark for manual review
    return false
  }

  // Direct apply confirmation
  const submitBtn = await waitForElement(
    '[data-testid="submit-button"], button[type="submit"]',
    4000
  )
  if (submitBtn) {
    submitBtn.click()
    await sleep(2000)
    return true
  }

  return false
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector)
      if (el) { observer.disconnect(); resolve(el) }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); resolve(null) }, timeout)
  })
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
