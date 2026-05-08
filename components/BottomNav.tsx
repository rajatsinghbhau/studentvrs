'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Home' },
  { href: '/learn', icon: '📚', label: 'Learn' },
  { href: '/tests', icon: '🎯', label: 'Tests' },
  { href: '/explain', icon: '🔍', label: 'Explain' },
  { href: '/visualize', icon: '🌌', label: '3D' },
  { href: '/coach', icon: '🤖', label: 'AI Coach' },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${pathname === item.href ? 'active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}
