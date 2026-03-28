import { useState } from 'react'
import { useMutation, gql } from '@apollo/client'
import {
  Dialog, Box, Typography, Button, TextField, CircularProgress,
} from '@mui/material'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'

const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) { id name }
  }
`

interface Props {
  open: boolean
  userName: string
  onCreated: (id: string, name: string) => void
}

export default function WelcomeWizard({ open, userName, onCreated }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [system, setSystem] = useState('')
  const [playerCount, setPlayerCount] = useState('')
  const [createCampaign, { loading }] = useMutation(CREATE_CAMPAIGN)

  const handleCreate = async () => {
    if (!name.trim()) return
    const result = await createCampaign({
      variables: {
        input: {
          name: name.trim(),
          system: system.trim() || undefined,
          playerCount: playerCount ? parseInt(playerCount) : undefined,
        },
      },
    })
    const { id, name: campaignName } = result.data.createCampaign
    onCreated(id, campaignName)
  }

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#0f0d0a', border: '1px solid rgba(200,164,74,0.2)', borderRadius: 2 } }}
    >
      {step === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <AutoStoriesIcon sx={{ fontSize: 44, color: '#c8a44a', mb: 2 }} />
          <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1.4rem', mb: 1 }}>
            Welcome to Lorestone
          </Typography>
          <Typography sx={{ color: '#786c5c', fontSize: '0.88rem', mb: 1 }}>
            Good to have you, {userName}.
          </Typography>
          <Typography sx={{ color: '#4a4035', fontSize: '0.83rem', lineHeight: 1.75, mb: 4, maxWidth: 300, mx: 'auto' }}>
            Let's set up your first campaign. It only takes a moment.
          </Typography>
          <Button variant="contained" size="large" onClick={() => setStep(1)} sx={{ px: 5 }}>
            Get started
          </Button>
        </Box>
      ) : (
        <Box sx={{ p: 4 }}>
          <Typography sx={{ fontFamily: '"Cinzel", serif', color: '#c8a44a', fontSize: '1rem', mb: 0.5 }}>
            Your campaign
          </Typography>
          <Typography sx={{ color: '#786c5c', fontSize: '0.8rem', mb: 3 }}>
            You can always change these later.
          </Typography>

          <TextField
            label="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
            required
            sx={{ mb: 2 }}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && handleCreate()}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <TextField
              label="System"
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              placeholder="e.g. D&D 5e"
              fullWidth
            />
            <TextField
              label="Players"
              type="number"
              value={playerCount}
              onChange={(e) => setPlayerCount(e.target.value)}
              sx={{ width: 100 }}
              inputProps={{ min: 1, max: 12 }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end' }}>
            <Button onClick={() => setStep(0)} sx={{ color: '#786c5c' }} disabled={loading}>
              Back
            </Button>
            <Button
              variant="contained"
              disabled={!name.trim() || loading}
              onClick={handleCreate}
              sx={{ minWidth: 140 }}
            >
              {loading ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : 'Enter the table'}
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  )
}
