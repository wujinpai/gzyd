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

    // ICCID 查询接口 - 贵州移动商城订单查询
    const encryptedUserId = await aesEncrypt(userId, 'asiainfoIIS20182');
    
    // 尝试多个可能的 API 端点
    const apiEndpoints = [
      'https://wap.gz.10086.cn/smphone/gzshop/shop/queryIccidByIdAndMobile.do',
      'https://wap.gz.10086.cn/smphone/gzshop/shop/queryOrderByIdAndMobile.do',
      'https://wap.gz.10086.cn/smphone/gzshop/shop/order/query.do'
    ];

    let iccid = null;
    let lastError = null;

    for (const apiUrl of apiEndpoints) {
      try {
        const params = new URLSearchParams();
        params.append('certNumber', encryptedUserId);
        params.append('mobile', mobile);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://wap.gz.10086.cn/smphone/gzshop/shop/'
          },
          body: params.toString()
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          
          // 尝试从响应中提取 ICCID
          iccid = data.iccid || 
                  data.ICCID || 
                  data.data?.iccid || 
                  data.data?.ICCID ||
                  data.result?.iccid ||
                  (data.data && typeof data.data === 'object' ? Object.values(data.data).find(v => v && typeof v === 'string' && v.startsWith('89')) : null);

          if (iccid) {
            return new Response(JSON.stringify({
              iccid: iccid,
              msg: '查询成功',
              success: true
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (e) {
        lastError = e;
      }
    }

    // 如果所有 API 都失败，返回友好的提示
    return new Response(JSON.stringify({
      msg: '暂时查不到iccid，收到物流信息后再查询（可先点击"新渠道订单查询"查看物流是否已更新）',
      success: false,
      hint: '如果急需查询ICCID，请前往新渠道订单查询页面手动查看'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ 
      msg: '暂时查不到iccid，收到物流信息后再查询（可先点击"新渠道订单查询"查看物流是否已更新）',
      success: false,
      hint: '如果急需查询ICCID，请前往新渠道订单查询页面手动查看'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
