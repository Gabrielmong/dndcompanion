import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [verifyEmail] = useMutation(VERIFY_EMAIL)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    verifyEmail({ variables: { token } })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b0906', backgroundImage: 'radial-gradient(ellipse at center, #1a160f 0%, #0b0906 70%)' }}>
      <Card sx={{ width: '100%', maxWidth: 380, border: '1px solid rgba(200,164,74,0.3)' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" sx={{ mb: 3, color: '#c8a44a' }}>
            Lorestone
          </Typography>

          {status === 'loading' && (
            <>
              <CircularProgress sx={{ color: '#c8a44a', mb: 2 }} />
              <Typography sx={{ color: '#786c5c', fontSize: '0.9rem' }}>Verifying your email…</Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 52, color: '#62a870', mb: 2 }} />
              <Typography sx={{ color: '#e6d8c0', fontFamily: '"Cinzel", serif', fontSize: '1rem', mb: 1 }}>
                Email verified
              </Typography>
              <Typography sx={{ color: '#786c5c', fontSize: '0.85rem', lineHeight: 1.6, mb: 3 }}>
                Your email address has been confirmed. Your account is fully active.
              </Typography>
              <Typography variant="body2" sx={{ color: '#786c5c', fontSize: '0.85rem' }}>
                <Link to="/" style={{ color: '#c8a44a', textDecoration: 'none' }}>
                  Go to dashboard →
                </Link>
              </Typography>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorOutlineIcon sx={{ fontSize: 52, color: '#b84848', mb: 2 }} />
              <Typography sx={{ color: '#e6d8c0', fontFamily: '"Cinzel", serif', fontSize: '1rem', mb: 1 }}>
                Link invalid or expired
              </Typography>
              <Typography sx={{ color: '#786c5c', fontSize: '0.85rem', lineHeight: 1.6, mb: 3 }}>
                This verification link is no longer valid. You can request a new one from your profile settings.
              </Typography>
              <Typography variant="body2" sx={{ color: '#786c5c', fontSize: '0.85rem' }}>
                <Link to="/login" style={{ color: '#c8a44a', textDecoration: 'none' }}>
                  ← Back to login
                </Link>
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
