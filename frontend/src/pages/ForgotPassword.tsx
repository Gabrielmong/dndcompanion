import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material'
import MailOutlineIcon from '@mui/icons-material/MailOutline'

const REQUEST_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [requestReset, { loading }] = useMutation(REQUEST_RESET)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await requestReset({ variables: { email } })
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <Box sx={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0b0906', backgroundImage: 'radial-gradient(ellipse at center, #1a160f 0%, #0b0906 70%)' }}>
      <Card sx={{ width: '100%', maxWidth: 380, border: '1px solid rgba(200,164,74,0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, textAlign: 'center', color: '#c8a44a' }}>
            Lorestone
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#786c5c', mb: 3, fontSize: '0.85rem' }}>
            Password reset
          </Typography>

          {sent ? (
            <Box sx={{ textAlign: 'center' }}>
              <MailOutlineIcon sx={{ fontSize: 48, color: '#c8a44a', mb: 2 }} />
              <Typography sx={{ color: '#e6d8c0', mb: 1, fontFamily: '"Cinzel", serif', fontSize: '1rem' }}>
                Check your inbox
              </Typography>
              <Typography sx={{ color: '#786c5c', fontSize: '0.85rem', lineHeight: 1.6, mb: 3 }}>
                If an account exists for <strong style={{ color: '#b4a48a' }}>{email}</strong>, we've sent a password reset link. It expires in 1 hour.
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', color: '#786c5c', fontSize: '0.85rem' }}>
                <Link to="/login" style={{ color: '#c8a44a', textDecoration: 'none' }}>
                  ← Back to login
                </Link>
              </Typography>
            </Box>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Typography sx={{ color: '#786c5c', fontSize: '0.85rem', lineHeight: 1.6, mb: 3 }}>
                Enter your email and we'll send you a link to reset your password.
              </Typography>
              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 3 }}
                  required
                  autoFocus
                />
                <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.25 }}>
                  {loading ? <CircularProgress size={20} /> : 'Send reset link'}
                </Button>
              </Box>
              <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: '#786c5c', fontSize: '0.85rem' }}>
                <Link to="/login" style={{ color: '#c8a44a', textDecoration: 'none' }}>
                  ← Back to login
                </Link>
              </Typography>
              <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, fontSize: '0.72rem', color: '#3a332a' }}>
                <Link to="/privacy" style={{ color: '#3a332a', textDecoration: 'none', marginRight: 12 }}>Privacy</Link>
                <Link to="/terms" style={{ color: '#3a332a', textDecoration: 'none' }}>Terms</Link>
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
