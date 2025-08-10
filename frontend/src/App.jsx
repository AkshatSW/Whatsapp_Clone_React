
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const socket = io(API);

function formatTime(ts){
  try { return new Date(ts*1000).toLocaleString(); } catch(e){ return ''; }
}

export default function App(){
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const me = import.meta.env.VITE_OUR_NUMBER || '918329446654';
  const msgAreaRef = useRef();

  useEffect(()=> { fetchConvs(); }, []);

  useEffect(()=> {
    socket.on('new_message', (m) => {
      if(m.wa_id === active) setMessages(prev => [...prev, m]);
      fetchConvs();
    });
    socket.on('webhook_processed', ()=> fetchConvs());
    return ()=> { socket.off('new_message'); socket.off('webhook_processed'); };
  }, [active]);

  async function fetchConvs(){
    try {
      const res = await axios.get(API + '/conversations');
      setConvs(res.data);
    } catch(e){ console.error(e); }
  }
  async function openConv(wa){
    setActive(wa);
    try {
      const res = await axios.get(API + '/conversations/' + wa + '/messages');
      setMessages(res.data || []);
      setTimeout(()=> msgAreaRef.current && (msgAreaRef.current.scrollTop = msgAreaRef.current.scrollHeight), 100);
    } catch(e){ console.error(e); }
  }
  async function send(){
    if(!text.trim()) return;
    const body = text.trim();
    setText('');
    const localMsg = { wa_id: active, body, from: me, msg_id: 'local-'+Date.now(), timestamp: Math.floor(Date.now()/1000), status: 'sent', payload_type: 'local_outgoing' };
    setMessages(prev => [...prev, localMsg]);
    try {
      await axios.post(API + '/conversations/' + active + '/send', { body, from: me });
    } catch(e){ console.error(e); }
  }

  return (
    <div className="app">
      <div className="left">
        <div className="header"><strong>WhatsApp Clone</strong></div>
        {convs.map(c => (
          <div key={c._id} className="chat-list-item" onClick={()=> openConv(c._id)}>
            <div style={{width:40, height:40, borderRadius:20, background:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>{(c.contact_name||c._id||'U').substr(0,1)}</div>
            <div style={{flex:1}}>
              <div><strong>{c.contact_name || c._id}</strong></div>
              <div className="small">{c.last_body}</div>
            </div>
            <div className="small">{c.last_timestamp ? new Date(c.last_timestamp*1000).toLocaleTimeString() : ''}</div>
          </div>
        ))}
      </div>
      <div className="right">
        <div className="header">{active ? (convs.find(x=>x._id===active)?.contact_name || active) : 'Select a chat'}</div>
        <div className="message-area" ref={msgAreaRef}>
          {messages.map(m => (
            <div key={m.msg_id} className={"msg " + ((m.from === me || m.payload_type === 'local_outgoing') ? 'me' : 'other')}>
              <div>{m.body}</div>
              <div className="small" style={{marginTop:6}}>{formatTime(m.timestamp)} {m.from === me || m.payload_type==='local_outgoing' ? <span> • {m.status}</span> : null}</div>
            </div>
          ))}
        </div>
        {active &&
        <div className="sendbox">
          <textarea rows="2" value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message"></textarea>
          <button onClick={send}>Send</button>
        </div>}
      </div>
    </div>
  )
}
