// PATCH for src/app/jobs/page.tsx
// Add this badge inside each job card, after the fit score badge:

{job.outside_preference && (
  <span
    title="This job is slightly outside your experience range — shown because nothing matched your strict filters today"
    className="px-2 py-0.5 bg-orange-100 text-orange-600 border border-orange-200 rounded-full text-xs font-medium flex items-center gap-1"
  >
    ⚠️ Outside preference
  </span>
)}

// Also add a filter toggle at the top of the jobs page to hide/show these:

const [showOutsidePreference, setShowOutsidePreference] = useState(true)

// In filter logic:
const filteredJobs = jobs.filter(job => {
  if (!showOutsidePreference && job.outside_preference) return false
  // ... rest of your existing filters
  return true
})

// Toggle button UI (add near other filter buttons):
<button
  onClick={() => setShowOutsidePreference(!showOutsidePreference)}
  className={cn(
    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
    showOutsidePreference
      ? 'bg-orange-50 border-orange-200 text-orange-600'
      : 'bg-white border-gray-200 text-gray-500'
  )}
>
  {showOutsidePreference ? '⚠️ Showing outside preference' : 'Outside preference hidden'}
</button>
