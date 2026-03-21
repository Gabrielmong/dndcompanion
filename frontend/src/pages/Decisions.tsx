import { useState, useMemo } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { motion } from 'framer-motion'
import { staggerContainer, slideUp } from '../utils/motion'
import {
  Box, Typography, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Grid, Button, IconButton, Tooltip,
  ToggleButton, ToggleButtonGroup, Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ViewListIcon from '@mui/icons-material/ViewList'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useCampaign } from '../context/campaign'
import DecisionCard from '../components/DecisionCard'
import DecisionFormDialog from '../components/DecisionFormDialog'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
import DecisionTreeView from '../components/DecisionTreeView'

const DECISIONS = gql`
  query Decisions($campaignId: ID!, $status: DecisionStatus) {
    decisions(campaignId: $campaignId, status: $status) {
      id question context status orderIndex missionName resolvedAt
      chapter { id name orderIndex }
      branches { id label description consequence outcomeType orderIndex outcomes }
      chosenBranch { id label }
      incomingLinks { id fromDecision { id } fromBranch { id label } }
    }
  }
`

const RESOLVE = gql`
  mutation ResolveDecision($id: ID!, $branchId: ID!) {
    resolveDecision(id: $id, branchId: $branchId) {
      id status chosenBranch { id label }
    }
  }
`

const DELETE_DECISION = gql`
  mutation DeleteDecision($id: ID!) {
    deleteDecision(id: $id)
  }
`

const STATUSES = ['', 'PENDING', 'ACTIVE', 'RESOLVED', 'SKIPPED']

const ACT_COLORS = [
  '#4a8fb5',
  '#a06db5',
  '#b5734a',
  '#4ab57e',
  '#b54a6e',
  '#4ab5b5',
  '#8fb54a',
]

type DecisionFull = {
  id: string
  question: string
  context?: string | null
  status: string
  missionName?: string | null
  resolvedAt?: string | null
  chapter?: { id: string; name: string; orderIndex: number } | null
  branches: { id: string; label: string; description?: string | null; consequence?: string | null; outcomeType: string; orderIndex: number; outcomes?: unknown }[]
  chosenBranch?: { id: string; label: string } | null
  incomingLinks?: { id: string; fromDecision: { id: string }; fromBranch?: { id: string; label: string } | null }[]
}

