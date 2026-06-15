import { useState, useEffect } from 'react'
import {
  Users, FolderOpen, ScrollText, Shield, TrendingUp,
  AlertTriangle, Clock, HardDrive
} from 'lucide-react'
import { getUsers, getFiles, getAuditLogs } from '../../api/index.js'

const actionLabel = {
  login: '登录', logout: '登出', upload: '上传文件', download: '下载文件',
  preview: '预览文件', delete: '删除文件', rename: '重命名文件', move: '移动文件',
  copy: '拷贝文件', create_user: '创建用户', update_user: '编辑用户',
  set_permissions: '权限变更', reset_password: '密码重置',
  create_directory: '创建目录', delete_directory: '删除目录',
  change_password: '修改密码', update_profile: '编辑个人信息',
}
const moduleLabel = {
  auth: '登录认证', user: '用户管理', file: '文件管理',
  copy: '文件拷贝', config: '系统配置', system: '系统',
}
function t(obj, key) { return obj[key] || key }

const iconBg = {
  sky: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  red: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
}

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, files: 0, totalSize: 0, logs: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, filesRes, logsRes] = await Promise.all([
          getUsers({ per_page: 1 }),
          getFiles({ per_page: 1 }),
          getAuditLogs({ per_page: 5 }),
        ])
        setStats({
          users: usersRes.total || 0,
          files: filesRes.total || 0,
          totalSize: filesRes.total_size || 0,
          logs: logsRes.items || [],
        })
      } catch (err) {
        console.error('Dashboard load failed:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const kpiCards = [
    { label: '用户总数', value: stats.users, icon: Users, color: 'sky', change: '系统用户' },
    { label: '文件总数', value: stats.files, icon: FolderOpen, color: 'emerald', change: '全部文件' },
    { label: '今日操作', value: stats.logs.length, icon: TrendingUp, color: 'amber', change: '最近记录' },
    { label: '告警事件', value: '0', icon: AlertTriangle, color: 'red', change: '暂无' },
  ]

  const cardClass = "bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 hover:shadow-md hover:border-[var(--color-border-light)] cursor-pointer"
  const thClass = "text-left px-5 py-3 text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider"
  const tdClass = "px-5 py-3"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">系统概览</h1>
        <p className="text-sm text-[var(--color-text-subtle)] mt-1">文件全流程管控系统运行状态</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">{label}</span>
              <div className={`p-2 rounded-lg ${iconBg[color]}`}><Icon size={18} /></div>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)]">{loading ? '...' : value}</div>
            <div className="text-xs text-[var(--color-text-subtle)] mt-1">{change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText size={18} className="text-[var(--color-text-muted)]" />
              <h2 className="font-semibold text-[var(--color-text)]">最近操作日志</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg)]/50">
                  <th className={thClass}>姓名</th><th className={thClass}>操作</th><th className={thClass}>模块</th>
                  <th className={thClass}>详情</th><th className={thClass}>IP</th>
                </tr>
              </thead>
              <tbody>
                {stats.logs.map((log, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)] hover:bg-[var(--color-primary-light)]">
                    <td className={`${tdClass} text-[var(--color-text)] font-medium`}>{log.username || log.account}</td>
                    <td className={tdClass}><span className="px-2 py-0.5 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded text-xs">{t(actionLabel, log.action)}</span></td>
                    <td className={`${tdClass} text-[var(--color-text-subtle)] text-xs`}>{t(moduleLabel, log.module)}</td>
                    <td className={`${tdClass} text-[var(--color-text-muted)] text-xs max-w-[200px]`}>
                      <span title={log.detail || ''} className="line-clamp-2 cursor-default">{log.detail || '-'}</span>
                    </td>
                    <td className={`${tdClass} text-[var(--color-text-subtle)] font-mono text-xs`}>{log.ip}</td>
                  </tr>
                ))}
                {!loading && stats.logs.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-[var(--color-text-subtle)] text-sm">暂无操作记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="font-semibold text-[var(--color-text)] mb-4">系统状态</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><HardDrive size={16} />文件总大小</div>
                <span className="text-sm font-bold text-[var(--color-text)]">{loading ? '...' : (stats.totalSize / (1024*1024*1024)).toFixed(2) + ' GB'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2"><div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><Shield size={16} />安全状态</div><span className="text-sm font-medium text-[var(--color-success)]">正常</span></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><Clock size={16} />系统运行</div><span className="text-sm font-medium text-[var(--color-text)]">运行中</span></div>
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><AlertTriangle size={16} />待处理告警</div><span className="text-sm font-medium text-[var(--color-text)]">0 条</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
