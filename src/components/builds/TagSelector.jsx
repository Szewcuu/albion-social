'use client'
import { BUDGET_TAGS, TAG_GROUPS } from '@/lib/buildTags'

function TagGroup({ group, selected, onToggle, max = 7 }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-mono font-bold text-gray-400 uppercase">{group.label}</h4>
        <span className="text-[10px] text-gray-600 font-mono">{selected.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.tags.map((tag) => {
          const isActive = selected.includes(tag)
          const isDisabled = !isActive && selected.length >= max
          return (
            <button
              key={tag}
              type="button"
              disabled={isDisabled}
              onClick={() => onToggle(group.key, tag)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition border ${
                isActive
                  ? 'bg-[#f3ba2f] text-black border-[#f3ba2f]'
                  : isDisabled
                    ? 'bg-[#0c0407] text-gray-600 border-[#200d13] cursor-not-allowed opacity-50'
                    : 'bg-[#0c0407] text-gray-400 border-[#281017] hover:border-[#f3ba2f]/40 hover:text-gray-200'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function TagSelector({ tags, budget, onTagsChange, onBudgetChange }) {
  const toggleTag = (groupKey, tag) => {
    const current = tags[groupKey] || []
    const group = TAG_GROUPS.find(g => g.key === groupKey)
    const max = group?.max || 7

    if (current.includes(tag)) {
      onTagsChange({ ...tags, [groupKey]: current.filter(t => t !== tag) })
    } else if (current.length < max) {
      onTagsChange({ ...tags, [groupKey]: [...current, tag] })
    }
  }

  return (
    <div className="space-y-5">
      {TAG_GROUPS.map((group) => (
        <TagGroup
          key={group.key}
          group={group}
          selected={tags[group.key] || []}
          onToggle={toggleTag}
          max={group.max}
        />
      ))}

      <div className="space-y-2">
        <h4 className="text-[11px] font-mono font-bold text-gray-400 uppercase">Budżet</h4>
        <div className="flex flex-wrap gap-1.5">
          {BUDGET_TAGS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onBudgetChange(budget === id ? '' : id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition border ${
                budget === id
                  ? 'bg-[#f3ba2f] text-black border-[#f3ba2f]'
                  : 'bg-[#0c0407] text-gray-400 border-[#281017] hover:border-[#f3ba2f]/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
