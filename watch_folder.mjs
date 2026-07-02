/**
 * AI Supporter 폴더 감시 스크립트
 *
 * 감시 폴더:
 *   - ai_supporter/  → 회사 AI (workspace: company)
 *   - YAMI YAMI_ai/  → YAMI YAMI 개인 사업 AI (workspace: yami)
 *
 * 실행: node watch_folder.mjs
 */

import { watch, existsSync, mkdirSync } from 'fs'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const API_URL = 'https://app-ten-omega-n5i2q4i5i6.vercel.app/api/upload'
const SUPPORTED_EXTS = ['.txt', '.csv', '.pdf', '.docx', '.xlsx']

const WATCH_TARGETS = [
  {
    dir: __dirname,
    workspace: 'company',
    label: '🏢 회사 AI',
    ignore: ['app', 'node_modules', '.git', 'YAMI YAMI_ai', 'watch_folder.mjs', 'upload_data.mjs'],
  },
  {
    dir: path.join(__dirname, 'YAMI YAMI_ai'),
    workspace: 'yami',
    label: '🌸 YAMI YAMI AI',
    ignore: [],
  },
]

// YAMI YAMI_ai 폴더 없으면 자동 생성
const yamiDir = path.join(__dirname, 'YAMI YAMI_ai')
if (!existsSync(yamiDir)) {
  mkdirSync(yamiDir)
  console.log('📁 YAMI YAMI_ai 폴더를 생성했습니다.')
}

// 중복 이벤트 방지
const recentlyUploaded = new Map()

async function uploadFile(filePath, workspace, label) {
  const filename = path.basename(filePath)
  const ext = path.extname(filename).toLowerCase()

  if (!SUPPORTED_EXTS.includes(ext)) return
  if (!existsSync(filePath)) return

  const key = `${workspace}:${filename}`
  const now = Date.now()
  if (recentlyUploaded.has(key) && now - recentlyUploaded.get(key) < 3000) return
  recentlyUploaded.set(key, now)

  console.log(`\n${label} 📤 업로드 시작: ${filename}`)

  try {
    const fileBuffer = await readFile(filePath)
    const blob = new Blob([fileBuffer], { type: 'application/octet-stream' })
    const form = new FormData()
    form.append('file', blob, filename)
    form.append('workspace', workspace)

    const res = await fetch(API_URL, { method: 'POST', body: form })

    if (!res.ok) {
      const text = await res.text()
      console.error(`${label} ❌ 업로드 실패 (${res.status}): ${text}`)
      return
    }

    const data = await res.json()
    console.log(`${label} ✅ 완료: ${filename} → ${data.chunks}개 청크 저장됨`)
  } catch (err) {
    console.error(`${label} ❌ 오류: ${err.message}`)
  }
}

// 각 폴더 감시 시작
for (const target of WATCH_TARGETS) {
  if (!existsSync(target.dir)) continue

  watch(target.dir, { recursive: false }, (eventType, filename) => {
    if (!filename) return
    if (target.ignore.some(i => filename.startsWith(i))) return

    const filePath = path.join(target.dir, filename)
    if (eventType === 'rename' || eventType === 'change') {
      setTimeout(() => uploadFile(filePath, target.workspace, target.label), 500)
    }
  })

  console.log(`${target.label} 감시 시작: ${target.dir}`)
}

console.log('\n지원 형식:', SUPPORTED_EXTS.join(', '))
console.log('업로드 대상:', API_URL)
console.log('\n종료하려면 Ctrl+C\n')
