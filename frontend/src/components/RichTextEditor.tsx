import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Box, IconButton, Tooltip } from '@mui/material'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichTextEditor({ value, onChange, placeholder = 'Write something…', minHeight = 80 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      const html = editor.getHTML()
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px; outline:none; padding:8px 12px; font-size:0.83rem; color:#c8b89a; line-height:1.6; font-family:inherit`,
      },
    },
  })

  // Sync external value resets (e.g. form open/close)
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || '<p></p>'
    if (current !== incoming) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  const btn = (active: boolean) => ({
    color: active ? '#c8a44a' : '#786c5c',
    '&:hover': { color: '#c8a44a', bgcolor: 'transparent' },
    p: 0.4,
    borderRadius: 0.5,
  })

  return (
    <Box sx={{
      border: '1px solid rgba(120,108,92,0.35)',
      borderRadius: 1,
      bgcolor: '#0e0c09',
      '&:focus-within': { borderColor: 'rgba(200,164,74,0.5)' },
      '.tiptap p.is-editor-empty:first-child::before': {
        content: 'attr(data-placeholder)',
        color: 'rgba(120,108,92,0.5)',
        pointerEvents: 'none',
        float: 'left',
        height: 0,
      },
      '.tiptap': { outline: 'none' },
      '.tiptap ul, .tiptap ol': { pl: 2.5 },
      '.tiptap li': { mb: 0.25 },
      '.tiptap strong': { color: '#e6d8c0' },
      '.tiptap h1, .tiptap h2, .tiptap h3': { color: '#e6d8c0', my: 0.5 },
    }}>
      {/* Toolbar */}
      <Box sx={{
        display: 'flex', gap: 0.25, px: 0.75, py: 0.4,
        borderBottom: '1px solid rgba(120,108,92,0.2)',
      }}>
        <Tooltip title="Bold">
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}
            sx={btn(editor.isActive('bold'))}>
            <FormatBoldIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Italic">
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}
            sx={btn(editor.isActive('italic'))}>
            <FormatItalicIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ width: '1px', bgcolor: 'rgba(120,108,92,0.25)', mx: 0.25 }} />
        <Tooltip title="Bullet list">
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}
            sx={btn(editor.isActive('bulletList'))}>
            <FormatListBulletedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Numbered list">
          <IconButton size="small" onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run() }}
            sx={btn(editor.isActive('orderedList'))}>
            <FormatListNumberedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <EditorContent editor={editor} />
    </Box>
  )
}
