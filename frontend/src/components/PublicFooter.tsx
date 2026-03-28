import { Box, Typography, Divider } from '@mui/material'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { version } from '../../package.json'

function FooterLink({ label, to, hash }: { label: string; to: string; hash?: string }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = (e: React.MouseEvent) => {
    if (!hash) return
    e.preventDefault()
    if (location.pathname === '/landing') {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(`/landing`)
      // Wait for page to render then scroll
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }
  }

  return (
    <Link to={to} onClick={handleClick} style={{ textDecoration: 'none' }}>
      <Typography sx={{ fontSize: '0.82rem', color: '#786c5c', transition: 'color 0.15s', '&:hover': { color: '#c8a44a' } }}>
        {label}
      </Typography>
    </Link>
  )
}

const COLS:
  {
    heading: string
    links: { label: string; to: string; hash?: string }[]
  }[]
  = [
    {
      heading: 'Product',
      links: [
        { label: 'Home', to: '/landing' },
        { label: 'Sign in', to: '/login' },
        { label: 'Create account', to: '/register' },
      ],
    },
    {
      heading: 'Features',
      links: [
        { label: 'Decision trees', to: '/landing', hash: 'decisions' },
        { label: 'Campaing Wiki', to: '/landing', hash: 'wiki' },
        { label: 'Dice Roller', to: '/landing', hash: 'dice' },
        { label: 'Shareable Player view', to: '/landing', hash: 'player-view' },
        { label: 'Session transcription', to: '/landing', hash: 'transcription' },
        { label: 'All features', to: '/landing', hash: 'features' },
      ],
    },
    {
      heading: 'Legal',
      links: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
      ],
    },
  ]

export default function PublicFooter() {
  return (
    <Box component="footer" sx={{ borderTop: '1px solid rgba(120,108,92,0.15)', bgcolor: '#0b0906', px: { xs: 3, md: 8 }, pt: 5, pb: 3 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        {/* Sitemap grid */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '2fr 1fr 1fr 1fr' }, gap: { xs: 4, sm: 3 }, mb: 4, alignItems: 'start' }}>

          {/* Brand column */}
          <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
            <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1.1rem', mb: 0.75 }}>
              Lorestone
            </Typography>
            <Typography sx={{ color: '#4a4035', fontSize: '0.78rem', lineHeight: 1.6, maxWidth: 180 }}>
              Campaign management for tabletop roleplaying games. Built for DMs, by a DM.
            </Typography>
          </Box>

          {/* Link columns */}
          {COLS.map((col) => (
            <Box key={col.heading}>
              <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: '#786c5c', textTransform: 'uppercase', letterSpacing: 1.5, mb: 1.5 }}>
                {col.heading}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
                {col.links.map((l) => (
                  <FooterLink key={l.label} label={l.label} to={l.to} hash={l.hash} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ borderColor: 'rgba(120,108,92,0.1)', mb: 2.5 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography sx={{ color: '#3a332a', fontSize: '0.72rem' }}>
            © {new Date().getFullYear()} Lorestone · Costa Rica
          </Typography>
          <Typography sx={{ color: '#3a332a', fontSize: '0.72rem', fontFamily: '"JetBrains Mono", monospace' }}>
            v{version}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
