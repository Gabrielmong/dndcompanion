import { Dialog, DialogContent, Box, Typography, Button } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useUiStore } from '../store/ui'

function GoogleG() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function DottedLine() {
  return (
    <svg width="80" height="2" viewBox="0 0 80 2" style={{ flexShrink: 0 }}>
      <line x1="0" y1="1" x2="80" y2="1" stroke="#c8a44a" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
    </svg>
  )
}

export default function GoogleLinkedModal() {
  const { showGoogleLinkedModal, setShowGoogleLinkedModal } = useUiStore()

  return (
    <Dialog
      open={showGoogleLinkedModal}
      onClose={() => setShowGoogleLinkedModal(false)}
      PaperProps={{
        sx: {
          bgcolor: '#111009',
          border: '1px solid rgba(200,164,74,0.25)',
          borderRadius: 2,
          maxWidth: 360,
          width: '100%',
          p: 0,
        },
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: 'center' }}>
        {/* Check badge */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: '#62a870' }} />
        </Box>

        {/* Logo link visual */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            mb: 3,
          }}
        >
          {/* Lorestone logo */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: '#1a160f',
              border: '1px solid rgba(200,164,74,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/lorestone-logo.png"
              alt="Lorestone"
              sx={{ width: 36, height: 36, objectFit: 'contain' }}
            />
          </Box>

          <DottedLine />

          {/* Google logo */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2,
              bgcolor: '#1a160f',
              border: '1px solid rgba(120,108,92,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GoogleG />
          </Box>
        </Box>

        <Typography
          variant="h6"
          sx={{ fontFamily: '"Cinzel", serif', color: '#e6d8c0', mb: 1, fontSize: '1.1rem' }}
        >
          Accounts linked
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: '#786c5c', fontSize: '0.85rem', lineHeight: 1.6, mb: 3 }}
        >
          Your Google account has been connected to your Lorestone account. You can now sign in with Google.
        </Typography>

        <Button
          variant="contained"
          fullWidth
          onClick={() => setShowGoogleLinkedModal(false)}
          sx={{ py: 1.25 }}
        >
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  )
}
