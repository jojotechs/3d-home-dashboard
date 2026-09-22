import {useEffect, useRef, useState} from 'react';
import {appClient, finishPassword, signOut} from './client';
import type {AccessGate} from './useAccessGate';

// Invitation and password onboarding live beside the app gate, never in a feature panel.
export function AccountFlow({access}: {access: AccessGate}) {
  const [invite, setInvite] = useState(() => new URLSearchParams(location.search).get('invite'));
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const {auth} = access;
  const open = !!auth.flow || !!auth.linkError || !!invite;
  useEffect(() => {
    if (open && !access.dialog && !dialog.current?.open) dialog.current?.showModal();
    if (!open || access.dialog) dialog.current?.close();
  }, [open,access.dialog,auth.status]);
  const removeInvite = () => {
    const url=new URL(location.href); url.searchParams.delete('invite');
    history.replaceState(null,'',url.pathname+url.search); setInvite(null);
  };
  const needsPassword = !!auth.flow && !!auth.session && !auth.linkError;
  return <dialog ref={dialog} className="access-dialog" aria-labelledby="account-flow-title" onCancel={e=>e.preventDefault()}>
    {open && <div className="access-card">
      <span className="access-eyebrow">家庭小城 · 账号</span>
      <h2 id="account-flow-title">{needsPassword ? '设置你的密码' : auth.linkError ? '邮件链接已失效' : invite ? '加入家庭小城' : '正在验证邮件链接'}</h2>
      <p>{needsPassword ? `为 ${auth.session?.user.email} 设置至少 12 位密码。` : auth.linkError ? '链接可能已经使用或过期。邀请请联系管理员重新发送；找回密码可以重新申请。' : invite ? '请使用收到邀请的邮箱登录，然后确认加入家庭。' : '稍等一下，正在确认你的账号。'}</p>
      {needsPassword ? <form className="access-form" onSubmit={async e=>{
        e.preventDefault(); if(busy || !appClient) return;
        if(password!==confirmation){setMessage('两次输入的密码不一致。');return;}
        setBusy(true);setMessage('');
        try {const {error}=await appClient.auth.updateUser({password});if(error) throw error;
          setPassword('');setConfirmation('');finishPassword();access.retry();
        }catch{setMessage('密码暂未更新，请检查连接后重试。');}finally{setBusy(false);}
      }}>
        <label>新密码<input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label>确认新密码<input type="password" autoComplete="new-password" minLength={12} required disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
        <button className="primary access-action" disabled={busy}>{busy?'正在保存…':'保存密码'}</button>
      </form> : invite && !auth.linkError && auth.status==='signedIn' ? <>
        <p>当前邮箱：{auth.session?.user.email}</p>
        <button className="primary access-action" disabled={busy} onClick={async()=>{
          if(!appClient || busy)return;setBusy(true);setMessage('');
          try {
            const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(invite));
            const hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
            const {error}=await appClient.rpc('accept_household_invite',{p_hash:hash});
            if(error) throw error;
            removeInvite();access.retry();
          }catch(error){setMessage((error as {message?:string}).message || '暂未加入，请检查连接后重试。');}finally{setBusy(false);}
        }}>{busy?'正在加入…':'接受邀请，加入家庭'}</button>
        <button className="access-action" disabled={busy} onClick={()=>{void signOut();}}>使用其他邮箱</button>
      </> : !auth.flow && !auth.linkError && invite ? <button className="primary access-action" onClick={()=>{dialog.current?.close();access.login();}}>登录受邀邮箱</button> : null}
      {message && <p className="access-error" role="alert">{message}</p>}
      <button className="access-action" disabled={busy} onClick={()=>{removeInvite();finishPassword();access.dismiss();}}>稍后再说</button>
    </div>}
  </dialog>;
}
