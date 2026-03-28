import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { slideUp, staggerContainer } from '../utils/motion'
import {
  Box, Typography, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, ToggleButtonGroup, ToggleButton, MenuItem,
  CircularProgress, useTheme, useMediaQuery,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useCampaign } from '../context/campaign'

const RUMORS = gql`
  query Rumors($campaignId: ID!) {
    rumors(campaignId: $campaignId) {
      id campaignId content source isTrue notes
      chapter { id name }
      createdAt
    }
  }
`

const CHAPTERS = gql`
  query ChaptersForRumors($campaignId: ID!) {
    campaign(id: $campaignId) { chapters { id name } }
  }
`

const CREATE_RUMOR = gql`
  mutation CreateRumor($input: CreateRumorInput!) {
    createRumor(input: $input) { id }
  }
`

const UPDATE_RUMOR = gql`
  mutation UpdateRumor($id: ID!, $input: UpdateRumorInput!) {
    updateRumor(id: $id, input: $input) { id }
  }
`

const DELETE_RUMOR = gql`
  mutation DeleteRumor($id: ID!) { deleteRumor(id: $id) }
`

type Rumor = {
  id: string
  content: string
  source?: string | null
  isTrue?: boolean | null
  notes?: string | null
  chapter?: { id: string; name: string } | null
  createdAt: string
}

type Filter = 'all' | 'true' | 'false' | 'unknown'

const truthColor = (v: boolean | null | undefined) =>
  v === true ? '#62a870' : v === false ? '#b84848' : '#786c5c'

const truthLabel = (v: boolean | null | undefined) =>
  v === true ? 'True' : v === false ? 'False' : 'Unknown'

const truthIcon = (v: boolean | null | undefined, size = 14) =>
  v === true
    ? <CheckCircleIcon sx={{ fontSize: size, color: '#62a870' }} />
    : v === false
    ? <CancelIcon sx={{ fontSize: size, color: '#b84848' }} />
    : <HelpOutlineIcon sx={{ fontSize: size, color: '#786c5c' }} />

interface FormState {
  content: string
  source: string
  isTrue: string // 'true' | 'false' | 'unknown'
  notes: string
  chapterId: string
}

const defaultForm = (): FormState => ({ content: '', source: '', isTrue: 'unknown', notes: '', chapterId: '' })

