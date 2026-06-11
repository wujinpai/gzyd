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
    const { idCard, suitId } = await context.request.json();

    if (!idCard || !suitId) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // AES 加密身份证号
    const encryptedIdCard = await aesEncrypt(idCard, 'asiainfoIIS20182');

    // 调用贵州移动 API
    const params = new URLSearchParams();
    params.append('idCard', encryptedIdCard);
    params.append('flag', 'Card');
    params.append('IP', '');
    params.append('suitId', suitId);

    const response = await fetch('https://wap.gz.10086.cn/smphone/newSimcard/checkIdCard.do', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://wap.gz.10086.cn/smphone/newSimcard/checkNumber.do'
      },
      body: params.toString()
    });

    const data = await response.json();

    if (data.returnCode === '0') {
      return new Response(JSON.stringify({
        canApply: true,
        status: '可以下卡',
        raw: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (data.returnCode === '1') {
      return new Response(JSON.stringify({
        canApply: false,
        status: data.returnMessage || '不可以下卡',
        raw: data
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        canApply: false,
        status: data.returnMessage || '查询异常',
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
