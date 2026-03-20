import { Box } from '@mui/material'

interface Props {
  html: string
  fontSize?: string
  color?: string
}

export default function RichTextDisplay({ html, fontSize = '0.83rem', color = '#c8b89a' }: Props) {
  return (
    <Box
      dangerouslySetInnerHTML={{ __html: html }}
      sx={{
        fontSize,
        color,
        lineHeight: 1.65,
        '& p': { m: 0, mb: 0.5 },
        '& p:last-child': { mb: 0 },
        '& strong': { color: '#e6d8c0', fontWeight: 600 },
        '& em': { fontStyle: 'italic' },
        '& ul, & ol': { pl: 2.5, my: 0.25 },
        '& li': { mb: 0.25 },
        '& h1, & h2, & h3': { color: '#e6d8c0', fontFamily: '"Cinzel", serif', my: 0.5 },
      }}
    />
  )
}