export default function Decisions() {
  const { campaignId } = useCampaign()
  const [status, setStatus] = useState('')
  const [chapterFilter, setChapterFilter] = useState('')
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'list' | 'tree'>('list')
  const [formOpen, setFormOpen] = useState(false)
  const [editDecision, setEditDecision] = useState<DecisionFull | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteQuestion, setDeleteQuestion] = useState('')
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const toggleChapter = (id: string) =>
    setCollapsedChapters((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })

  const { data, loading, error, refetch } = useQuery(DECISIONS, {
    variables: { campaignId, status: status || undefined },
    skip: !campaignId,
  })

  const [resolve] = useMutation(RESOLVE)
  const [deleteDecision, { loading: deleting }] = useMutation(DELETE_DECISION)

  const handleResolve = async (decisionId: string, branchId: string) => {
    await resolve({ variables: { id: decisionId, branchId } })
    refetch()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await deleteDecision({ variables: { id: deleteId } })
    setDeleteId(null)
    refetch()
  }

  // Group by chapter + compute link maps
  const { chapterGroups, questionMap, outgoingMap, totalDecisions, totalLinks, totalBranches, resolved } = useMemo(() => {
    const decisions = (data?.decisions ?? []) as DecisionFull[]

    const questionMap = new Map(decisions.map((d) => [d.id, d.question]))

    // outgoingMap[parentId] → child decision ids
    const outgoingMap = new Map<string, string[]>()
    for (const d of decisions) {
      for (const link of d.incomingLinks ?? []) {
        const pid = link.fromDecision.id
        if (!outgoingMap.has(pid)) outgoingMap.set(pid, [])
        outgoingMap.get(pid)!.push(d.id)
      }
    }

    // Group by chapter
    const chapterMap = new Map<string, { id: string; name: string; orderIndex: number; decisions: DecisionFull[] }>()
    for (const d of decisions) {
      const key = d.chapter?.id ?? '__none__'
      if (!chapterMap.has(key)) {
        chapterMap.set(key, {
          id: key,
          name: d.chapter?.name ?? 'No Chapter',
          orderIndex: d.chapter?.orderIndex ?? 999,
          decisions: [],
        })
      }
      chapterMap.get(key)!.decisions.push(d)
    }

    const chapterGroups = [...chapterMap.values()].sort((a, b) => a.orderIndex - b.orderIndex)

    const totalDecisions = decisions.length
    const totalLinks = decisions.reduce((acc, d) => acc + (d.incomingLinks?.length ?? 0), 0)
    const totalBranches = decisions.reduce((acc, d) => acc + (d.branches?.length ?? 0), 0)
    const resolved = decisions.filter((d) => d.status === 'RESOLVED').length

    return { chapterGroups, questionMap, outgoingMap, totalDecisions, totalLinks, totalBranches, resolved }
  }, [data])

  return (
    <Box
      pt={isMobile ? 1 : 0}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4">Decisions</Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={view} exclusive onChange={(_, v) => v && setView(v)} size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#786c5c', borderColor: 'rgba(120,108,92,0.3)', px: 1.5,
                '&.Mui-selected': { color: '#c8a44a', bgcolor: 'rgba(200,164,74,0.1)', borderColor: 'rgba(200,164,74,0.4)' },
              },
            }}
          >
            <ToggleButton value="list"><ViewListIcon fontSize="small" sx={{ mr: 0.5 }} />List</ToggleButton>
            <ToggleButton value="tree"><AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />Story Tree</ToggleButton>
          </ToggleButtonGroup>

          {view === 'list' && (
            <>
              <FormControl size="small" sx={{ minWidth: { xs: 'calc(50% - 4px)', sm: 160 }, flex: { xs: '1 1 calc(50% - 4px)', sm: 'unset' } }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} onChange={(e) => setStatus(e.target.value)} label="Status">
                  {STATUSES.map((s) => <MenuItem key={s} value={s}>{s || 'All Statuses'}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: { xs: 'calc(50% - 4px)', sm: 160 }, flex: { xs: '1 1 calc(50% - 4px)', sm: 'unset' } }}>
                <InputLabel>Chapter</InputLabel>
                <Select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} label="Chapter">
                  <MenuItem value="">All Chapters</MenuItem>
                  {chapterGroups.map((ch) => (
                    <MenuItem key={ch.id} value={ch.id}>{ch.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={() => { setEditDecision(null); setFormOpen(true) }}>
            New Decision
          </Button>
        </Box>
      </Box>

      {/* Stats bar */}
      {view === 'list' && !loading && !!data && (
        <Box component={motion.div} variants={slideUp} initial="hidden" animate="visible"
          sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
          {[
            { label: 'Decisions', value: totalDecisions },
            { label: 'Resolved', value: resolved },
            { label: 'Links', value: totalLinks },
            { label: 'Branches', value: totalBranches },
          ].map(({ label, value }) => (
            <Box key={label} sx={{
              px: 1.5, py: 0.75, borderRadius: 1,
              bgcolor: '#111009', border: '1px solid rgba(120,108,92,0.25)',
              display: 'flex', alignItems: 'baseline', gap: 0.75,
            }}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: '#c8a44a', fontFamily: '"Cinzel", serif', lineHeight: 1 }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: '0.65rem', color: '#786c5c', fontFamily: '"JetBrains Mono"', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {view === 'tree' && <DecisionTreeView />}

      {view === 'list' && (
        <>
          {loading && <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress sx={{ color: '#c8a44a' }} /></Box>}
          {error && <Alert severity="error">{error.message}</Alert>}

          <Box component={motion.div} variants={staggerContainer} initial="hidden" animate="visible">
            {chapterGroups
              .filter((ch) => !chapterFilter || ch.id === chapterFilter)
              .map((chapter, ci) => {
              const color = ACT_COLORS[ci % ACT_COLORS.length]
              const collapsed = collapsedChapters.has(chapter.id)
              return (
                <Box key={chapter.id} component={motion.div} variants={slideUp} sx={{ mb: 3 }}>
                  {/* Chapter header — clickable to collapse */}
                  <Box
                    onClick={() => toggleChapter(chapter.id)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: collapsed ? 0 : 1.5, cursor: 'pointer',
                      '&:hover .chapter-label': { color: '#e6d8c0' } }}
                  >
                    <Box sx={{ width: 3, height: 18, bgcolor: color, borderRadius: 2, flexShrink: 0 }} />
                    <Typography className="chapter-label" sx={{
                      fontSize: '0.68rem', color, fontFamily: '"JetBrains Mono"',
                      textTransform: 'uppercase', letterSpacing: '0.12em', transition: 'color 0.15s',
                    }}>
                      {chapter.name}
                    </Typography>
                    <Box sx={{ fontSize: '0.62rem', color: 'rgba(120,108,92,0.5)', fontFamily: '"JetBrains Mono"' }}>
                      {chapter.decisions.length} decision{chapter.decisions.length !== 1 ? 's' : ''}
                    </Box>
                    <Box sx={{ flex: 1, height: '1px', bgcolor: `${color}25` }} />
                    {collapsed
                      ? <ExpandMoreIcon sx={{ fontSize: 16, color: 'rgba(120,108,92,0.5)', flexShrink: 0 }} />
                      : <ExpandLessIcon sx={{ fontSize: 16, color: 'rgba(120,108,92,0.5)', flexShrink: 0 }} />
                    }
                  </Box>

                  <Collapse in={!collapsed}>
                  <Grid container spacing={1.5}>
                    {chapter.decisions.map((d) => {
                      const parents = (d.incomingLinks ?? []).map((l) => ({
                        question: questionMap.get(l.fromDecision.id),
                        branch: l.fromBranch?.label,
                      })).filter((p) => p.question)

                      const childIds = outgoingMap.get(d.id) ?? []
                      const children = childIds.map((id) => questionMap.get(id)).filter(Boolean) as string[]

                      return (
                        <Grid item xs={12} md={6} key={d.id}>
                          {/* Incoming links */}
                          {parents.length > 0 && (
                            <Box sx={{ mb: 0.5, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              {parents.map((p, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                                  <SubdirectoryArrowRightIcon sx={{ fontSize: 12, color: 'rgba(120,108,92,0.5)', transform: 'scaleX(-1)' }} />
                                  <Typography sx={{ fontSize: '0.63rem', color: 'rgba(120,108,92,0.6)', fontFamily: '"JetBrains Mono"', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.question!.length > 48 ? p.question!.slice(0, 48) + '…' : p.question}
                                    {p.branch && <span style={{ color: 'rgba(200,164,74,0.5)' }}> · {p.branch}</span>}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}

                          {/* Card with chapter accent */}
                          <Box sx={{
                            position: 'relative',
                            borderLeft: `3px solid ${color}50`,
                            borderRadius: '0 4px 4px 0',
                          }}>
                            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, display: 'flex', gap: 0.5 }}>
                              <Tooltip title="Edit">
                                <IconButton size="small"
                                  onClick={(e) => { e.stopPropagation(); setEditDecision(d); setFormOpen(true) }}
                                  sx={{ bgcolor: '#0b0906', color: '#786c5c', '&:hover': { color: '#c8a44a' }, width: 26, height: 26 }}>
                                  <EditIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton size="small"
                                  onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); setDeleteQuestion(d.question) }}
                                  sx={{ bgcolor: '#0b0906', color: '#786c5c', '&:hover': { color: '#b84848' }, width: 26, height: 26 }}>
                                  <DeleteIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            <DecisionCard decision={d} onResolve={handleResolve} />
                          </Box>

                          {/* Outgoing links */}
                          {children.length > 0 && (
                            <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              {children.map((q, i) => (
                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 1 }}>
                                  <ArrowForwardIcon sx={{ fontSize: 11, color: 'rgba(120,108,92,0.4)' }} />
                                  <Typography sx={{ fontSize: '0.63rem', color: 'rgba(120,108,92,0.5)', fontFamily: '"JetBrains Mono"', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {q.length > 48 ? q.slice(0, 48) + '…' : q}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Grid>
                      )
                    })}
                  </Grid>
                  </Collapse>
                </Box>
              )
            })}

            {data?.decisions?.length === 0 && (
              <Typography sx={{ color: '#786c5c', textAlign: 'center', py: 4 }}>No decisions found.</Typography>
            )}
          </Box>
        </>
      )}

      <DecisionFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditDecision(null) }}
        onSaved={() => refetch()}
        decision={editDecision}
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        title="Delete decision?"
        message={`"${deleteQuestion.slice(0, 60)}${deleteQuestion.length > 60 ? '…' : ''}" will be permanently deleted.`}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        loading={deleting}
      />
    </Box>
  )
}
