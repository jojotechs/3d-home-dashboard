import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const projectUrl = env('SUPABASE_URL'),
  adminKey = env('SUPABASE_SERVICE_ROLE_KEY');
const appUrl = env('APP_URL').replace(/\/$/, ''),
  resendKey = env('RESEND_API_KEY'),
  from = env('MAIL_FROM');
const allowed = new Set([
  appUrl,
  ...(Deno.env.get('EXTRA_ORIGINS') || '').split(',').filter(Boolean),
]);
const admin = createClient(projectUrl, adminKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const encoder = new TextEncoder();
const hex = (data: ArrayBuffer) =>
  [...new Uint8Array(data)].map((b) => b.toString(16).padStart(2, '0')).join('');
Deno.serve(async (request) => {
  const origin = request.headers.get('origin') || '';
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    ...(allowed.has(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
        }
      : {}),
  };
  const reply = (status: number, value: unknown) =>
    new Response(JSON.stringify(value), { status, headers });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST' || (origin && !allowed.has(origin)))
    return reply(403, { error: '请求来源不被允许' });
  let lease: string | undefined, invitation: string | undefined;
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: '请先登录' });
    const caller = createClient(projectUrl, env('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user },
      error: authError,
    } = await caller.auth.getUser();
    if (authError || !user) return reply(401, { error: '登录已过期' });
    const raw = await request.text();
    if (raw.length > 4096) return reply(413, { error: '请求内容过大' });
    const { email, memberId, requestId } = JSON.parse(raw);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(requestId) ||
      !uuid.test(memberId) ||
      typeof email !== 'string' ||
      email.length > 254
    )
      return reply(400, { error: '邀请信息不完整' });
    const mail = email.trim().toLowerCase();
    // A retry derives the same high-entropy token without storing it in client or public tables.
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(adminKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const token = hex(
      await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(`${user.id}:${requestId}:${mail}:${memberId}`),
      ),
    );
    const hash = hex(await crypto.subtle.digest('SHA-256', encoder.encode(token)));
    const { data: id, error: issueError } = await caller.rpc('issue_household_invite', {
      p_email: mail,
      p_member: memberId,
      p_hash: hash,
      p_request: requestId,
    });
    if (issueError)
      return reply(issueError.code === '42501' ? 403 : 409, { error: issueError.message });
    invitation = id;
    const { data: delivery, error: claimError } = await admin.rpc('claim_household_delivery', {
      p_invite: id,
    });
    if (claimError) return reply(409, { error: claimError.message });
    if (delivery.delivered) return reply(200, { sent: true });
    lease = delivery.lease;
    let href = delivery.href as string | null;
    if (!href) {
      const householdLink = `${appUrl}/?invite=${token}`;
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email: mail,
        options: { redirectTo: householdLink + '&setup=1' },
      });
      if (error) {
        if (error.code !== 'email_exists' && error.code !== 'user_already_exists')
          throw new Error('无法创建账号邀请');
        href = householdLink;
      } else href = data.properties.action_link;
      const { error: storeError } = await admin.rpc('store_household_delivery', {
        p_invite: id,
        p_lease: lease,
        p_href: href,
      });
      if (storeError) throw storeError;
    }
    const escape = (s: string) =>
      s.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
      );
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `family-city-invite-${id}`,
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        from,
        to: [mail],
        subject: '家庭小城 · 家人邀请',
        text: `你收到了一份家庭小城邀请。请用这个邮箱登录并接受邀请：\n${href}\n\n家庭邀请有效期 7 天。首次账号确认链接可能更早过期，届时请联系发起人重新邀请。`,
        html: `<div style="font-family:system-ui;line-height:1.8;color:#345441"><h1>欢迎来到家庭小城。</h1><p>你收到了一份家庭小城邀请。</p><p><a href="${escape(href!)}">打开家庭小城，接受邀请</a></p><p>请使用收到这封邮件的邮箱登录。家庭邀请有效期 7 天；首次账号确认链接过期时，请联系发起人重新邀请。</p></div>`,
      }),
    });
    if (!response.ok) throw new Error('邮件服务暂不可用');
    const { error: completeError } = await admin.rpc('complete_household_delivery', {
      p_invite: id,
      p_lease: lease,
    });
    if (completeError) throw completeError;
    return reply(200, { sent: true });
  } catch {
    if (invitation && lease)
      await admin.rpc('release_household_delivery', { p_invite: invitation, p_lease: lease });
    return reply(503, { error: '邀请邮件暂未发送，请稍后重试；不会重复添加家庭成员。' });
  }
});
