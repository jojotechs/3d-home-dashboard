import {useEffect, useRef, useState} from 'react';
import {HouseLine, LockKey, X} from '@phosphor-icons/react';
import {appClient, signIn} from './client';
import type {AccessGate} from './useAccessGate';
import './auth.css';

export function AccessDialog({access}: {access: AccessGate}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isOpen = !!access.dialog;
  useEffect(() => {
    const dialog = ref.current;
    if (isOpen && !dialog?.open) dialog?.showModal();
    if (!isOpen && dialog?.open) dialog.close();
    if (isOpen) (dialog?.querySelector<HTMLInputElement>('input:not(:disabled)') || dialog?.querySelector<HTMLButtonElement>('.access-action') || dialog?.querySelector<HTMLButtonElement>('button'))?.focus();
  }, [access.dialog]);
  const login = access.dialog === 'login';
  const title = login ? '登录家庭小城' : access.dialog === 'denied' ? '暂时无法进入' : access.dialog === 'error' ? '暂时无法连接' : '正在确认访问权限';
  return <dialog ref={ref} className="access-dialog" aria-labelledby="access-title" aria-describedby="access-description"
    onCancel={event => {event.preventDefault(); access.dismiss();}}
    onClick={event => {if (event.target === event.currentTarget) access.dismiss();}}>
    {isOpen && <div className="access-card">
      <button className="access-close" aria-label="关闭账号弹窗" onClick={access.dismiss}><X size={20}/></button>
      <span className="access-symbol">{login ? <HouseLine size={29} weight="duotone"/> : <LockKey size={29} weight="duotone"/>}</span>
      <span className="access-eyebrow">家庭小城</span>
      <h2 id="access-title">{title}</h2>
      <p id="access-description">{login ? access.destination ? `登录后继续查看${access.destination}。` : '登录后，和家人一起照顾小城。'
        : access.dialog === 'denied' ? access.profile?.household_id ? `你还没有「${access.destination}」的访问权限，请联系家庭管理员开通。` : '账号尚未加入家庭，请联系家庭管理员。'
        : access.dialog === 'error' ? '未能确认账号权限，请检查连接后重试。' : '稍等一下，马上为你打开。'}</p>
      {login ? <LoginForm locked={access.auth.status === 'signingIn' || access.auth.status === 'signingOut'}/> : access.dialog === 'checking' ? <div className="access-loading" role="status">正在连接家庭账号…</div>
        : <button className="primary access-action" onClick={access.dialog === 'error' ? access.retry : access.dismiss}>{access.dialog === 'error' ? '重试' : '知道了'}</button>}
    </div>}
  </dialog>;
}

function LoginForm({locked}: {locked: boolean}) {
  const [recover, setRecover] = useState(false);
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const alive = useRef(true);
  useEffect(() => {alive.current = true; return () => {alive.current = false;};}, []);
  return <form className="access-form" onSubmit={async event => {
    event.preventDefault(); if (busy || locked) return;
    setBusy(true); setError('');
    try {
      if (recover) {
        const {error} = await appClient!.auth.resetPasswordForEmail(email.trim(), {redirectTo: location.origin+'/?recovery=1'});
        if (error) throw error;
        if (alive.current) setNotice('如果这个邮箱已有账号，我们会发送找回密码邮件。');
        return;
      }
      const result = await signIn(email.trim(), password);
      if (alive.current && !result.cancelled) {
        if (result.error) setError('登录失败，请检查邮箱、密码和网络连接。');
        else setPassword('');
      }
    } catch {if (alive.current) setError('暂时无法登录，请检查网络后重试。');}
    finally {if (alive.current) setBusy(false);}
  }}>
    <label>邮箱<input autoFocus type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required disabled={busy || locked} placeholder="你的邮箱"/></label>
    {!recover && <label>密码<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={busy || locked} placeholder="输入密码"/></label>}
    {error && <p className="access-error" role="alert">{error}</p>}
    <button className="primary access-action" disabled={busy || locked}>{busy || locked ? '正在连接…' : recover ? '发送找回邮件' : '登录'}</button>
    {notice && <p role="status">{notice}</p>}
    <button type="button" disabled={busy || locked} onClick={()=>{setRecover(value=>!value);setError('');setNotice('');setPassword('');}}>{recover?'返回登录':'忘记密码？'}</button>
    <small>使用家庭管理员已开通的账号</small>
  </form>;
}
