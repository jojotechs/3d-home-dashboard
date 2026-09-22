import {useEffect,useRef,useState} from 'react';
import {X} from '@phosphor-icons/react';
import {appClient} from './client';
import type {AccessGate} from './useAccessGate';

type Member={id:string;display_name:string;user_id:string|null;is_admin:boolean;finance_access:boolean;invitation:{email:string;expires_at:string;status:string}|null};
type Household={household_id:string;members:Member[]};
export function HouseholdDialog({access,onClose}: {access:AccessGate;onClose:()=>void}) {
  const [data,setData]=useState<Household|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState('');
  const ref=useRef<HTMLDialogElement>(null), alive=useRef(true), addition=useRef<{id:string;name:string}|null>(null);
  const refresh=async()=>{
    const {data,error}=await appClient!.rpc('get_household_members');
    if(error)throw error;
    if(alive.current)setData(data);
  };
  useEffect(()=>{
    alive.current=true;ref.current?.showModal();
    void refresh().catch(()=>{if(alive.current)setError('成员信息暂不可用，请重试。');});
    return()=>{alive.current=false;};
  },[]);
  async function mutate(action:()=>Promise<void>,success:string) {
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{await action();await refresh();if(alive.current)setNotice(success);access.retry();}
    catch(error){if(alive.current)setError((error as {message?:string}).message || '操作暂未完成，请稍后重试。');}
    finally{if(alive.current)setBusy(false);}
  }
  return <dialog ref={ref} className="access-dialog household-dialog" aria-labelledby="household-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <div className="access-card">
      <button className="access-close" aria-label="关闭家庭成员" onClick={onClose} disabled={busy}><X size={20}/></button>
      <span className="access-eyebrow">一起照顾小城</span><h2 id="household-title">家庭成员</h2>
      <p>成员可以没有登录账号。邀请绑定现有成员；开通财务权限后，可以查看和修改家庭共同账。</p>
      {error && <p className="access-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
      {!data ? <button className="access-action" onClick={()=>void mutate(async()=>{},'')}>重新读取成员</button> : <>
        <div className="household-members">{data.members.map(member=><MemberCard key={member.id} member={member} busy={busy} mutate={mutate}/>)}</div>
        <form className="access-form household-add" onSubmit={e=>{e.preventDefault();
          if(!addition.current || addition.current.name!==name.trim())addition.current={id:crypto.randomUUID(),name:name.trim()};
          const request=addition.current;
          void mutate(async()=>{const {error}=await appClient!.rpc('add_household_member',{p_household:data.household_id,p_member:request.id,p_name:request.name});if(error)throw error;addition.current=null;setName('');},'成员已添加，可按需发送邀请。');
        }}><label>新成员称呼<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} required disabled={busy} placeholder="如：家人、小朋友"/></label><button className="primary access-action" disabled={busy}>添加成员</button></form>
      </>}
    </div>
  </dialog>;
}
function MemberCard({member,busy,mutate}: {member:Member;busy:boolean;mutate:(action:()=>Promise<void>,success:string)=>Promise<void>}) {
  const [email,setEmail]=useState(member.invitation?.email || '');
  const pending=useRef<{email:string;id:string}|null>(null);
  return <section className="household-member" aria-label={member.display_name}>
    <div className="household-member-heading"><strong>{member.display_name}</strong><small>{member.is_admin?'管理员':member.user_id?'已绑定账号':'未绑定账号'}</small></div>
    <label className="household-grant"><input type="checkbox" checked={member.finance_access} disabled={busy} onChange={e=>{const allowed=e.target.checked;void mutate(async()=>{const {error}=await appClient!.rpc('set_finance_access',{p_member:member.id,p_allowed:allowed});if(error)throw error;},allowed?'财务权限已开通。':'财务权限已收回，后续云端读写将被拒绝。');}}/>可查看和修改家庭财务</label>
    {!member.user_id && <form className="access-form household-invite" onSubmit={e=>{e.preventDefault();
      const mail=email.trim().toLowerCase();if(!pending.current || pending.current.email!==mail)pending.current={email:mail,id:crypto.randomUUID()};
      const request=pending.current;
      void mutate(async()=>{
        const {data,error}=await appClient!.functions.invoke('invite-household',{body:{memberId:member.id,email:request.email,requestId:request.id}});
        if(error){let message='邀请邮件暂未确认发送，请保留邮箱重试。';try{const body=await error.context?.json();if(body?.error)message=body.error;}catch{}throw new Error(message);}
        if(!data?.sent)throw new Error('邀请暂未确认发送，请重试。');pending.current=null;
      },'邀请已交给邮件服务，请家人查收。新邀请会替换旧链接。');
    }}>
      <label>邀请邮箱<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>
      {member.invitation && <small>{member.invitation.status==='expired'?'上次邀请已过期':member.invitation.status==='revoked'?'上次邀请已替换':'等待接受邀请'} · 有效至 {new Date(member.invitation.expires_at).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})}</small>}
      <button disabled={busy} className="access-action">{member.invitation?'重新发送邀请':'发送邀请'}</button>
    </form>}
  </section>;
}
