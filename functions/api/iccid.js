// AES-128-CBC 加密（Web Crypto API 自带 PKCS7 padding）
async function aesEncrypt(text, keyStr) {
  const keyBytes = new TextEncoder().encode(keyStr);
  const ivBytes = new TextEncoder().encode(keyStr);
  const dataBytes = new TextEncoder().encode(text);

  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'AES-CBC' }, false, ['encrypt']
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: ivBytes }, key, dataBytes
  );
  const bytes = new Uint8Array(encrypted);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function onRequestPost(context) {
  try {
    const { userId, mobile } = await context.request.json();

    if (!userId || !mobile) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // AES 加密身份证号
    const encryptedUserId = await aesEncrypt(userId, 'asiainfoIIS20182');

    // 调用贵州移动 ICCID 查询接口
    const params = new URLSearchParams();
    params.append('userId', encryptedUserId);
    params.append('mobile', mobile);

    const response = await fetch('https://wap.gz.10086.cn/smphone/gzshop/shop/#/order/order-search/index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://wap.gz.10086.cn/smphone/gzshop/shop/'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.returnCode === '0' || data.code === '0' || data.code === 0) {
      const iccid = data.iccid || data.data?.iccid || (data.data && data.data.iccid);
      return new Response(JSON.stringify({
        iccid: iccid || null,
        msg: data.returnMessage || data.msg || '查询成功',
        raw: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        iccid: null,
        msg: data.returnMessage || data.msg || '查询失败',
        raw: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || '服务器内部错误' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
