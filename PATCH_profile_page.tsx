// PATCH for src/app/profile/page.tsx
// Add these two UI sections to your existing profile form:

// ─── 1. EXPERIENCE RANGE (add near existing experience_level field) ─────────

{/* Experience Range */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    Experience Range (years)
  </label>
  <p className="text-xs text-gray-500">
    Jobs outside this range will be shown in orange as "outside your preference" — never auto-applied to
  </p>
  <div className="flex items-center gap-3">
    <div className="flex-1">
      <label className="text-xs text-gray-500 mb-1 block">Minimum</label>
      <input
        type="number"
        min={0}
        max={20}
        value={profile.experience_min ?? 0}
        onChange={e => updateProfile({ experience_min: parseInt(e.target.value) })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-300"
      />
    </div>
    <div className="pt-5 text-gray-400 text-sm">to</div>
    <div className="flex-1">
      <label className="text-xs text-gray-500 mb-1 block">Maximum</label>
      <input
        type="number"
        min={0}
        max={30}
        value={profile.experience_max ?? 10}
        onChange={e => updateProfile({ experience_max: parseInt(e.target.value) })}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-brand-300"
      />
    </div>
  </div>
  <p className="text-xs text-gray-400">
    Example: 1 to 4 years. If no jobs found within range, system widens by 2 years and flags those jobs.
  </p>
</div>

// ─── 2. INDIA COVER LETTER TOGGLE (add in the India track settings section) ──

{/* India Cover Letter */}
<div className="flex items-center justify-between py-3 border-t border-gray-100">
  <div>
    <div className="text-sm font-medium text-gray-700">Cover letter for India jobs</div>
    <div className="text-xs text-gray-500 mt-0.5">
      Off by default — Indian portals don't require it and it saves API cost
    </div>
  </div>
  <button
    onClick={() => updateProfile({ india_cover_letter: !profile.india_cover_letter })}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
      profile.india_cover_letter ? 'bg-brand-500' : 'bg-gray-200'
    )}
  >
    <span className={cn(
      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
      profile.india_cover_letter ? 'translate-x-6' : 'translate-x-1'
    )} />
  </button>
</div>

// NOTE: also add `india_cover_letter boolean DEFAULT false` to your profile DB type
// and pass it through to the tailor API call:
// requestCoverLetter: isIreland || (isIndia && profile.india_cover_letter)
