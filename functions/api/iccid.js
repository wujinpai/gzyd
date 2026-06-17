// ICCID 查询接口 - 贵州移动商城
// 注意：此接口暂时无法从外部访问，返回友好提示信息
export async function onRequestPost(context) {
  try {
    const { userId, mobile } = await context.request.json();

    if (!userId || !mobile) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ICCID 查询接口需要特定的认证和内部网络访问
    // 目前暂时无法从外部访问，返回友好提示
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
