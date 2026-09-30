import {useCallback, useEffect, useRef, useState} from 'react';
import type {AccessGate} from '../auth/useAccessGate';
import {appClient, isAccessError} from '../auth/client';
import type {FinanceBook} from './client';
import {financeGrowth, financeProjection} from './growth.mjs';

/** Authorized saved data only; no finance state is read from or written to localStorage. */
export function useFinanceProjection(access: AccessGate) {
  const owner = access.canOpen('finance') ? access.profile!.user_id : null;
  const activeOwner = useRef(owner); activeOwner.current = owner;
  const [saved, setSaved] = useState<{owner: string; book: FinanceBook} | null>(null);
  const [preview, setPreview] = useState<{owner: string; level: number} | null>(null);
  const accept = useCallback((book: FinanceBook) => {
    if (!owner || activeOwner.current !== owner) return;
    setSaved(previous => previous?.owner === owner && BigInt(previous.book.current.version) > BigInt(book.current.version) ? previous : {owner, book});
  }, [owner]);
  useEffect(() => {
    let cancelled = false;
    if (!owner) {setSaved(null); setPreview(null); return;}
    void appClient?.rpc('get_finance_book').then(({data,error}) => {
      if (cancelled || activeOwner.current !== owner) return;
      if (!error) accept(data as FinanceBook);
      else if (isAccessError(error)) setSaved(null);
    });
    return () => {cancelled = true;};
  }, [owner, access.profile, accept]);
  const book = owner && saved?.owner === owner ? saved.book : null;
  const previewLevel=book && preview?.owner===owner ? preview.level : null;
  const previewAt=useCallback((level: number | null)=>{
    setPreview(owner && level!==null ? {owner,level} : null);
  },[owner]);
  return {accept, book, previewLevel, previewAt,
    projection:book ? financeProjection(financeGrowth(book.current.net_savings_minor,book.history),previewLevel) : null};
}
