// LinkedIn Easy Apply content script
// Runs on linkedin.com/jobs/* pages

;(async () => {
  const { pendingJob } = await chrome.storage.local.get('pendingJob')
  if (!pendingJob || pendingJob.portal !== 'linkedin') return
  if (Date.now() - pendingJob.timestamp > 60000) return // stale

  // Wait for page to fully load
  await waitForElement('.jobs-unified-top-card', 8000)
  await sleep(2000)

  try {
    const success = await attemptEasyApply(pendingJob)
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success })
    await chrome.storage.local.remove('pendingJob')
  } catch (err) {
    chrome.runtime.sendMessage({ type: 'apply-result', jobId: pendingJob.id, success: false, error: err.message })
  }
})()

async function attemptEasyApply(job) {
  // Find Easy Apply button
  const easyApplyBtn = await waitForElement(
    '[aria-label*="Easy Apply"], .jobs-apply-button--top-card',
    5000
  )
  if (!easyApplyBtn) {
    console.log('No Easy Apply button — skipping')
    return false
  }

  // Check if already applied
  if (document.querySelector('.artdeco-inline-feedback--success')) return false

  easyApplyBtn.click()
  await sleep(2000)

  // Handle multi-step Easy Apply modal
  let step = 0
  const maxSteps = 8

  while (step < maxSteps) {
    const modal = document.querySelector('.jobs-easy-apply-modal, [data-test-modal]')
    if (!modal) break

    // Check for submit button (final step)
    const submitBtn = modal.querySelector('button[aria-label*="Submit application"]')
    if (submitBtn) {
      submitBtn.click()
      await sleep(2000)
      return true
    }

    // Fill in any visible text fields
    await fillFormFields(modal, job)

    // Check for file upload (resume)
    const fileInput = modal.querySelector('input[type="file"]')
    if (fileInput) {
      // Can't upload files directly in extension — skip file step
      console.log('File upload step — using profile resume')
    }

    // Click Next
    const nextBtn = modal.querySelector(
      'button[aria-label*="Continue"], button[aria-label*="Next"], .artdeco-button--primary'
    )
    if (!nextBtn) break

    nextBtn.click()
    await sleep(1500)
    step++
  }

  return false
}

async function fillFormFields(modal, job) {
  // Fill phone number if empty
  const phoneFields = modal.querySelectorAll('input[id*="phone"], input[placeholder*="phone"]')
  phoneFields.forEach(field => {
    if (!field.value) setNativeValue(field, '')
  })

  // Fill cover letter textarea
  const textareas = modal.querySelectorAll('textarea')
  textareas.forEach(ta => {
    if (!ta.value && ta.placeholder?.toLowerCase().includes('cover')) {
      setNativeValue(ta, job.coverLetter?.slice(0, 2000) || '')
    }
  })

  // Handle yes/no questions — default to "Yes" for standard questions
  const radioYes = modal.querySelectorAll('input[type="radio"][value="Yes"], label')
  // Only auto-select if clearly a "yes/no" and we know the answer

  await sleep(500)
}

// React-compatible value setter
function setNativeValue(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
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