export default function RumorBoard() {
  const { campaignId } = useCampaign()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [filter, setFilter] = useState<Filter>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Rumor | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm())
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, loading, refetch } = useQuery(RUMORS, {
    variables: { campaignId },
    skip: !campaignId,
    fetchPolicy: 'cache-and-network',
  })
  const { data: chapData } = useQuery(CHAPTERS, { variables: { campaignId }, skip: !campaignId })

  const [createRumor, { loading: creating }] = useMutation(CREATE_RUMOR)
  const [updateRumor, { loading: updating }] = useMutation(UPDATE_RUMOR)
  const [deleteRumor] = useMutation(DELETE_RUMOR)

  const saving = creating || updating
  const rumors: Rumor[] = data?.rumors ?? []
  const chapters: { id: string; name: string }[] = chapData?.campaign?.chapters ?? []

  const filtered = rumors.filter((r) => {
    if (filter === 'true') return r.isTrue === true
    if (filter === 'false') return r.isTrue === false
    if (filter === 'unknown') return r.isTrue == null
    return true
  })

  const openAdd = () => { setEditing(null); setForm(defaultForm()); setFormOpen(true) }
  const openEdit = (r: Rumor) => {
    setEditing(r)
    setForm({
      content: r.content,
      source: r.source ?? '',
      isTrue: r.isTrue === true ? 'true' : r.isTrue === false ? 'false' : 'unknown',
      notes: r.notes ?? '',
      chapterId: r.chapter?.id ?? '',
    })
    setFormOpen(true)
  }

  const handleSave = async () => {
    const isTrueVal = form.isTrue === 'true' ? true : form.isTrue === 'false' ? false : null
    const input = {
      content: form.content.trim(),
      source: form.source.trim() || null,
      isTrue: isTrueVal,
      notes: form.notes.trim() || null,
      chapterId: form.chapterId || null,
    }
    if (editing) {
      await updateRumor({ variables: { id: editing.id, input } })
    } else {
      await createRumor({ variables: { input: { ...input, campaignId } } })
    }
    setFormOpen(false)
    refetch()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteRumor({ variables: { id: deleteId } })
    setDeleteId(null)
    refetch()
  }

  const counts = {
    all: rumors.length,
    true: rumors.filter((r) => r.isTrue === true).length,
    false: rumors.filter((r) => r.isTrue === false).length,
    unknown: rumors.filter((r) => r.isTrue == null).length,
  }

  return (
    <Box component={motion.div} variants={staggerContainer} initial="hidden" animate="visible">
      {/* Header */}
      <Box component={motion.div} variants={slideUp} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h3" sx={{ mb: 0.5 }}>Rumor Board</Typography>
          <Typography sx={{ color: '#786c5c', fontSize: '0.82rem' }}>
            Things the party has heard — only you know what's true.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openAdd}>
          Add rumor
        </Button>
      </Box>

      {/* Filter bar */}
      <Box component={motion.div} variants={slideUp} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          size="small"
          sx={{ flexShrink: 0, '& .MuiToggleButton-root': { color: '#786c5c', borderColor: 'rgba(120,108,92,0.2)', fontSize: '0.75rem', px: 1.5, py: 0.5, textTransform: 'none', whiteSpace: 'nowrap' }, '& .Mui-selected': { color: '#c8a44a !important', borderColor: 'rgba(200,164,74,0.3) !important', bgcolor: 'rgba(200,164,74,0.08) !important' } }}
        >
          <ToggleButton value="all">All <Chip label={counts.all} size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.65rem', bgcolor: 'rgba(120,108,92,0.15)', color: '#786c5c' }} /></ToggleButton>
          <ToggleButton value="true"><CheckCircleIcon sx={{ fontSize: 13, mr: 0.5, color: '#62a870' }} />True <Chip label={counts.true} size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.65rem', bgcolor: 'rgba(98,168,112,0.1)', color: '#62a870' }} /></ToggleButton>
          <ToggleButton value="false"><CancelIcon sx={{ fontSize: 13, mr: 0.5, color: '#b84848' }} />False <Chip label={counts.false} size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.65rem', bgcolor: 'rgba(184,72,72,0.1)', color: '#b84848' }} /></ToggleButton>
          <ToggleButton value="unknown"><HelpOutlineIcon sx={{ fontSize: 13, mr: 0.5, color: '#786c5c' }} />Unknown <Chip label={counts.unknown} size="small" sx={{ ml: 0.75, height: 16, fontSize: '0.65rem', bgcolor: 'rgba(120,108,92,0.15)', color: '#786c5c' }} /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && <CircularProgress size={24} sx={{ color: '#c8a44a', display: 'block', mx: 'auto', mt: 6 }} />}

      {/* Rumor grid */}
      <Box
        component={motion.div}
        variants={staggerContainer}
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}
      >
        {filtered.map((r) => (
          <Box
            key={r.id}
            component={motion.div}
            variants={slideUp}
            sx={{
              bgcolor: '#111009',
              border: `1px solid ${truthColor(r.isTrue)}28`,
              borderLeft: `3px solid ${truthColor(r.isTrue)}`,
              borderRadius: 1,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {/* Truth badge + actions */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {truthIcon(r.isTrue)}
                <Typography sx={{ fontSize: '0.72rem', color: truthColor(r.isTrue), fontFamily: '"JetBrains Mono", monospace', letterSpacing: 0.5 }}>
                  {truthLabel(r.isTrue)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.25 }}>
                <IconButton size="small" onClick={() => openEdit(r)} sx={{ color: '#786c5c', '&:hover': { color: '#c8a44a' }, width: 24, height: 24 }}>
                  <EditIcon sx={{ fontSize: 12 }} />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteId(r.id)} sx={{ color: '#786c5c', '&:hover': { color: '#b84848' }, width: 24, height: 24 }}>
                  <DeleteIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Content */}
            <Typography sx={{ fontSize: '0.88rem', color: '#e6d8c0', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{r.content}"
            </Typography>

            {/* DM notes */}
            {r.notes && (
              <Typography sx={{ fontSize: '0.78rem', color: '#786c5c', lineHeight: 1.5, borderTop: '1px solid rgba(120,108,92,0.15)', pt: 0.75 }}>
                {r.notes}
              </Typography>
            )}

            {/* Footer: source + chapter */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 'auto', pt: 0.5 }}>
              {r.source && (
                <Chip label={`Source: ${r.source}`} size="small" sx={{ height: 18, fontSize: '0.68rem', color: '#b4a48a', bgcolor: 'rgba(180,164,138,0.08)', border: '1px solid rgba(180,164,138,0.15)' }} />
              )}
              {r.chapter && (
                <Chip label={r.chapter.name} size="small" sx={{ height: 18, fontSize: '0.68rem', color: '#786c5c', bgcolor: 'rgba(120,108,92,0.08)', border: '1px solid rgba(120,108,92,0.15)' }} />
              )}
            </Box>
          </Box>
        ))}
      </Box>

      {!loading && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', pt: 8, color: '#786c5c' }}>
          <HelpOutlineIcon sx={{ fontSize: 36, mb: 1.5, opacity: 0.4 }} />
          <Typography sx={{ fontSize: '0.88rem' }}>
            {filter === 'all' ? 'No rumors yet. Add the first thing the party has heard.' : `No ${filter} rumors.`}
          </Typography>
        </Box>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}
        PaperProps={{ sx: { bgcolor: '#0f0d0a', border: '1px solid rgba(200,164,74,0.2)' } }}>
        <DialogTitle sx={{ color: '#e6d8c0', fontFamily: '"Cinzel", serif', fontSize: '1rem' }}>
          {editing ? 'Edit rumor' : 'New rumor'}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Rumor"
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            multiline
            rows={3}
            fullWidth
            autoFocus
            placeholder="What have the players heard?"
          />
          <TextField
            label="Source"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            fullWidth
            size="small"
            placeholder="Who told them? A tavern keeper, a notice board…"
          />
          <TextField
            select
            label="Is this actually true?"
            value={form.isTrue}
            onChange={(e) => setForm((f) => ({ ...f, isTrue: e.target.value }))}
            fullWidth
            size="small"
            helperText="DM-only. Not shown to players."
          >
            <MenuItem value="unknown">Unknown / undecided</MenuItem>
            <MenuItem value="true">True</MenuItem>
            <MenuItem value="false">False</MenuItem>
          </TextField>
          {chapters.length > 0 && (
            <TextField
              select
              label="Chapter (optional)"
              value={form.chapterId}
              onChange={(e) => setForm((f) => ({ ...f, chapterId: e.target.value }))}
              fullWidth
              size="small"
            >
              <MenuItem value="">— None —</MenuItem>
              {chapters.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
          )}
          <TextField
            label="DM notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            multiline
            rows={2}
            fullWidth
            size="small"
            placeholder="Private context, plot hooks, follow-up ideas…"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)} sx={{ color: '#786c5c' }} disabled={saving}>Cancel</Button>
          <Button variant="contained" disabled={!form.content.trim() || saving} onClick={handleSave} size="small">
            {saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : editing ? 'Save' : 'Add rumor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#0f0d0a', border: '1px solid rgba(200,164,74,0.15)' } }}>
        <DialogTitle sx={{ color: '#e6d8c0', fontSize: '0.95rem' }}>Delete this rumor?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#786c5c', fontSize: '0.85rem' }}>This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} sx={{ color: '#786c5c' }}>Cancel</Button>
          <Button variant="contained" color="error" size="small" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
