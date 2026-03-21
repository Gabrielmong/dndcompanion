import { useMemo, useEffect, useCallback, useState, useRef } from 'react'
import RichTextDisplay from './RichTextDisplay'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useMutation, gql } from '@apollo/client'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  BackgroundVariant,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Node,
  type Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Box, CircularProgress, Alert, Typography, Dialog, DialogTitle, DialogContent,
  IconButton, Button, Divider, Chip, Radio, RadioGroup, FormControlLabel, Tooltip,
  InputBase,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ReplayIcon from '@mui/icons-material/Replay'
import LockIcon from '@mui/icons-material/Lock'
import SearchIcon from '@mui/icons-material/Search'
import { useCampaign } from '../context/campaign'
import DecisionTreeNode from './DecisionTreeNode'
import EncounterTreeNode from './EncounterTreeNode'
import ChapterLaneNode from './ChapterLaneNode'
import DecisionFormDialog from './DecisionFormDialog'
import StatusBadge from './StatusBadge'
import { layoutDecisionGraph } from '../utils/decisionLayout'

const ALL_DECISIONS = gql`
  query AllDecisionsTree($campaignId: ID!) {
    decisions(campaignId: $campaignId) {
      id question context status missionName orderIndex positionX positionY
      chapter { id name playerVisible }
      branches { id label description consequence outcomeType orderIndex }
      chosenBranch { id label }
      incomingLinks { id fromDecision { id } fromBranch { id label } }
    }
  }
`

const UPDATE_CHAPTER_VISIBILITY = gql`
  mutation UpdateChapterVisibility($id: ID!, $playerVisible: Boolean!) {
    updateChapter(id: $id, input: { playerVisible: $playerVisible }) { id playerVisible }
  }
`

const ADD_DECISION_LINK = gql`
  mutation AddDecisionLink($fromDecisionId: ID!, $toDecisionId: ID!, $fromBranchId: ID) {
    addDecisionLink(fromDecisionId: $fromDecisionId, toDecisionId: $toDecisionId, fromBranchId: $fromBranchId) { id }
  }
`

const REMOVE_DECISION_LINK = gql`
  mutation RemoveDecisionLink($id: ID!) {
    removeDecisionLink(id: $id)
  }
`

const RESOLVE_DECISION = gql`
  mutation ResolveDecisionTree($id: ID!, $branchId: ID!) {
    resolveDecision(id: $id, branchId: $branchId) { id status chosenBranch { id label } }
  }
`

const UNRESOLVE_DECISION = gql`
  mutation UnresolveDecisionTree($id: ID!) {
    unresolveDecision(id: $id) { id status chosenBranch { id } }
  }
`

const DELETE_DECISION = gql`
  mutation DeleteDecisionTree($id: ID!) {
    deleteDecision(id: $id)
  }
`

const UPDATE_DECISION_POSITION = gql`
  mutation UpdateDecisionPosition($id: ID!, $x: Float!, $y: Float!) {
    updateDecisionPosition(id: $id, x: $x, y: $y)
  }
`

const ENCOUNTERS_FOR_TREE = gql`
  query EncountersForTree($campaignId: ID!) {
    encounters(campaignId: $campaignId) {
      id name status round outcomeType
      linkedDecision { id }
      outcomeDecision { id }
      participants { id isActive }
    }
  }
`

const UPDATE_ENCOUNTER_LINK = gql`
  mutation UpdateEncounterLink($id: ID!, $input: UpdateEncounterInput!) {
    updateEncounter(id: $id, input: $input) { id linkedDecision { id } outcomeDecision { id } }
  }
`

const nodeTypes = { decision: DecisionTreeNode, encounter: EncounterTreeNode, chapterLane: ChapterLaneNode }

const OUTCOME_EDGE_COLOR: Record<string, string> = {
  GOOD: '#62a870',
  BAD: '#b84848',
  NEUTRAL: 'rgba(120,108,92,0.6)',
  VARIABLE: '#c8a44a',
}

const OUTCOME_COLOR: Record<string, string> = {
  GOOD: '#62a870',
  BAD: '#b84848',
  NEUTRAL: '#786c5c',
  VARIABLE: '#c8a44a',
}

interface DecisionLink {
  id: string
  fromDecision: { id: string }
  fromBranch?: { id: string; label: string } | null
}

interface RawDecision {
  id: string
  question: string
  context?: string | null
  status: string
  missionName?: string | null
  orderIndex: number
  positionX?: number | null
  positionY?: number | null
  chapter?: { id: string; name: string; playerVisible: boolean } | null
  branches: Array<{ id: string; label: string; description?: string | null; consequence?: string | null; outcomeType: string; orderIndex: number }>
  chosenBranch?: { id: string; label: string } | null
  incomingLinks: DecisionLink[]
}

