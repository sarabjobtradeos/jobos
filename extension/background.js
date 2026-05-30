// JobOS Extension — Background Service Worker
// Polls dashboard for jobs to apply, opens tabs, triggers content scripts

const DASHBOARD_URL = 'https://jobos-c40m.onrender.com' // replaced at build time
const POLL_INTERVAL_MINUTES = 30

// ============================================
// STARTUP
// ============================================
chrome.runtime.onInstalled.addListener(() => {
  console.log('JobOS extension installed')
  setupAlarms()
  checkAuth()
})

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll-jobs') pollForJobs()
  if (alarm.name === 'health-check') reportPortalHealth()
})

function setupAlarms() {
  chrome.alarms.create('poll-jobs', { periodInMinutes: POLL_INTERVAL_MINUTES })
  chrome.alarms.create('health-check', { periodInMinutes: 60 })
}

// ============================================
// AUTH — store session token from dashboard
// ============================================
async function checkAuth() {
  const { token } = await chrome.storage.local.get('token')
  if (!token) {
    chrome.notifications.create('auth', {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'JobOS — Connect your account',
      message: 'Open JobOS dashboard → Automation → Connect Extension',
    })
  }
}

// ============================================
// POLL FOR JOBS TO APPLY
// ============================================
async function pollForJobs() {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return

  try {
    const res = await fetch(`${DASHBOARD_URL}/api/jobs/pending-apply`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return

    const { jobs } = await res.json()
    if (!jobs?.length) return

    // Process one job at a time to avoid suspicion
    for (const job of jobs.slice(0, 3)) {
      await applyToJob(job)
      await sleep(5000 + Math.random() * 10000) // 5-15s between applies
    }
  } catch (err) {
    console.error('Poll failed:', err)
  }
}

// ============================================
// APPLY TO A SINGLE JOB
// ============================================
async function applyToJob(job) {
  const { token } = await chrome.storage.local.get('token')

  // Fetch tailored resume + cover letter for this job
  const res = await fetch(`${DASHBOARD_URL}/api/jobs/${job.id}/tailored`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return
  const { resume, coverLetter } = await res.json()

  // Store in local storage for content script to read
  await chrome.storage.local.set({
    pendingJob: {
      id: job.id,
      portal: job.portal,
      url: job.portal_url,
      resume,
      coverLetter,
      timestamp: Date.now(),
    }
  })

  // Open the job URL in a new tab
  const tab = await chrome.tabs.create({ url: job.portal_url, active: false })

  // Wait for content script to report back
  await waitForApplyResult(job.id, tab.id, 30000)
}

// ============================================
// WAIT FOR CONTENT SCRIPT RESULT
// ============================================
function waitForApplyResult(jobId, tabId, timeout) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      chrome.tabs.remove(tabId)
      resolve(false)
    }, timeout)

    chrome.runtime.onMessage.addListener(function handler(msg) {
      if (msg.type === 'apply-result' && msg.jobId === jobId) {
        clearTimeout(timer)
        chrome.runtime.onMessage.removeListener(handler)
        chrome.tabs.remove(tabId)

        // Report result to dashboard
        reportApplyResult(jobId, msg.success, msg.error)
        resolve(msg.success)
      }
    })
  })
}

// ============================================
// REPORT APPLY RESULT TO DASHBOARD
// ============================================
async function reportApplyResult(jobId, success, error) {
  const { token } = await chrome.storage.local.get('token')
  await fetch(`${DASHBOARD_URL}/api/jobs/${jobId}/apply-result`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ success, error }),
  })

  if (success) {
    chrome.notifications.create(`applied-${jobId}`, {
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'JobOS — Applied!',
      message: `Successfully applied to a new job`,
    })
  }
}

// ============================================
// PORTAL HEALTH CHECK
// ============================================
async function reportPortalHealth() {
  const { token } = await chrome.storage.local.get('token')
  if (!token) return

  const portals = [
    { name: 'linkedin', url: 'https://www.linkedin.com/feed/' },
    { name: 'naukri', url: 'https://www.naukri.com/' },
    { name: 'indeed', url: 'https://in.indeed.com/' },
  ]

  const health = {}
  for (const portal of portals) {
    const cookies = await chrome.cookies.getAll({ domain: portal.url.replace('https://', '').replace('/', '') })
    health[portal.name] = cookies.some(c => c.name.includes('session') || c.name.includes('auth') || c.name.includes('li_at'))
  }

  await fetch(`${DASHBOARD_URL}/api/portal/health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ health }),
  })
}

// ============================================
// MESSAGES FROM POPUP
// ============================================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'save-token') {
    chrome.storage.local.set({ token: msg.token })
    sendResponse({ ok: true })
  }
  if (msg.type === 'get-status') {
    chrome.storage.local.get('token', ({ token }) => {
      sendResponse({ connected: !!token })
    })
    return true
  }
  if (msg.type === 'manual-scan') {
    pollForJobs().then(() => sendResponse({ ok: true }))
    return true
  }
})

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
