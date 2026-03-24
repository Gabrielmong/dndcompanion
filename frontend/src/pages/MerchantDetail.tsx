import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box, Typography, Button, IconButton, Tooltip, CircularProgress, Alert,
  Chip, Divider, LinearProgress,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import RemoveIcon from '@mui/icons-material/Remove'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import StorefrontIcon from '@mui/icons-material/Storefront'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import ConfirmDeleteDialog from '../components/ConfirmDeleteDialog'
// Reuse dialogs from Merchants page
import { WareFormDialog, MerchantFormDialog } from './Merchants'

// ── GraphQL ───────────────────────────────────────────────────────────────────

const MERCHANT = gql`
  query Merchant($id: ID!) {
    merchant(id: $id) {
      id name type region description
      wares { id name category description price stock maxStock rarity available haggleCD notes }
    }
  }
`
const SELL_WARE   = gql`mutation SellWare($id: ID!)   { sellWare(id: $id)   { id stock } }`
const RESTOCK     = gql`mutation RestockMerchant($id: ID!) { restockMerchant(id: $id) { id wares { id stock } } }`
const DELETE_WARE = gql`mutation DeleteWare($id: ID!) { deleteWare(id: $id) }`
const DELETE_MERCHANT = gql`mutation DeleteMerchant($id: ID!) { deleteMerchant(id: $id) }`
const UPDATE_WARE_AVAIL = gql`
  mutation ToggleWareAvail($id: ID!, $input: UpdateWareInput!) {
    updateWare(id: $id, input: $input) { id available }
  }
`

// ── Types ─────────────────────────────────────────────────────────────────────

