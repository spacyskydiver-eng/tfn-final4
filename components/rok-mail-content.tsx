'use client'

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Bold,
  Italic,
  Palette,
  Copy,
  Trash2,
  Mail,
  FileText,
  Sword,
  Shield,
  Users,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const MAX_CHARS = 2000
const WARN_CHARS = 1800

const PRESET_COLORS = [
  { label: 'Red',    hex: '#ff4444' },
  { label: 'Orange', hex: '#ff8800' },
  { label: 'Yellow', hex: '#ffdd00' },
  { label: 'Green',  hex: '#44cc44' },
  { label: 'Blue',   hex: '#4488ff' },
  { label: 'Purple', hex: '#aa44ff' },
  { label: 'White',  hex: '#ffffff' },
  { label: 'Gold',   hex: '#ffd700' },
]

const TEMPLATES = [
  {
    label: 'Alliance Recruitment',
    icon: Users,
    text:
      '[b][color=#ffd700]⚔ JOIN [ALLIANCE] TODAY ⚔[/color][/b]\n\n' +
      'We are actively recruiting [b]dedicated governors[/b] to strengthen our ranks!\n\n' +
      '[color=#44cc44][b]Requirements:[/b][/color]\n' +
      '• City Hall [b]25+[/b]\n' +
      '• Active daily players\n' +
      '• Teamwork & communication\n\n' +
      '[color=#ff8800]Reply to this mail or message our R4/R5 to apply.[/color]\n\n' +
      '[i]Together we conquer![/i]',
  },
  {
    label: 'War Declaration',
    icon: Sword,
    text:
      '[b][color=#ff4444]⚠ DECLARATION OF WAR ⚠[/color][/b]\n\n' +
      '[color=#ffdd00][b][ALLIANCE][/b][/color] hereby declares war on [b][TARGET][/b].\n\n' +
      '[color=#ff8800]Effective immediately:[/color]\n' +
      '• All members are to remain [b]shielded[/b] or [b]on alert[/b]\n' +
      '• Troops [b]must not[/b] be left outside unprotected\n' +
      '• Rally on command when signalled\n\n' +
      '[i]Prepare your armies. Victory is ours.[/i]',
  },
  {
    label: 'Peace Treaty',
    icon: Shield,
    text:
      '[b][color=#44cc44]🕊 PEACE PROPOSAL[/color][/b]\n\n' +
      'Greetings, esteemed Governor.\n\n' +
      'In the interest of mutual prosperity, [b][ALLIANCE][/b] wishes to propose a [color=#44cc44][b]non-aggression pact[/b][/color] with your alliance.\n\n' +
      '[color=#4488ff]Proposed terms:[/color]\n' +
      '• No attacks on member cities\n' +
      '• No burning of alliance flags\n' +
      '• Duration: [b]30 days[/b], renewable\n\n' +
      'Please reply with your decision.\n\n' +
      '[i]May our kingdoms flourish in peace.[/i]',
  },
  {
    label: 'Rally Call',
    icon: Mail,
    text:
      '[b][color=#ff4444]🚨 RALLY ALERT — ALL HANDS 🚨[/color][/b]\n\n' +
      '[color=#ffdd00][b]TARGET:[/b][/color] [INSERT TARGET]\n' +
      '[color=#ffdd00][b]TIME:[/b][/color] [INSERT TIME]\n' +
      '[color=#ffdd00][b]RALLY LEADER:[/b][/color] [INSERT NAME]\n\n' +
      '[color=#ff8800]All members with [b]T4/T5 troops[/b] please join immediately![/color]\n\n' +
      'Bring your [b]strongest march[/b]. Buffs active.\n\n' +
      '[i]Do not miss this — attendance is mandatory.[/i]',
  },
]

/* ------------------------------------------------------------------ */
/*  Preview parser                                                      */
/* ------------------------------------------------------------------ */

type ParsedNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: ParsedNode[] }
  | { type: 'italic'; children: ParsedNode[] }
  | { type: 'color'; hex: string; children: ParsedNode[] }