function computeLaneSeparators(
  decisions: RawDecision[],
  contentNodes: Node[],
  onToggle: (chapterId: string, currentVisible: boolean) => void,
): Node[] {
  const nodeById = new Map(contentNodes.map((n) => [n.id, n]))

  // Ordered chapters + which decision nodes belong to each
  const chapterOrder: Array<{ id: string; name: string; playerVisible: boolean }> = []
  const chapterNodeIds = new Map<string, string[]>()
  for (const d of decisions) {
    if (!d.chapter) continue
    const key = d.chapter.name
    if (!chapterNodeIds.has(key)) {
      chapterOrder.push(d.chapter)
      chapterNodeIds.set(key, [])
    }
    chapterNodeIds.get(key)!.push(d.id)
  }

  // x-extent per chapter
  const chapterMinX = new Map<string, number>()
  const chapterMaxX = new Map<string, number>()
  for (const [key, ids] of chapterNodeIds.entries()) {
    let minX = Infinity, maxX = -Infinity
    for (const nid of ids) {
      const n = nodeById.get(nid)
      if (n) { minX = Math.min(minX, n.position.x); maxX = Math.max(maxX, n.position.x + 260) }
    }
    if (minX !== Infinity) { chapterMinX.set(key, minX); chapterMaxX.set(key, maxX) }
  }

  // Graph vertical bounds
  let minY = Infinity, maxY = -Infinity
  for (const n of contentNodes) { minY = Math.min(minY, n.position.y); maxY = Math.max(maxY, n.position.y + 200) }
  if (!isFinite(minY)) return []
  const laneTop = minY - 56
  const laneHeight = maxY - laneTop + 60

  const namedChapters = chapterOrder.filter((c) => chapterMinX.has(c.name))
  return namedChapters.map((chapter, i) => {
    const x = chapterMinX.get(chapter.name)! - 20
    const nextX = i + 1 < namedChapters.length
      ? chapterMinX.get(namedChapters[i + 1].name)! - 20
      : chapterMaxX.get(chapter.name)! + 20
    return {
      id: `lane-${chapter.name}`,
      type: 'chapterLane' as const,
      position: { x, y: laneTop },
      draggable: false,
      selectable: false,
      style: { pointerEvents: 'none' },
      data: {
        label: chapter.name,
        colorIndex: i,
        height: laneHeight,
        width: Math.max(nextX - x, 40),
        playerVisible: chapter.playerVisible,
        onToggleVisibility: () => onToggle(chapter.id, chapter.playerVisible),
      },
    }
  })
}

