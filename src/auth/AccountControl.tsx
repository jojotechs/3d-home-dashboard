import {useEffect, useRef, useState} from 'react';
import {CaretDown, UserCircle, SignOut, ArrowCounterClockwise, ArrowUpRight} from '@phosphor-icons/react';
import type {AccessGate} from './useAccessGate';
import './auth.css';

export function AccountControl({access, onReset, onHousehold}: {access: AccessGate; onReset: () => void; onHousehold: () => void}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const signedIn = access.auth.status === 'signedIn';
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {if (!root.current?.contains(event.target as Node)) setOpen(false);};
    const escape = (event: KeyboardEvent) => {if (event.key === 'Escape') {setOpen(false); event.stopPropagation();}};
    document.addEventListener('pointerdown', closeOutside);
    root.current?.addEventListener('keydown', escape);
    const element = root.current;
    return () => {document.removeEventListener('pointerdown', closeOutside); element?.removeEventListener('keydown', escape);};
  }, [open]);
  useEffect(() => {setOpen(false);}, [access.auth.status]);
  return <div className="account-control" ref={root}>
    <button className="account-button" aria-label={signedIn ? '账号与家庭' : '登录家庭小城'} aria-expanded={signedIn ? open : undefined}
      disabled={access.auth.status === 'checking' || access.auth.status === 'signingOut' || access.auth.status === 'signingIn'}
      onClick={() => signedIn ? setOpen(value => !value) : access.login()}>
      {signedIn ? <span className="account-avatar">{access.profile?.display_name?.slice(0, 1) || <UserCircle size={23}/>}</span> : <UserCircle size={27} weight="duotone"/>}
      <span className="account-label"><strong>{signedIn ? access.profile?.display_name || '我的账号' : access.auth.status === 'signingOut' ? '正在退出…' : access.auth.status === 'checking' || access.auth.status === 'signingIn' ? '正在连接…' : '登录'}</strong>
        {signedIn && <small>{access.profile?.household_name || '家庭账号'}</small>}</span>
      {signedIn && <CaretDown size={13} className="account-caret"/>}
    </button>
    {open && signedIn && <div className="account-popover" aria-label="账号信息">
      <div className="account-identity"><strong>{access.profile?.display_name || '我的账号'}</strong><span>{access.auth.session?.user.email}</span><small>{access.profile ? access.profile.household_name || '尚未加入家庭' : '家庭信息暂不可用'}{access.profile?.is_admin ? ' · 管理员' : ''}</small></div>
      {!access.profile && <button onClick={access.retry}>重新读取账号信息</button>}
      {access.profile?.is_admin && <button onClick={()=>{setOpen(false);onHousehold();}}>管理家庭成员</button>}
      <button onClick={() => {setOpen(false); access.logout();}}><SignOut size={18}/>退出登录</button>
      <div className="account-demo"><small>生活区示例</small><p>生活区使用本机示例，财务记录保存在云端。</p>
        <button onClick={() => {setOpen(false); onReset();}}><ArrowCounterClockwise size={16}/>恢复生活区示例</button>
        <a href="/models/family-city.glb" download>下载城市模型<ArrowUpRight size={15}/></a>
      </div>
    </div>}
  </div>;
}
