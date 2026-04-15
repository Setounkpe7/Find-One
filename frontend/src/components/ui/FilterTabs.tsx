type Tab<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  tabs: Tab<T>[]
  active: T
  onChange: (value: T) => void
}

export function FilterTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <div className="filter-tabs">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`tab ${active === value ? 'active' : ''}`.trim()}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
