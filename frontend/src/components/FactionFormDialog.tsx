import { useState, useEffect } from 'react'
import { useMutation, gql } from '@apollo/client'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, useTheme, useMediaQuery,
  Box, Popover, InputAdornment, Tooltip,
} from '@mui/material'
import EmojiPicker from '@emoji-mart/react'
import emojiData from '@emoji-mart/data'
import { useCampaign } from '../context/campaign'

const CREATE_FACTION = gql`
  mutation CreateFaction($input: CreateFactionInput!) {
    createFaction(input: $input) { id name }
  }
`

const UPDATE_FACTION = gql`
  mutation UpdateFaction($id: ID!, $input: UpdateFactionInput!) {
    updateFaction(id: $id, input: $input) { id name }
  }
`

interface FactionData {
  id?: string
  name?: string
  description?: string | null
  color?: string | null
  icon?: string | null
  repMin?: number
  repMax?: number
}

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  faction?: FactionData | null
}

export default function FactionFormDialog({ open, onClose, onSaved, faction }: Props) {
  const { campaignId } = useCampaign()
  const isEdit = !!faction?.id
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('')
  const [icon, setIcon] = useState('')
  const [repMin, setRepMin] = useState('-3')
  const [repMax, setRepMax] = useState('3')
  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      setName(faction?.name ?? '')
      setDescription(faction?.description ?? '')
      setColor(faction?.color ?? '')
      setIcon(faction?.icon ?? '')
      setRepMin(faction?.repMin != null ? String(faction.repMin) : '-3')
      setRepMax(faction?.repMax != null ? String(faction.repMax) : '3')
      setEmojiAnchor(null)
    }
  }, [open, faction])

  const [createFaction, { loading: creating }] = useMutation(CREATE_FACTION)
  const [updateFaction, { loading: updating }] = useMutation(UPDATE_FACTION)
  const loading = creating || updating

  const handleSave = async () => {
    const input = {
      name,
      description: description || undefined,
      color: color || undefined,
      icon: icon || undefined,
    }

    if (isEdit) {
      await updateFaction({ variables: { id: faction!.id, input } })
    } else {
      await createFaction({
        variables: {
          input: {
            ...input,
            campaignId,
            repMin: parseInt(repMin) || -3,
            repMax: parseInt(repMax) || 3,
          },
        },
      })
    }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ color: '#e6d8c0', fontFamily: '"Cinzel", serif', fontSize: '1rem' }}>
        {isEdit ? 'Edit Faction' : 'New Faction'}
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="small" required />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth size="small" multiline rows={3} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Color (hex)" value={color} onChange={(e) => setColor(e.target.value)} fullWidth size="small" placeholder="#c8a44a" />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              fullWidth
              size="small"
              placeholder="🛡️ or text"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Pick emoji">
                      <Box
                        onClick={(e) => setEmojiAnchor(e.currentTarget)}
                        sx={{ cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1, px: 0.5, '&:hover': { opacity: 0.7 } }}
                      >
                        {icon || '🛡️'}
                      </Box>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <Popover
              open={Boolean(emojiAnchor)}
              anchorEl={emojiAnchor}
              onClose={() => setEmojiAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <EmojiPicker
                data={emojiData}
                theme="dark"
                onEmojiSelect={(e: { native: string }) => {
                  setIcon(e.native)
                  setEmojiAnchor(null)
                }}
                previewPosition="none"
                skinTonePosition="none"
              />
            </Popover>
          </Grid>
          {!isEdit && (
            <>
              <Grid item xs={6}>
                <TextField label="Rep Min" type="number" value={repMin} onChange={(e) => setRepMin(e.target.value)} fullWidth size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField label="Rep Max" type="number" value={repMax} onChange={(e) => setRepMax(e.target.value)} fullWidth size="small" />
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#786c5c' }}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading || !name} variant="contained" size="small">
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