type Ware = {
  id: string; name: string; category: string; description?: string | null
  price: number; stock: number; maxStock: number; rarity?: string | null
  available: boolean; haggleCD?: number | null; notes?: string | null
}
type Merchant = {
  id: string; name: string; type: string; region: string; description?: string | null
  wares: Ware[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  armor: '#6ea8d4', weapon: '#c87050', food: '#62a870',
  component: '#a862a8', 'magic item': '#c8a44a', tool: '#786c5c',
  clothing: '#a8c862', mount: '#d47c50', misc: '#5c6a78',
}

function formatPrice(gp: number) {
  if (gp === 0) return 'free'
  if (Number.isInteger(gp)) return `${gp} gp`
  const totalSp = Math.round(gp * 10)
  const gpPart = Math.floor(totalSp / 10)
  const spPart = totalSp % 10
  if (gpPart > 0 && spPart > 0) return `${gpPart} gp ${spPart} sp`
  if (gpPart > 0) return `${gpPart} gp`
  return `${spPart} sp`
}

function stockPercent(stock: number, maxStock: number) {
  if (stock === -1 || maxStock <= 0 || maxStock === -1) return null
  return Math.round((stock / maxStock) * 100)
}

function stockBarColor(pct: number | null, available: boolean) {
  if (!available) return '#333'
  if (pct === null) return '#62a870'   // unlimited → green
  if (pct === 0)   return '#b84848'
  if (pct <= 30)   return '#c8a44a'
  return '#62a870'
}

// ── Ware Row ──────────────────────────────────────────────────────────────────

function WareRow({ ware, onSell, onToggleAvail, onEdit, onDelete }: {
  ware: Ware
  onSell: () => void
  onToggleAvail: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const pct = stockPercent(ware.stock, ware.maxStock)
  const barColor = stockBarColor(pct, ware.available)
  const isUnlimited = ware.stock === -1

  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: '1fr 180px 90px 100px',
      alignItems: 'center',
      gap: 1.5,
      px: 1.5,
      py: 1,
      borderRadius: 0.5,
      opacity: ware.available ? 1 : 0.45,
      '&:hover': { bgcolor: 'rgba(120,108,92,0.06)' },
      '&:hover .ware-actions': { opacity: 1 },
    }}>
      {/* Name + meta */}
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{
            fontSize: '0.85rem', color: ware.available ? '#e6d8c0' : '#786c5c',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ware.name}
          </Typography>
          {!ware.available && (
            <Tooltip title="Unavailable"><VisibilityOffIcon sx={{ fontSize: 12, color: '#4a4235' }} /></Tooltip>
          )}
          {ware.rarity && (
            <Typography sx={{ fontSize: '0.65rem', color: '#786c5c', textTransform: 'capitalize', flexShrink: 0 }}>
              {ware.rarity}
            </Typography>
          )}
        </Box>
        {ware.description && (
          <Typography sx={{ fontSize: '0.68rem', color: '#786c5c', mt: 0.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ware.description}
          </Typography>
        )}
        {ware.haggleCD != null && (
          <Typography sx={{ fontSize: '0.62rem', color: '#4a4235', mt: 0.1 }}>
            Haggle DC {ware.haggleCD}
          </Typography>
        )}
      </Box>

      {/* Stock bar */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
          <Typography sx={{ fontSize: '0.7rem', color: barColor, fontFamily: '"JetBrains Mono"' }}>
            {isUnlimited ? '∞ unlimited' : `${ware.stock} / ${ware.maxStock}`}
          </Typography>
          {!isUnlimited && ware.available && (
            <Box className="ware-actions" sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.15s', gap: 0.25 }}>
              <Tooltip title="Sold 1">
                <span>
                  <IconButton size="small" onClick={onSell} disabled={ware.stock === 0}
                    sx={{ p: 0.2, color: '#786c5c', '&:hover': { color: '#c87050' } }}>
                    <RemoveIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          )}
        </Box>
        {!isUnlimited && (
          <LinearProgress
            variant="determinate"
            value={pct ?? 100}
            sx={{
              height: 4, borderRadius: 2,
              bgcolor: 'rgba(120,108,92,0.15)',
              '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 2 },
            }}
          />
        )}
        {isUnlimited && (
          <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(98,168,112,0.2)' }} />
        )}
      </Box>

      {/* Price */}
      <Typography sx={{ fontSize: '0.82rem', color: '#c8a44a', fontFamily: '"JetBrains Mono"', textAlign: 'right' }}>
        {formatPrice(ware.price)}
      </Typography>

      {/* Actions */}
      <Box className="ware-actions" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25, opacity: 0, transition: 'opacity 0.15s' }}>
        <Tooltip title={ware.available ? 'Mark unavailable' : 'Mark available'}>
          <IconButton size="small" onClick={onToggleAvail}
            sx={{ p: 0.3, color: '#786c5c', '&:hover': { color: ware.available ? '#4a4235' : '#62a870' } }}>
            <VisibilityOffIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={onEdit}
            sx={{ p: 0.3, color: '#786c5c', '&:hover': { color: '#c8a44a' } }}>
            <EditIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={onDelete}
            sx={{ p: 0.3, color: '#786c5c', '&:hover': { color: '#b84848' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MerchantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [showUnavailable, setShowUnavailable] = useState(false)
  const [wareForm, setWareForm] = useState(false)
  const [editWare, setEditWare] = useState<Ware | null>(null)
  const [editMerchant, setEditMerchant] = useState(false)
  const [deleteWareId, setDeleteWareId] = useState<string | null>(null)
  const [deleteWareName, setDeleteWareName] = useState('')
  const [deleteMerchantOpen, setDeleteMerchantOpen] = useState(false)

  const { data, loading, error, refetch } = useQuery(MERCHANT, { variables: { id }, skip: !id })
  const [sellWare]       = useMutation(SELL_WARE)
  const [restock]        = useMutation(RESTOCK)
  const [deleteWare, { loading: deletingWare }] = useMutation(DELETE_WARE)
  const [deleteMerchant, { loading: deletingMerchant }] = useMutation(DELETE_MERCHANT)
  const [toggleAvail]    = useMutation(UPDATE_WARE_AVAIL)

  const merchant: Merchant | null = data?.merchant ?? null

  const categories = useMemo(() => {
    if (!merchant) return []
    return [...new Set(merchant.wares.map((w) => w.category))].sort()
  }, [merchant])

  const displayedWares = useMemo(() => {
    if (!merchant) return []
    return merchant.wares.filter((w) => {
      if (activeCat && w.category !== activeCat) return false
      if (!showUnavailable && !w.available) return false
      return true
    })
  }, [merchant, activeCat, showUnavailable])

  // Group displayed wares by category (when no filter active)
  const grouped = useMemo(() => {
    const map = new Map<string, Ware[]>()
    displayedWares.forEach((w) => {
      const arr = map.get(w.category) ?? []
      arr.push(w)
      map.set(w.category, arr)
    })
    return map
  }, [displayedWares])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress sx={{ color: '#c8a44a' }} /></Box>
  if (error)   return <Alert severity="error">{error.message}</Alert>
  if (!merchant) return <Alert severity="warning">Merchant not found.</Alert>

  const totalWares   = merchant.wares.length
  const outOfStock   = merchant.wares.filter((w) => w.stock === 0 && w.available).length
  const unavailCount = merchant.wares.filter((w) => !w.available).length

  const handleSell = async (wareId: string) => {
    await sellWare({ variables: { id: wareId } })
    refetch()
  }
  const handleToggleAvail = async (ware: Ware) => {
    await toggleAvail({ variables: { id: ware.id, input: { available: !ware.available } } })
    refetch()
  }
  const handleRestock = async () => {
    await restock({ variables: { id: merchant.id } })
    refetch()
  }
  const handleDeleteWare = async () => {
    if (!deleteWareId) return
    await deleteWare({ variables: { id: deleteWareId } })
    setDeleteWareId(null)
    refetch()
  }
  const handleDeleteMerchant = async () => {
    await deleteMerchant({ variables: { id: merchant.id } })
    navigate('/merchants')
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto' }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate('/merchants')}
          sx={{ color: '#786c5c', '&:hover': { color: '#c8a44a' } }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontSize: '0.75rem', color: '#786c5c' }}>Merchants</Typography>
      </Box>

      {/* Header card */}
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3,
        p: 2, bgcolor: '#0d0b07', borderRadius: 1,
        border: '1px solid rgba(200,164,74,0.2)',
        borderLeft: '3px solid #c8a44a',
      }}>
        <StorefrontIcon sx={{ fontSize: 28, color: '#c8a44a', mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontFamily: '"Cinzel"', color: '#e6d8c0', lineHeight: 1.2 }}>
            {merchant.name}
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: '#786c5c', mt: 0.25, textTransform: 'capitalize' }}>
            {merchant.type} · {merchant.region}
          </Typography>
          {merchant.description && (
            <Typography sx={{ fontSize: '0.8rem', color: '#b4a48a', mt: 0.75 }}>
              {merchant.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Typography sx={{ fontSize: '0.7rem', color: '#786c5c' }}>
              <Box component="span" sx={{ color: '#e6d8c0', fontFamily: '"JetBrains Mono"' }}>{totalWares}</Box> wares
            </Typography>
            {outOfStock > 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: '#b84848' }}>
                <Box component="span" sx={{ fontFamily: '"JetBrains Mono"' }}>{outOfStock}</Box> out of stock
              </Typography>
            )}
            {unavailCount > 0 && (
              <Typography sx={{ fontSize: '0.7rem', color: '#4a4235' }}>
                <Box component="span" sx={{ fontFamily: '"JetBrains Mono"' }}>{unavailCount}</Box> unavailable
              </Typography>
            )}
          </Box>
        </Box>
        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Restock all">
            <IconButton size="small" onClick={handleRestock}
              sx={{ color: '#786c5c', '&:hover': { color: '#62a870' } }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit merchant">
            <IconButton size="small" onClick={() => setEditMerchant(true)}
              sx={{ color: '#786c5c', '&:hover': { color: '#c8a44a' } }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete merchant">
            <IconButton size="small" onClick={() => setDeleteMerchantOpen(true)}
              sx={{ color: '#786c5c', '&:hover': { color: '#b84848' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Category filter + controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label="All"
          size="small"
          onClick={() => setActiveCat(null)}
          sx={{
            bgcolor: !activeCat ? 'rgba(200,164,74,0.15)' : 'transparent',
            border: '1px solid', borderColor: !activeCat ? 'rgba(200,164,74,0.5)' : 'rgba(120,108,92,0.3)',
            color: !activeCat ? '#c8a44a' : '#786c5c',
          }}
        />
        {categories.map((cat) => {
          const count = merchant.wares.filter((w) => w.category === cat && w.available).length
          const color = CATEGORY_COLORS[cat] ?? '#786c5c'
          const active = activeCat === cat
          return (
            <Chip
              key={cat}
              label={`${cat} (${count})`}
              size="small"
              onClick={() => setActiveCat(active ? null : cat)}
              sx={{
                textTransform: 'capitalize',
                bgcolor: active ? `${color}22` : 'transparent',
                border: '1px solid', borderColor: active ? `${color}88` : 'rgba(120,108,92,0.3)',
                color: active ? color : '#786c5c',
              }}
            />
          )
        })}
        <Box sx={{ flex: 1 }} />
        {unavailCount > 0 && (
          <Chip
            label={showUnavailable ? 'Hide unavailable' : 'Show unavailable'}
            size="small"
            onClick={() => setShowUnavailable((v) => !v)}
            sx={{
              bgcolor: 'transparent', border: '1px solid rgba(120,108,92,0.2)',
              color: '#4a4235', fontSize: '0.65rem',
            }}
          />
        )}
        <Button size="small" startIcon={<AddIcon />}
          onClick={() => { setEditWare(null); setWareForm(true) }}
          variant="outlined"
          sx={{ borderColor: 'rgba(200,164,74,0.3)', color: '#c8a44a', fontSize: '0.75rem',
            '&:hover': { borderColor: '#c8a44a', bgcolor: 'rgba(200,164,74,0.06)' } }}>
          Add ware
        </Button>
      </Box>

      {/* Column header */}
      {displayedWares.length > 0 && (
        <Box sx={{
          display: 'grid', gridTemplateColumns: '1fr 180px 90px 100px',
          px: 1.5, pb: 0.5, gap: 1.5,
        }}>
          <Typography sx={{ fontSize: '0.62rem', color: '#4a4235', textTransform: 'uppercase', letterSpacing: 0.8 }}>Name</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#4a4235', textTransform: 'uppercase', letterSpacing: 0.8 }}>Stock</Typography>
          <Typography sx={{ fontSize: '0.62rem', color: '#4a4235', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'right' }}>Price</Typography>
          <Box />
        </Box>
      )}

      {/* Wares */}
      {displayedWares.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ color: '#786c5c', fontSize: '0.85rem' }}>
            {merchant.wares.length === 0 ? 'No wares yet.' : 'No wares match the current filter.'}
          </Typography>
        </Box>
      ) : activeCat ? (
        // Single category — flat list
        displayedWares.map((ware) => (
          <WareRow key={ware.id} ware={ware}
            onSell={() => handleSell(ware.id)}
            onToggleAvail={() => handleToggleAvail(ware)}
            onEdit={() => { setEditWare(ware); setWareForm(true) }}
            onDelete={() => { setDeleteWareId(ware.id); setDeleteWareName(ware.name) }}
          />
        ))
      ) : (
        // All categories — grouped
        [...grouped.entries()].map(([cat, wares]) => (
          <Box key={cat} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
              <Typography sx={{
                fontSize: '0.65rem', fontFamily: '"Cinzel"', letterSpacing: 1.2,
                textTransform: 'uppercase', color: CATEGORY_COLORS[cat] ?? '#786c5c',
              }}>
                {cat}
              </Typography>
              <Divider sx={{ flex: 1, borderColor: `${CATEGORY_COLORS[cat] ?? '#786c5c'}22` }} />
            </Box>
            {wares.map((ware) => (
              <WareRow key={ware.id} ware={ware}
                onSell={() => handleSell(ware.id)}
                onToggleAvail={() => handleToggleAvail(ware)}
                onEdit={() => { setEditWare(ware); setWareForm(true) }}
                onDelete={() => { setDeleteWareId(ware.id); setDeleteWareName(ware.name) }}
              />
            ))}
          </Box>
        ))
      )}

      {/* Dialogs */}
      <WareFormDialog
        open={wareForm} merchantId={merchant.id} initial={editWare}
        onClose={() => setWareForm(false)} onSaved={refetch}
      />
      <MerchantFormDialog
        open={editMerchant} campaignId={merchant.id} initial={merchant}
        onClose={() => setEditMerchant(false)} onSaved={refetch}
      />
      <ConfirmDeleteDialog
        open={!!deleteWareId} title={deleteWareName} loading={deletingWare}
        onClose={() => setDeleteWareId(null)} onConfirm={handleDeleteWare}
      />
      <ConfirmDeleteDialog
        open={deleteMerchantOpen} title={merchant.name} loading={deletingMerchant}
        onClose={() => setDeleteMerchantOpen(false)} onConfirm={handleDeleteMerchant}
      />
    </Box>
  )
}
