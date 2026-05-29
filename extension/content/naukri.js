// Naukri Quick Apply content script

;(async () => {
  const { pendingJob } = await chrome.storage.local.get('pendingJob')
  if (!pendingJob || pendingJob.portal !== 'naukri') return
  if (Date.now() - pendingJob.timestamp > 60000) return

  await waitForElement('.styles_jhc__apply-button__C2RAa, [class*="apply"]', 6000)
  await sleep(2000)

  try {
    const success = await attemptNaukriApply(pendingJob)
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success })
    await chrome.storage.local.remove('pendingJob')
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success: false, error: err.message })
  }
})()

async function attemptNaukriApply(job) {
  // Find apply button
  const applyBtn = document.querySelector(
    '[class*="apply-button"], [id*="apply-button"], button[contains(text,"Apply")]'
  ) || Array.from(document.querySelectorAll('button')).find(b =>
    b.textContent.trim().toLowerCase() === 'apply' ||
    b.textContent.trim().toLowerCase() === 'apply now'
  )

  if (!applyBtn) return false

  // Check if already applied
  if (document.body.innerText.includes('Already Applied')) return false

  applyBtn.click()
  await sleep(2000)

  // Handle apply modal/drawer
  const modal = await waitForElement('[class*="modal"], [class*="apply-form"]', 4000)

  if (modal) {
    // Look for quick apply / confirm button
    const confirmBtn = modal.querySelector(
      'button[class*="apply"], button[class*="submit"], button[class*="confirm"]'
    ) || Array.from(modal.querySelectorAll('button')).find(b =>
      ['apply', 'apply now', 'submit', 'confirm'].includes(b.textContent.trim().toLowerCase())
    )

    if (confirmBtn) {
      confirmBtn.click()
      await sleep(2000)
      return true
    }
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
