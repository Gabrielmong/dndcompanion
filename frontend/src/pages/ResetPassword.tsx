import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { Box, Card, CardContent, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material'
import { useAuthStore } from '../store/auth'

const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      token
      user { id email name }
    }
  }
`

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { setAuth } = useAuthStore()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD)

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    try {
      const { data } = await resetPassword({ variables: { token, newPassword: password } })
      setAuth(data.resetPassword.user, data.resetPassword.token)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed')
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
            Choose a new password
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 2 }}
              required
              autoFocus
              inputProps={{ minLength: 8 }}
            />
            <TextField
              fullWidth
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.25 }}>
              {loading ? <CircularProgress size={20} /> : 'Set new password'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: '#786c5c', fontSize: '0.85rem' }}>
            <Link to="/login" style={{ color: '#c8a44a', textDecoration: 'none' }}>
              ← Back to login
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
