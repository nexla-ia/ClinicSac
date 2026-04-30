import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  Headset, Search, Filter, RefreshCw, Building2, MessageCircle,
  CheckCircle2, Lock, Unlock, ChevronRight,
} from 'lucide-react'
import { TicketChat } from '../../components/SupportWidget'
import './AdmSupport.css'

const STATUS_LABELS = {
  open:     { label: 'Aguardando',  color: '#D97706', bg: '#FEF3C7' },
  answered: { label: 'Respondido',  color: '#2563EB', bg: '#DBEAFE' },
  closed:   { label: 'Encerrado',   color: '#16A34A', bg: '#D1FAE5' },
}

function timeAgo(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return new Date(ts).toLocaleDateString('pt-BR')
}

export default function AdmSupport() {
  const { db, session } = useAuth()
  const [tickets, setTickets] = useState([])
  const [unreadByTicket, setUnreadByTicket] = useState({})
  const [activeId, setActiveId] = useState(null)
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadTickets() {
    setLoading(true)
    const { data } = await supabase.from('support_tickets')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(200)
    setTickets(data || [])

    // Conta não lidas por ticket (mensagens da empresa não lidas pelo ADM)
    const ids = (data || []).map(t => t.id)
    if (ids.length) {
      const { data: msgs } = await supabase.from('support_messages')
        .select('ticket_id')
        .in('ticket_id', ids)
        .eq('sender_type', 'company')
        .eq('read_by_adm', false)
      const map = {}
      ;(msgs || []).forEach(m => { map[m.ticket_id] = (map[m.ticket_id] || 0) + 1 })
      setUnreadByTicket(map)
    } else {
      setUnreadByTicket({})
    }
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [])

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('adm-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => loadTickets())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  const companies = db.companies || []
  const companyById = useMemo(() => {
    const m = {}
    companies.forEach(c => { m[c.id] = c })
    return m
  }, [companies])

  const filtered = useMemo(() => {
    let list = tickets
    if (filter !== 'all') list = list.filter(t => t.status === filter)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(t => {
        const cName = companyById[t.company_id]?.name || ''
        return t.subject.toLowerCase().includes(s) || cName.toLowerCase().includes(s)
      })
    }
    return list
  }, [tickets, filter, search, companyById])

  const stats = useMemo(() => ({
    open:     tickets.filter(t => t.status === 'open').length,
    answered: tickets.filter(t => t.status === 'answered').length,
    closed:   tickets.filter(t => t.status === 'closed').length,
    total:    tickets.length,
  }), [tickets])

  const active = tickets.find(t => t.id === activeId)
  const activeCompany = active ? companyById[active.company_id] : null

  async function setStatus(status) {
    if (!active) return
    await supabase.from('support_tickets').update({ status }).eq('id', active.id)
  }

  return (
    <div className="adm-sup">
      <div className="adm-sup-head">
        <div>
          <div className="adm-sup-eyebrow"><Headset size={13} /> Suporte</div>
          <h1 className="adm-sup-title">Central de chamados</h1>
          <p className="adm-sup-sub">Conversas em tempo real com as empresas. Resposta atualiza automaticamente.</p>
        </div>
        <div className="adm-sup-stats">
          <div className="adm-sup-stat">
            <span className="adm-sup-stat-num">{stats.open}</span>
            <span className="adm-sup-stat-lbl">Aguardando</span>
          </div>
          <div className="adm-sup-stat">
            <span className="adm-sup-stat-num">{stats.answered}</span>
            <span className="adm-sup-stat-lbl">Em conversa</span>
          </div>
          <div className="adm-sup-stat">
            <span className="adm-sup-stat-num">{stats.closed}</span>
            <span className="adm-sup-stat-lbl">Fechados</span>
          </div>
          <button className="adm-sup-refresh" onClick={loadTickets} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="adm-sup-shell">
        {/* Lista */}
        <aside className="adm-sup-list">
          <div className="adm-sup-list-toolbar">
            <div className="adm-sup-search">
              <Search size={13} />
              <input placeholder="Empresa ou assunto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="adm-sup-filters">
              {[
                { k: 'open',     l: `Aguardando (${stats.open})` },
                { k: 'answered', l: `Em conversa (${stats.answered})` },
                { k: 'closed',   l: 'Fechados' },
                { k: 'all',      l: 'Todos' },
              ].map(f => (
                <button key={f.k} className={`adm-sup-filter ${filter === f.k ? 'on' : ''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
              ))}
            </div>
          </div>

          <div className="adm-sup-list-body">
            {loading ? (
              <div className="adm-sup-empty"><RefreshCw size={20} className="spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="adm-sup-empty">
                <MessageCircle size={28} />
                <p>Nenhum chamado nesse filtro.</p>
              </div>
            ) : filtered.map(t => {
              const c = companyById[t.company_id]
              const st = STATUS_LABELS[t.status] || { label: t.status, color: '#64748B', bg: '#F1F5F9' }
              const unread = unreadByTicket[t.id] || 0
              const isActive = t.id === activeId
              return (
                <button key={t.id} className={`adm-sup-ticket ${isActive ? 'active' : ''}`} onClick={() => setActiveId(t.id)}>
                  <div className="adm-sup-ticket-row1">
                    <span className="adm-sup-ticket-company">
                      <Building2 size={11} /> {c?.name || '—'}
                    </span>
                    <span className="adm-sup-ticket-time">{timeAgo(t.last_message_at)}</span>
                  </div>
                  <div className="adm-sup-ticket-subject">{t.subject}</div>
                  <div className="adm-sup-ticket-row3">
                    <span className="adm-sup-status-pill" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    {unread > 0 && <span className="adm-sup-unread">{unread} nova{unread > 1 ? 's' : ''}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Chat */}
        <main className="adm-sup-chat">
          {!active ? (
            <div className="adm-sup-empty-chat">
              <Headset size={42} />
              <h3>Selecione um chamado</h3>
              <p>Clique em qualquer chamado da lista pra responder a empresa.</p>
            </div>
          ) : (
            <>
              <div className="adm-sup-chat-head">
                <div className="adm-sup-chat-head-info">
                  <div className="adm-sup-chat-company">
                    <Building2 size={13} /> {activeCompany?.name || '—'}
                    {activeCompany?.plan && <span className="adm-sup-plan-pill">{activeCompany.plan}</span>}
                  </div>
                  <div className="adm-sup-chat-subject">{active.subject}</div>
                  <div className="adm-sup-chat-meta">
                    Aberto por <strong>{active.created_by_name || 'usuário'}</strong> · {timeAgo(active.created_at)} atrás
                  </div>
                </div>
                <div className="adm-sup-chat-actions">
                  {active.status !== 'closed' ? (
                    <button className="adm-sup-action-close" onClick={() => setStatus('closed')}>
                      <CheckCircle2 size={13} /> Marcar resolvido
                    </button>
                  ) : (
                    <button className="adm-sup-action-reopen" onClick={() => setStatus('answered')}>
                      <Unlock size={13} /> Reabrir
                    </button>
                  )}
                </div>
              </div>

              <TicketChat
                key={active.id}
                ticket={active}
                userId={session?.user?.id}
                userName={session?.user?.name || 'Suporte Nexla'}
                senderType="adm"
                onTicketUpdated={() => loadTickets()}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
