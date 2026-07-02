'use client'

export type Workspace = 'company' | 'yami'

interface Props {
  workspace: Workspace
  onChange: (ws: Workspace) => void
}

export default function WorkspaceSwitcher({ workspace, onChange }: Props) {
  return (
    <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => onChange('company')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          workspace === 'company'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🏢 회사 AI
      </button>
      <button
        onClick={() => onChange('yami')}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          workspace === 'yami'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        🌸 YAMI YAMI
      </button>
    </div>
  )
}
