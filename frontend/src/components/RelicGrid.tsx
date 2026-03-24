import { Card, CardContent, Box, Typography, Tooltip, IconButton, Grid2 } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'

interface Item {
  id: string
  name: string
  type: string
  description?: string | null
  narrativeWeight?: string | null
  locationFound?: string | null
  inPossession: boolean
}

interface Props {
  items: Item[]
  onToggle?: (id: string, current: boolean) => void
  onEdit?: (item: Item) => void
  onDelete?: (item: Item) => void
}

export default function RelicGrid({ items, onToggle, onEdit, onDelete }: Props) {
  return (
    <Grid2 container spacing={1.5}>
      {items.map((item) => (
        <Grid2 size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
          <Tooltip title={item.narrativeWeight ?? ''} arrow placement="top">
            <Card
              onClick={() => onToggle?.(item.id, item.inPossession)}
              sx={{
                cursor: onToggle ? 'pointer' : 'default',
                border: item.inPossession
                  ? '1px solid rgba(200,164,74,0.6)'
                  : '1px solid rgba(120,108,92,0.3)',
                boxShadow: item.inPossession ? '0 0 12px rgba(200,164,74,0.15)' : 'none',
                transition: 'all 0.2s',
                position: 'relative',
                '&:hover .relic-actions': { opacity: 1 },
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: '"Cinzel", serif',
                      fontSize: '0.85rem',
                      color: item.inPossession ? '#c8a44a' : '#786c5c',
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                    {(onEdit || onDelete) && (
                      <Box
                        className="relic-actions"
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', opacity: 0, transition: 'opacity 0.15s' }}
                      >
                        {onEdit && (
                          <IconButton size="small" onClick={() => onEdit(item)}
                            sx={{ p: 0.25, color: '#786c5c', '&:hover': { color: '#c8a44a' } }}>
                            <EditIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        )}
                        {onDelete && (
                          <IconButton size="small" onClick={() => onDelete(item)}
                            sx={{ p: 0.25, color: '#786c5c', '&:hover': { color: '#b84848' } }}>
                            <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                          </IconButton>
                        )}
                      </Box>
                    )}
                    {item.inPossession ? (
                      <AutoAwesomeIcon sx={{ fontSize: 16, color: '#c8a44a', flexShrink: 0, ml: 0.25 }} />
                    ) : (
                      <LockOpenIcon sx={{ fontSize: 16, color: '#786c5c', flexShrink: 0, ml: 0.25 }} />
                    )}
                  </Box>
                </Box>
                {item.description && (
                  <Typography variant="caption" sx={{ color: '#b4a48a', fontSize: '0.75rem', display: 'block' }}>
                    {item.description.length > 100 ? item.description.slice(0, 97) + '…' : item.description}
                  </Typography>
                )}
                {item.locationFound && !item.inPossession && (
                  <Typography variant="caption" sx={{ color: '#786c5c', fontSize: '0.68rem', display: 'block', mt: 0.25 }}>
                    Found: {item.locationFound}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Tooltip>
        </Grid2>
      ))}
    </Grid2>
  )
}
