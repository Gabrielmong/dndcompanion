import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../store/auth'

const REGISTER = gql`
  mutation Register($email: String!, $password: String!, $name: String!) {
    register(email: $email, password: $password, name: $name) {
      token
      user { id email name }
    }
  }
`

const GOOGLE_LOGIN = gql`
  mutation GoogleLogin($idToken: String!) {
    googleLogin(idToken: $idToken) {
      token
      user { id email name }
    }
  }
`

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const token = useAuthStore((s) => s.token)
  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token, navigate])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [register, { loading }] = useMutation(REGISTER)
  const [googleLogin] = useMutation(GOOGLE_LOGIN)

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return
    setError('')
    try {
      const { data } = await googleLogin({ variables: { idToken: credentialResponse.credential } })
      setAuth(data.googleLogin.user, data.googleLogin.token)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await register({ variables: { name, email, password } })
      setAuth(data.register.user, data.register.token)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0b0906',
        backgroundImage: 'radial-gradient(ellipse at center, #1a160f 0%, #0b0906 70%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 380, border: '1px solid rgba(200,164,74,0.3)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" sx={{ mb: 0.5, textAlign: 'center', color: '#c8a44a' }}>
            Lorestone
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#786c5c', mb: 3, fontSize: '0.85rem' }}>
            Create your DM account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ py: 1.25 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 2, borderColor: 'rgba(200,164,74,0.15)', fontSize: '0.75rem', color: '#4a4035' }}>or</Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed')}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="320"
            />
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: '#786c5c', fontSize: '0.85rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#c8a44a', textDecoration: 'none' }}>
              Sign in
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'center', mt: 1.5, color: '#4a4035', fontSize: '0.72rem' }}>
            By creating an account you agree to our{' '}
            <Link to="/terms" style={{ color: '#786c5c', textDecoration: 'none' }}>Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: '#786c5c', textDecoration: 'none' }}>Privacy Policy</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