function parseMarkup(input: string): ParsedNode[] {
  const tagRe = /\[(\/?(?:b|i|color(?:=#[0-9a-fA-F]{3,8})?))\]/g

  interface StackFrame {
    tag: string
    hex?: string
    children: ParsedNode[]
  }

  const root: ParsedNode[] = []
  const stack: StackFrame[] = [{ tag: 'root', children: root }]

  let lastIndex = 0
  let match: RegExpExecArray | null

  const pushText = (text: string) => {
    if (!text) return
    stack[stack.length - 1].children.push({ type: 'text', value: text })
  }

  while ((match = tagRe.exec(input)) !== null) {
    pushText(input.slice(lastIndex, match.index))
    lastIndex = tagRe.lastIndex

    const raw = match[1]

    if (raw.startsWith('/')) {
      // closing tag
      if (stack.length > 1) {
        const frame = stack.pop()!
        const parent = stack[stack.length - 1]
        let node: ParsedNode
        if (frame.tag === 'b') node = { type: 'bold', children: frame.children }
        else if (frame.tag === 'i') node = { type: 'italic', children: frame.children }
        else node = { type: 'color', hex: frame.hex ?? '#ffffff', children: frame.children }
        parent.children.push(node)
      }
    } else if (raw === 'b') {
      stack.push({ tag: 'b', children: [] })
    } else if (raw === 'i') {
      stack.push({ tag: 'i', children: [] })
    } else if (raw.startsWith('color=')) {
      const hex = raw.slice(6)
      stack.push({ tag: 'color', hex, children: [] })
    }
  }

  pushText(input.slice(lastIndex))

  // unclosed tags — flush them back to root
  while (stack.length > 1) {
    const frame = stack.pop()!
    const parent = stack[stack.length - 1]
    parent.children.push(...frame.children)
  }

  return root
}

function renderNodes(nodes: ParsedNode[], key: string = ''): React.ReactNode {
  return nodes.map((node, i) => {
    const k = `${key}-${i}`
    if (node.type === 'text') return <span key={k}>{node.value}</span>
    if (node.type === 'bold')
      return <strong key={k} className="font-bold">{renderNodes(node.children, k)}</strong>
    if (node.type === 'italic')
      return <em key={k} className="italic">{renderNodes(node.children, k)}</em>
    if (node.type === 'color')
      return (
        <span key={k} style={{ color: node.hex }}>
          {renderNodes(node.children, k)}
        </span>
      )
    return null
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function RokMailContent() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = text.length
  const counterColor =
    charCount >= MAX_CHARS
      ? 'text-red-400'
      : charCount >= WARN_CHARS
      ? 'text-yellow-400'
      : 'text-muted-foreground'

  /* ---- helpers ---- */
  const insertAtCursor = useCallback((before: string, after: string = '') => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end)
    const replacement = before + selected + after
    const next = text.slice(0, start) + replacement + text.slice(end)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      const cursor = start + before.length + selected.length + after.length
      el.setSelectionRange(cursor, cursor)
    })
  }, [text])

  const insertRaw = useCallback((raw: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const next = text.slice(0, start) + raw + text.slice(start)
    setText(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + raw.length, start + raw.length)
    })
  }, [text])

  const handleBold = () => insertAtCursor('[b]', '[/b]')
  const handleItalic = () => insertAtCursor('[i]', '[/i]')
  const handleColor = (hex: string) => insertAtCursor(`[color=${hex}]`, '[/color]')
  const handleTemplate = (tmpl: typeof TEMPLATES[number]) => {
    setText(tmpl.text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const parsed = parseMarkup(text)

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          In-Game Mail Formatter
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compose styled in-game mails with bold, italic and colour markup.
        </p>
      </div>

      {/* Templates */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((tmpl) => {
              const Icon = tmpl.icon
              return (
                <Button
                  key={tmpl.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplate(tmpl)}
                  className="border-border hover:border-primary hover:text-primary gap-1.5"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tmpl.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor panel */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBold}
                className="border-border hover:border-primary hover:text-primary font-bold"
                title="Bold"
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleItalic}
                className="border-border hover:border-primary hover:text-primary italic"
                title="Italic"
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>

              <div className="h-5 w-px bg-border mx-1" />

              {/* Color swatches */}
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    title={`${c.label} (${c.hex})`}
                    onClick={() => handleColor(c.hex)}
                    className="h-5 w-5 rounded-sm border border-border/60 hover:scale-125 transition-transform focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Textarea */}
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your mail here, or choose a template above…"
              className="min-h-[280px] font-mono text-sm resize-y bg-background border-border focus-visible:ring-primary"
              maxLength={MAX_CHARS}
            />

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <span className={`text-xs tabular-nums ${counterColor}`}>
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                {charCount >= WARN_CHARS && charCount < MAX_CHARS && (
                  <span className="ml-1 text-yellow-400">— approaching limit</span>
                )}
                {charCount >= MAX_CHARS && (
                  <span className="ml-1 text-red-400">— limit reached</span>
                )}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setText('')}
                  className="border-border hover:border-red-500 hover:text-red-400 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className="bg-primary/90 hover:bg-primary text-primary-foreground gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            {/* Tip */}
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md px-3 py-2">
              <span className="text-primary font-medium">Tip:</span> Use{' '}
              <code className="text-xs bg-background px-1 rounded">[b]</code> for bold,{' '}
              <code className="text-xs bg-background px-1 rounded">[i]</code> for italic,{' '}
              <code className="text-xs bg-background px-1 rounded">[color=#ff0000]text[/color]</code>{' '}
              for colours.
            </p>
          </CardContent>
        </Card>

        {/* Preview panel */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="min-h-[280px] rounded-md border border-border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={{ fontFamily: 'inherit' }}
            >
              {text.length === 0 ? (
                <span className="text-muted-foreground italic">
                  Preview will appear here as you type…
                </span>
              ) : (
                renderNodes(parsed)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