function buildGraph(decisions: RawDecision[], encounters: unknown[] = []) {
  const chapterColorMap = new Map<string, number>()
  for (const d of decisions) {
    const key = d.chapter?.id ?? ''
    if (key && !chapterColorMap.has(key)) {
      chapterColorMap.set(key, chapterColorMap.size)
    }
  }

  const decisionMap = new Map(decisions.map((d) => [d.id, d]))

  // OR semantics: locked only if there are incoming links and NONE are satisfied
  const isLocked = (d: RawDecision) => {
    if (!d.incomingLinks?.length) return false
    const anySatisfied = d.incomingLinks.some((link) => {
      const parent = decisionMap.get(link.fromDecision.id)
      if (!parent || parent.status !== 'RESOLVED') return false
      if (link.fromBranch && parent.chosenBranch?.id !== link.fromBranch.id) return false
      return true
    })
    return !anySatisfied
  }

  const nodes = decisions.map((d) => ({
    id: d.id,
    type: 'decision' as const,
    position: { x: 0, y: 0 },
    data: {
      id: d.id,
      question: d.question,
      context: d.context,
      status: d.status,
      missionName: d.missionName,
      chapterName: d.chapter?.name,
      chapterColorIndex: d.chapter?.id ? (chapterColorMap.get(d.chapter.id) ?? -1) : -1,
      isRoot: !d.incomingLinks?.length,
      isLocked: isLocked(d),
      branches: (d.branches ?? [])
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((b) => ({
          id: b.id,
          label: b.label,
          outcomeType: b.outcomeType,
          isChosen: d.chosenBranch?.id === b.id,
        })),
    },
  }))

  // Build decision→decision edges from incomingLinks
  const edges = decisions.flatMap((d) =>
    (d.incomingLinks ?? []).map((link) => {
      const parent = decisionMap.get(link.fromDecision.id)
      const branch = link.fromBranch
      const branchOutcomeType = parent?.branches.find((b) => b.id === branch?.id)?.outcomeType ?? 'NEUTRAL'
      const isActivePath = !!branch && parent?.chosenBranch?.id === branch.id

      return {
        id: `link-${link.id}`,
        source: link.fromDecision.id,
        target: d.id,
        label: branch?.label ?? '',
        labelStyle: {
          fill: isActivePath ? OUTCOME_EDGE_COLOR[branchOutcomeType] : '#786c5c',
          fontSize: 10,
          fontFamily: '"Cinzel", serif',
        },
        labelBgStyle: { fill: '#0b0906', fillOpacity: 0.85 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 3,
        animated: isActivePath,
        style: {
          stroke: isActivePath ? OUTCOME_EDGE_COLOR[branchOutcomeType] : 'rgba(120,108,92,0.35)',
          strokeWidth: isActivePath ? 2 : 1,
          strokeDasharray: isActivePath ? undefined : '4 3',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActivePath ? OUTCOME_EDGE_COLOR[branchOutcomeType] : 'rgba(120,108,92,0.35)',
          width: 14,
          height: 14,
        },
      }
    })
  )

  // Add encounter nodes + edges
  interface RawEncounter {
    id: string
    name: string
    status: string
    round: number
    outcomeType?: string | null
    linkedDecision?: { id: string } | null
    outcomeDecision?: { id: string } | null
    participants: Array<{ id: string; isActive: boolean }>
  }

  const encounterNodes = (encounters as RawEncounter[]).map((e) => ({
    id: `enc-${e.id}`,
    type: 'encounter' as const,
    position: { x: 0, y: 0 },
    data: {
      id: e.id,
      name: e.name,
      status: e.status,
      round: e.round,
      outcomeType: e.outcomeType,
      participantCount: e.participants.length,
    },
  }))

  // Edges: decision → encounter (triggered by)
  const encounterInEdges = (encounters as RawEncounter[])
    .filter((e) => e.linkedDecision?.id && decisionMap.has(e.linkedDecision.id))
    .map((e) => ({
      id: `enc-edge-in-${e.id}`,
      source: e.linkedDecision!.id,
      target: `enc-${e.id}`,
      label: 'encounter',
      labelStyle: { fill: 'rgba(180,72,72,0.6)', fontSize: 9, fontFamily: '"JetBrains Mono"' },
      labelBgStyle: { fill: '#0b0906', fillOpacity: 0.85 },
      labelBgPadding: [3, 5] as [number, number],
      labelBgBorderRadius: 3,
      style: { stroke: 'rgba(180,72,72,0.45)', strokeWidth: 1, strokeDasharray: '4 3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(180,72,72,0.45)', width: 12, height: 12 },
    }))

  // Edges: encounter → decision (outcome leads to)
  const encounterOutEdges = (encounters as RawEncounter[])
    .filter((e) => e.outcomeDecision?.id && decisionMap.has(e.outcomeDecision.id))
    .map((e) => {
      const isCompleted = e.status === 'COMPLETED'
      const color = isCompleted ? '#62a870' : 'rgba(98,168,112,0.4)'
      return {
        id: `enc-edge-out-${e.id}`,
        source: `enc-${e.id}`,
        target: e.outcomeDecision!.id,
        label: e.outcomeType ?? 'outcome',
        animated: isCompleted,
        labelStyle: { fill: color, fontSize: 9, fontFamily: '"JetBrains Mono"' },
        labelBgStyle: { fill: '#0b0906', fillOpacity: 0.85 },
        labelBgPadding: [3, 5] as [number, number],
        labelBgBorderRadius: 3,
        style: { stroke: color, strokeWidth: isCompleted ? 2 : 1, strokeDasharray: isCompleted ? undefined : '4 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 12, height: 12 },
      }
    })

  return { nodes: [...nodes, ...encounterNodes], edges: [...edges, ...encounterInEdges, ...encounterOutEdges] }
}

function layoutKey(campaignId: string | null) {
  return `decision_tree_layout_${campaignId}`
}

function saveLayout(campaignId: string | null, nodes: Node[]) {
  if (!campaignId) return
  const positions: Record<string, { x: number; y: number }> = {}
  for (const n of nodes) {
    if (!n.id.startsWith('lane-')) positions[n.id] = n.position
  }
  localStorage.setItem(layoutKey(campaignId), JSON.stringify(positions))
}

function loadLayout(campaignId: string | null): Record<string, { x: number; y: number }> | null {
  if (!campaignId) return null
  try {
    const raw = localStorage.getItem(layoutKey(campaignId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function GraphSearch({ nodes }: { nodes: Node[] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Node[]>([])
  const { setCenter } = useReactFlow()

  const handleChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) { setResults([]); return }
    const q = value.toLowerCase()
    setResults(
      nodes
        .filter((n) => !n.id.startsWith('lane-') && !n.id.startsWith('enc-'))
        .filter((n) => (n.data?.question as string ?? '').toLowerCase().includes(q))
        .slice(0, 6)
    )
  }

  const focusNode = (node: Node) => {
    setCenter(node.position.x + 130, node.position.y + 60, { zoom: 1, duration: 500 })
    setQuery('')
    setResults([])
  }

  return (
    <Box sx={{ position: 'relative', width: 260 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        bgcolor: '#111009', border: '1px solid rgba(120,108,92,0.35)',
        borderRadius: 1, px: 1, py: 0.5,
        '&:focus-within': { borderColor: 'rgba(200,164,74,0.5)' },
      }}>
        <SearchIcon sx={{ fontSize: 15, color: '#786c5c', flexShrink: 0 }} />
        <InputBase
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search decisions…"
          sx={{ fontSize: '0.78rem', color: '#c8b89a', flex: 1,
            '& input::placeholder': { color: 'rgba(120,108,92,0.5)' } }}
        />
        {query && (
          <IconButton size="small" onClick={() => { setQuery(''); setResults([]) }}
            sx={{ p: 0.25, color: '#786c5c', '&:hover': { color: '#e6d8c0' } }}>
            <CloseIcon sx={{ fontSize: 13 }} />
          </IconButton>
        )}
      </Box>

      {results.length > 0 && (
        <Box sx={{
          position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, zIndex: 10,
          bgcolor: '#111009', border: '1px solid rgba(120,108,92,0.35)', borderRadius: 1,
          overflow: 'hidden',
        }}>
          {results.map((node) => (
            <Box key={node.id} onClick={() => focusNode(node)}
              sx={{
                px: 1.25, py: 0.75, cursor: 'pointer',
                borderBottom: '1px solid rgba(120,108,92,0.15)',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'rgba(200,164,74,0.06)' },
              }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#c8b89a', lineHeight: 1.4,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {node.data?.question as string}
              </Typography>
              {node.data?.chapterName && (
                <Typography sx={{ fontSize: '0.62rem', color: '#786c5c', fontFamily: '"JetBrains Mono"' }}>
                  {node.data.chapterName as string}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default function DecisionTreeView() {
  const { campaignId } = useCampaign()

  const { data, loading, error } = useQuery(ALL_DECISIONS, {
    variables: { campaignId },
    skip: !campaignId,
  })

  const { data: encounterData } = useQuery(ENCOUNTERS_FOR_TREE, {
    variables: { campaignId },
    skip: !campaignId,
  })

  const [updateChapterVisibility] = useMutation(UPDATE_CHAPTER_VISIBILITY, {
    refetchQueries: ['AllDecisionsTree'],
  })
  const [addLink] = useMutation(ADD_DECISION_LINK, {
    refetchQueries: ['AllDecisionsTree', 'Decisions', 'EncountersForTree'],
  })
  const [removeLink] = useMutation(REMOVE_DECISION_LINK, {
    refetchQueries: ['AllDecisionsTree', 'Decisions', 'EncountersForTree'],
  })
  const [updateEncounterLink] = useMutation(UPDATE_ENCOUNTER_LINK, {
    refetchQueries: ['EncountersForTree'],
  })
  const [resolveDecision, { loading: resolving }] = useMutation(RESOLVE_DECISION, {
    refetchQueries: ['AllDecisionsTree', 'Decisions', 'Dashboard', 'EncountersForTree'],
  })
  const [unresolveDecision, { loading: unresolving }] = useMutation(UNRESOLVE_DECISION, {
    refetchQueries: ['AllDecisionsTree', 'Decisions', 'Dashboard', 'EncountersForTree'],
  })
  const [deleteDecision, { loading: deleting }] = useMutation(DELETE_DECISION, {
    refetchQueries: ['AllDecisionsTree', 'Decisions', 'Dashboard'],
  })
  const [updateDecisionPosition] = useMutation(UPDATE_DECISION_POSITION)
  const positionSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return
    const srcIsEnc = params.source.startsWith('enc-')
    const tgtIsEnc = params.target.startsWith('enc-')

    if (!srcIsEnc && tgtIsEnc) {
      // decision → encounter: set linkedDecisionId
      const encId = params.target.replace('enc-', '')
      updateEncounterLink({ variables: { id: encId, input: { linkedDecisionId: params.source } } })
    } else if (srcIsEnc && !tgtIsEnc) {
      // encounter → decision: set outcomeDecisionId
      const encId = params.source.replace('enc-', '')
      updateEncounterLink({ variables: { id: encId, input: { outcomeDecisionId: params.target } } })
    } else if (!srcIsEnc && !tgtIsEnc) {
      // decision → decision: create a link
      addLink({ variables: { fromDecisionId: params.source, toDecisionId: params.target } })
    }
  }, [addLink, updateEncounterLink])

  const onEdgesDelete = useCallback((deleted: { id: string }[]) => {
    for (const edge of deleted) {
      if (edge.id.startsWith('link-')) {
        const linkId = edge.id.replace('link-', '')
        removeLink({ variables: { id: linkId } })
      }
    }
  }, [removeLink])

  const onEdgeContextMenu = useCallback<EdgeMouseHandler>((evt, edge) => {
    evt.preventDefault()
    if (edge.id.startsWith('link-')) {
      const linkId = edge.id.replace('link-', '')
      removeLink({ variables: { id: linkId } })
    } else if (edge.id.startsWith('enc-edge-in-')) {
      const encId = edge.id.replace('enc-edge-in-', '')
      updateEncounterLink({ variables: { id: encId, input: { linkedDecisionId: null } } })
    } else if (edge.id.startsWith('enc-edge-out-')) {
      const encId = edge.id.replace('enc-edge-out-', '')
      updateEncounterLink({ variables: { id: encId, input: { outcomeDecisionId: null } } })
    }
  }, [removeLink, updateEncounterLink])

  // Node hover tooltip (context / DM notes)
  const [nodeHover, setNodeHover] = useState<{ x: number; y: number; context: string } | null>(null)
  const onNodeMouseEnter = useCallback<NodeMouseHandler>((evt, node) => {
    const ctx = node.data?.context
    if (ctx) setNodeHover({ x: evt.clientX, y: evt.clientY, context: ctx })
  }, [])
  const onNodeMouseMove = useCallback<NodeMouseHandler>((evt, node) => {
    const ctx = node.data?.context
    if (ctx) setNodeHover((prev) => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null)
  }, [])
  const onNodeMouseLeave = useCallback<NodeMouseHandler>(() => {
    setNodeHover(null)
  }, [])

  // Edge hover tooltip
  const [edgeHover, setEdgeHover] = useState<{ x: number; y: number } | null>(null)
  const onEdgeMouseEnter = useCallback<EdgeMouseHandler>((evt) => {
    setEdgeHover({ x: evt.clientX, y: evt.clientY })
  }, [])
  const onEdgeMouseMove = useCallback<EdgeMouseHandler>((evt) => {
    setEdgeHover({ x: evt.clientX, y: evt.clientY })
  }, [])
  const onEdgeMouseLeave = useCallback<EdgeMouseHandler>(() => {
    setEdgeHover(null)
  }, [])

  // Node click state
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState('')

  const selectedDecision: RawDecision | null = useMemo(
    () => data?.decisions?.find((d: RawDecision) => d.id === selectedId) ?? null,
    [data, selectedId]
  )

  // Reset branch selection when modal opens for a new decision
  useEffect(() => {
    if (selectedId) { setSelectedBranch(''); setConfirmDelete(false) }
  }, [selectedId])

  const onNodeClick = useCallback<NodeMouseHandler>((evt, node) => {
    if (node.id.startsWith('enc-') || node.id.startsWith('lane-')) return
    if (evt.ctrlKey || evt.metaKey || evt.shiftKey) return // multi-select mode
    setSelectedId(node.id)
  }, [])

  // Keep a stable ref to decisions so handleNodesChange can access them without deps
  const decisionsRef = useRef<RawDecision[]>([])
  useEffect(() => { decisionsRef.current = data?.decisions ?? [] }, [data])

  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<Viewport>({ x: 0, y: 0, zoom: 1 })
  const knownIdsRef = useRef<Set<string>>(new Set())

  const toggleVisibility = useCallback((chapterId: string, currentVisible: boolean) => {
    updateChapterVisibility({ variables: { id: chapterId, playerVisible: !currentVisible } })
  }, [updateChapterVisibility])

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (!data?.decisions?.length) return { nodes: [], edges: [] }
    const { nodes, edges } = buildGraph(data.decisions, encounterData?.encounters ?? [])
    const laid = layoutDecisionGraph(nodes, edges)

    // Apply backend-saved positions, fall back to localStorage for legacy
    const backendPositions: Record<string, { x: number; y: number }> = {}
    for (const d of data.decisions as RawDecision[]) {
      if (d.positionX != null && d.positionY != null) {
        backendPositions[d.id] = { x: d.positionX, y: d.positionY }
      }
    }
    const legacySaved = Object.keys(backendPositions).length === 0 ? loadLayout(campaignId) : null
    const saved = Object.keys(backendPositions).length > 0 ? backendPositions : legacySaved
    if (saved) {
      laid.nodes = laid.nodes.map((n) => saved[n.id] ? { ...n, position: saved[n.id] } : n)
    }

    const laneNodes = computeLaneSeparators(data.decisions, laid.nodes, toggleVisibility)
    return { nodes: [...laneNodes, ...laid.nodes], edges: laid.edges }
  }, [data, encounterData, campaignId, toggleVisibility])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  // Place newly-created decision nodes at the current viewport center
  useEffect(() => {
    if (!data?.decisions) return
    const currentIds = new Set<string>(data.decisions.map((d: RawDecision) => d.id))
    const newIds = [...currentIds].filter((id) => !knownIdsRef.current.has(id))
    if (newIds.length > 0 && knownIdsRef.current.size > 0) {
      const vp = viewportRef.current
      const el = containerRef.current
      const cw = el ? el.offsetWidth : 800
      const ch = el ? el.offsetHeight : 500
      const cx = (cw / 2 - vp.x) / vp.zoom
      const cy = (ch / 2 - vp.y) / vp.zoom
      const pos = { x: cx - 130, y: cy - 60 }

      const saved = loadLayout(campaignId) ?? {}
      for (const id of newIds) saved[id] = pos
      localStorage.setItem(layoutKey(campaignId), JSON.stringify(saved))
      for (const id of newIds) {
        updateDecisionPosition({ variables: { id, x: pos.x, y: pos.y } })
      }

      setNodes((current) => {
        const updated = current.map((n) => (newIds.includes(n.id) ? { ...n, position: pos } : n))
        const content = updated.filter((n) => !n.id.startsWith('lane-'))
        const lanes = computeLaneSeparators(decisionsRef.current, content, toggleVisibility)
        return [...lanes, ...content]
      })
    }
    knownIdsRef.current = currentIds
  }, [data, campaignId, setNodes, toggleVisibility, updateDecisionPosition])

  // Save layout + recompute lane sizes on drag stop
  const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
    onNodesChange(changes)
    const dragEndIds = changes
      .filter((c): c is Extract<typeof c, { type: 'position' }> => c.type === 'position' && !c.dragging)
      .map((c) => c.id)
      .filter((id) => !id.startsWith('lane-') && !id.startsWith('enc-'))
    if (dragEndIds.length > 0) {
      setNodes((current) => {
        const content = current.filter((n) => !n.id.startsWith('lane-'))
        saveLayout(campaignId, content) // keep localStorage as cache
        const lanes = computeLaneSeparators(decisionsRef.current, content, toggleVisibility)
        // Persist to backend — read final position from node state
        for (const id of dragEndIds) {
          const node = content.find((n) => n.id === id)
          if (!node) continue
          const { x, y } = node.position
          clearTimeout(positionSaveTimers.current[id])
          positionSaveTimers.current[id] = setTimeout(() => {
            updateDecisionPosition({ variables: { id, x, y } })
          }, 400)
        }
        return [...lanes, ...content]
      })
    }
  }, [onNodesChange, setNodes, campaignId, toggleVisibility, updateDecisionPosition])

  const isResolved = selectedDecision?.status === 'RESOLVED'
  const isLocked = selectedDecision && (() => {
    const links = selectedDecision.incomingLinks ?? []
    if (!links.length) return false
    return !links.some((link) => {
      const parent = data?.decisions?.find((d: RawDecision) => d.id === link.fromDecision.id)
      if (!parent || parent.status !== 'RESOLVED') return false
      if (link.fromBranch && parent.chosenBranch?.id !== link.fromBranch.id) return false
      return true
    })
  })()

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
      <CircularProgress sx={{ color: '#c8a44a' }} />
    </Box>
  )
  if (error) return <Alert severity="error">{error.message}</Alert>

  if (!nodes.length) return (
    <Box sx={{ textAlign: 'center', py: 8 }}>
      <Typography sx={{ color: '#786c5c' }}>No decisions to display.</Typography>
    </Box>
  )

  return (
    <>
      <style>{`.react-flow__node.selected > div { outline: none !important; box-shadow: none !important; }`}</style>
      {edgeHover && (
        <Box sx={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          left: edgeHover.x + 14, top: edgeHover.y - 10,
          bgcolor: '#1a1710', border: '1px solid rgba(120,108,92,0.4)',
          borderRadius: 0.75, px: 1, py: 0.4,
          fontSize: '0.68rem', color: '#786c5c', fontFamily: '"JetBrains Mono"',
          whiteSpace: 'nowrap',
        }}>
          right-click to remove
        </Box>
      )}
      {nodeHover && (
        <Box sx={{
          position: 'fixed', pointerEvents: 'none', zIndex: 9999,
          left: nodeHover.x + 14, top: nodeHover.y - 10,
          bgcolor: '#1a1710', border: '1px solid rgba(120,108,92,0.4)',
          borderRadius: 0.75, px: 1.25, py: 0.75,
          maxWidth: 280,
        }}>
          <Typography sx={{ fontSize: '0.62rem', color: '#786c5c', fontFamily: '"JetBrains Mono"', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            DM Notes
          </Typography>
          <RichTextDisplay html={nodeHover.context} fontSize="0.72rem" />
        </Box>
      )}
      <Box ref={containerRef} sx={{ width: '100%', height: 'calc(100svh - 210px)', minHeight: 500, borderRadius: 1, overflow: 'hidden', border: '1px solid rgba(120,108,92,0.3)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeContextMenu={onEdgeContextMenu}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseMove={onEdgeMouseMove}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseMove={onNodeMouseMove}
          onNodeMouseLeave={onNodeMouseLeave}
          onMove={(_, viewport) => { viewportRef.current = viewport }}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Control"
          selectionOnDrag
          panOnDrag={[1, 2]}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0b0906' }}
          defaultEdgeOptions={{ type: 'smoothstep' }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(120,108,92,0.15)" />
          <Controls style={{ background: 'transparent' }} />
          <Panel position="top-left" style={{ margin: '12px' }}>
            <GraphSearch nodes={nodes} />
          </Panel>
          <MiniMap
            nodeColor={(node) => {
              if (node.id.startsWith('lane-')) return 'transparent'
              const s = node.data?.status
              if (s === 'RESOLVED') return '#62a870'
              if (s === 'ACTIVE') return '#c8a44a'
              if (s === 'SKIPPED') return '#3a332a'
              return '#786c5c'
            }}
            nodeStrokeColor={(node) => node.id.startsWith('lane-') ? 'transparent' : 'transparent'}
            maskColor="rgba(11,9,6,0.7)"
            style={{ background: '#111009', border: '1px solid rgba(120,108,92,0.3)' }}
          />
        </ReactFlow>
      </Box>

      <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mt: 1, px: 0.5 }}>
        {[
          'Click a node to view or resolve a decision',
          'Drag from a node handle to connect two nodes',
          'Right-click a connection to remove it',
          'Ctrl+click or drag empty space to multi-select · drag selection to move',
        ].map((hint) => (
          <Typography key={hint} sx={{ fontSize: '0.68rem', color: 'rgba(120,108,92,0.5)', fontFamily: '"JetBrains Mono"' }}>
            {hint}
          </Typography>
        ))}
      </Box>

      {/* Decision detail modal */}
      <Dialog
        open={!!selectedId && !editOpen}
        onClose={() => setSelectedId(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#0f0d0a', border: '1px solid rgba(120,108,92,0.3)' } }}
      >
        {selectedDecision && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
                    <StatusBadge status={selectedDecision.status} />
                    {selectedDecision.chapter && (
                      <Chip
                        label={selectedDecision.chapter.name}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, bgcolor: '#1a160f', color: '#786c5c' }}
                      />
                    )}
                    {isLocked && <LockIcon sx={{ fontSize: 14, color: '#786c5c' }} />}
                  </Box>
                  {selectedDecision.missionName && (
                    <Typography sx={{ fontSize: '0.72rem', color: '#c8a44a', mb: 0.5, fontFamily: '"JetBrains Mono"' }}>
                      {selectedDecision.missionName}
                    </Typography>
                  )}
                  <Typography sx={{ color: '#e6d8c0', fontFamily: '"Cinzel", serif', fontSize: '0.95rem', lineHeight: 1.4 }}>
                    {selectedDecision.question}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  <Tooltip title="Edit decision">
                    <IconButton size="small" onClick={() => setEditOpen(true)}
                      sx={{ color: '#786c5c', '&:hover': { color: '#c8a44a' } }}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete decision">
                    <IconButton size="small" onClick={() => setConfirmDelete(true)}
                      sx={{ color: '#786c5c', '&:hover': { color: '#b84848' } }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setSelectedId(null)}
                    sx={{ color: '#786c5c', '&:hover': { color: '#e6d8c0' } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ pt: 0 }}>
              <AnimatePresence>
              {confirmDelete && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto', transition: { duration: 0.2 } }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                  style={{ overflow: 'hidden' }}
                >
                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'rgba(184,72,72,0.1)', borderRadius: 1, border: '1px solid rgba(184,72,72,0.3)' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: '#b84848', mb: 1 }}>
                    Delete this decision? This cannot be undone.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small" variant="contained" disabled={deleting}
                      onClick={async () => {
                        await deleteDecision({ variables: { id: selectedDecision.id } })
                        setSelectedId(null)
                      }}
                      sx={{ bgcolor: '#b84848', '&:hover': { bgcolor: '#9a3a3a' }, fontSize: '0.75rem' }}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                    <Button size="small" onClick={() => setConfirmDelete(false)}
                      sx={{ color: '#786c5c', fontSize: '0.75rem' }}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
                </motion.div>
              )}
              </AnimatePresence>
              {selectedDecision.context && (
                <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#0e0c09', borderRadius: 1, border: '1px solid rgba(120,108,92,0.2)' }}>
                  <Typography sx={{ fontSize: '0.62rem', color: '#786c5c', fontFamily: '"JetBrains Mono"', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    DM Notes
                  </Typography>
                  <RichTextDisplay html={selectedDecision.context} />
                </Box>
              )}

              {(selectedDecision.incomingLinks ?? []).length > 0 && (
                <Box sx={{ mb: 1.5, p: 1, bgcolor: '#111009', borderRadius: 1, border: '1px solid rgba(120,108,92,0.2)' }}>
                  <Typography sx={{ fontSize: '0.68rem', color: '#786c5c', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Unlocked by ({selectedDecision.incomingLinks.length > 1 ? 'any of' : ''}):
                  </Typography>
                  {selectedDecision.incomingLinks.map((link) => {
                    const parent = data?.decisions?.find((d: RawDecision) => d.id === link.fromDecision.id)
                    return (
                      <Typography key={link.id} sx={{ fontSize: '0.7rem', color: '#b4a48a', mb: 0.25 }}>
                        • {parent?.question ?? link.fromDecision.id}
                        {link.fromBranch && (
                          <span style={{ color: '#c8a44a' }}> → {link.fromBranch.label}</span>
                        )}
                      </Typography>
                    )
                  })}
                </Box>
              )}

              <Divider sx={{ mb: 1.5, borderColor: 'rgba(120,108,92,0.2)' }} />

              {/* Resolved: show chosen branch + reset */}
              {isResolved ? (
                <Box>
                  {selectedDecision.branches.map((b) => (
                    <Box key={b.id} sx={{
                      p: 1, mb: 0.75, borderRadius: 1,
                      border: `1px solid ${selectedDecision.chosenBranch?.id === b.id ? `${OUTCOME_COLOR[b.outcomeType]}60` : 'rgba(120,108,92,0.15)'}`,
                      bgcolor: selectedDecision.chosenBranch?.id === b.id ? `${OUTCOME_COLOR[b.outcomeType]}18` : 'transparent',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          bgcolor: selectedDecision.chosenBranch?.id === b.id ? OUTCOME_COLOR[b.outcomeType] : 'transparent',
                          border: `1.5px solid ${OUTCOME_COLOR[b.outcomeType] ?? '#786c5c'}`,
                        }} />
                        <Typography sx={{
                          fontSize: '0.85rem',
                          color: selectedDecision.chosenBranch?.id === b.id ? OUTCOME_COLOR[b.outcomeType] : '#786c5c',
                          fontWeight: selectedDecision.chosenBranch?.id === b.id ? 600 : 400,
                        }}>
                          {b.label}
                        </Typography>
                      </Box>
                      {b.consequence && selectedDecision.chosenBranch?.id === b.id && (
                        <Typography sx={{ fontSize: '0.75rem', color: '#786c5c', mt: 0.5, ml: 2.5, fontStyle: 'italic' }}>
                          {b.consequence}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<ReplayIcon sx={{ fontSize: 14 }} />}
                    disabled={unresolving}
                    onClick={() => unresolveDecision({ variables: { id: selectedDecision.id } })}
                    sx={{ mt: 0.5, color: '#786c5c', fontSize: '0.75rem', '&:hover': { color: '#c8a44a' } }}
                  >
                    Reset to Pending
                  </Button>
                </Box>
              ) : isLocked ? (
                <Typography sx={{ color: '#786c5c', fontSize: '0.82rem', fontStyle: 'italic' }}>
                  This decision is locked until its prerequisite is resolved.
                </Typography>
              ) : (
                /* Pending/Active: show branch picker + resolve */
                <Box>
                  <Typography sx={{ fontSize: '0.72rem', color: '#786c5c', mb: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Choose an outcome
                  </Typography>
                  <RadioGroup value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                    {selectedDecision.branches.map((b) => (
                      <Box key={b.id} sx={{
                        mb: 0.75, p: 1, borderRadius: 1,
                        border: `1px solid ${selectedBranch === b.id ? `${OUTCOME_COLOR[b.outcomeType]}60` : 'rgba(120,108,92,0.2)'}`,
                        bgcolor: selectedBranch === b.id ? `${OUTCOME_COLOR[b.outcomeType]}15` : 'transparent',
                        cursor: 'pointer',
                      }}
                        onClick={() => setSelectedBranch(b.id)}
                      >
                        <FormControlLabel
                          value={b.id}
                          control={<Radio size="small" sx={{ color: '#786c5c', '&.Mui-checked': { color: OUTCOME_COLOR[b.outcomeType] ?? '#c8a44a' }, p: 0.5 }} />}
                          label={
                            <Box>
                              <Typography sx={{ fontSize: '0.85rem', color: selectedBranch === b.id ? OUTCOME_COLOR[b.outcomeType] : '#e6d8c0' }}>
                                {b.label}
                              </Typography>
                              {b.consequence && (
                                <Typography sx={{ fontSize: '0.73rem', color: '#786c5c', mt: 0.25 }}>
                                  {b.consequence}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ m: 0, alignItems: 'flex-start', width: '100%' }}
                        />
                      </Box>
                    ))}
                  </RadioGroup>
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!selectedBranch || resolving}
                    onClick={() => resolveDecision({ variables: { id: selectedDecision.id, branchId: selectedBranch } })}
                    sx={{ mt: 0.5 }}
                  >
                    {resolving ? 'Resolving…' : 'Resolve'}
                  </Button>
                </Box>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* Edit dialog — reuses existing form */}
      <DecisionFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setEditOpen(false)}
        decision={selectedDecision as Parameters<typeof DecisionFormDialog>[0]['decision']}
      />
    </>
  )
}
