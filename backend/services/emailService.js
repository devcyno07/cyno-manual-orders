const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
}

function buildItemRows(items) {
  return items.map(item => `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #f0fdf4;font-size:14px;color:#134e4a;">
        <strong style="color:#0f2027;">${item.name}</strong>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #f0fdf4;text-align:center;font-size:14px;color:#5a8090;">×${item.quantity}</td>
      <td style="padding:12px 20px;border-bottom:1px solid #f0fdf4;text-align:right;font-size:14px;color:#5a8090;">৳${item.price.toFixed(2)}</td>
      <td style="padding:12px 20px;border-bottom:1px solid #f0fdf4;text-align:right;font-size:14px;font-weight:700;color:#0d9488;">৳${item.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');
}

async function sendOrderConfirmationEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] Credentials not configured — skipping');
    return false;
  }

  const firstName = order.customerName.split(' ')[0];
  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 60%,#14b8a6 100%);border-radius:20px 20px 0 0;padding:44px 48px;text-align:center;">
          <div style="display:inline-block;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;line-height:56px;font-size:26px;margin-bottom:16px;">✚</div>
          <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.65);margin-bottom:10px;">Cyno Pharmacy</div>
          <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Order Confirmed!</h1>
          <p style="color:rgba(255,255,255,0.8);margin:12px 0 0;font-size:15px;">Hello ${firstName}, your pharmacy order has been received.</p>
        </td></tr>

        <!-- Order ID -->
        <tr><td style="background:#0f766e;padding:12px 48px;text-align:center;">
          <span style="color:rgba(255,255,255,0.65);font-size:12px;letter-spacing:2px;">ORDER ID: </span>
          <strong style="color:#ffffff;font-size:13px;letter-spacing:2px;">${order.orderId}</strong>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <span style="color:rgba(255,255,255,0.65);font-size:12px;">${orderDate}</span>
        </td></tr>

        <!-- Pharmacist notice -->
        <tr><td style="background:#fffbeb;border:1px solid #fde68a;border-radius:0;padding:16px 48px;">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
            ⚕️ <strong>Verification Review:</strong> Our team will verify your order and uploaded payment proof within 2 hours. You'll receive a dispatch confirmation once verified.
          </p>
        </td></tr>

        <!-- White body -->
        <tr><td style="background:#ffffff;padding:36px 48px;border-left:1px solid #ccfbf1;border-right:1px solid #ccfbf1;">

          <!-- Items table -->
          <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#0f2027;">💊 Order Summary</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ccfbf1;border-radius:12px;overflow:hidden;margin-bottom:28px;">
            <thead>
              <tr style="background:#f0fdfa;">
                <th style="padding:10px 20px;text-align:left;font-size:11px;color:#5a8090;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Medicine / Product</th>
                <th style="padding:10px 20px;text-align:center;font-size:11px;color:#5a8090;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Qty</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;color:#5a8090;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Unit</th>
                <th style="padding:10px 20px;text-align:right;font-size:11px;color:#5a8090;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">Total</th>
              </tr>
            </thead>
            <tbody>${buildItemRows(order.items)}</tbody>
            <tfoot>
              <tr style="background:#f0fdfa;">
                <td colspan="3" style="padding:14px 20px;font-weight:700;color:#0f2027;font-size:15px;">Grand Total</td>
                <td style="padding:14px 20px;text-align:right;font-weight:800;color:#0d9488;font-size:20px;">$${order.totalAmount.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Shipping -->
          <h2 style="margin:0 0 14px;font-size:16px;font-weight:700;color:#0f2027;">📦 Delivery Address</h2>
          <div style="background:#f0fdfa;border-radius:12px;padding:18px 22px;border:1px solid #ccfbf1;margin-bottom:28px;">
            <p style="margin:0;color:#134e4a;line-height:1.8;font-size:14px;">
              <strong>${order.shippingAddress.fullName}</strong><br>
              ${order.shippingAddress.addressLine1}${order.shippingAddress.addressLine2 ? ', ' + order.shippingAddress.addressLine2 : ''}<br>
              ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
              ${order.shippingAddress.country}
            </p>
            ${order.shippingAddress.phone ? `<p style="margin:10px 0 0;font-size:13px;color:#5a8090;">📞 ${order.shippingAddress.phone}</p>` : ''}
          </div>

          <!-- Steps -->
          <div style="background:#f0fdfa;border:1px solid #ccfbf1;border-radius:12px;padding:20px 24px;">
            <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#0d9488;">⚕️ What Happens Next?</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['1', 'Payment verification (within 2 hours)'],
                ['2', 'Order packed & dispatch notification sent'],
                ['3', 'We despatch within 2 working days, after we receive the remittance'],
                ['4', 'Indian custom clearance need 3-7 days days & EMS/RAM take 7-14 days toreached China'],
                ['5', 'total 15 to 30 days needed after we receive the remittance'],
              ].map(([n, t]) => `
              <tr>
                <td style="width:28px;padding:6px 0;">
                  <span style="display:inline-block;width:22px;height:22px;background:#0d9488;color:#fff;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;">${n}</span>
                </td>
                <td style="padding:6px 0 6px 10px;font-size:13px;color:#134e4a;">${t}</td>
              </tr>`).join('')}
            </table>
          </div>

        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0f2027;padding:28px 48px;border-radius:0 0 20px 20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.5);">Questions? Contact our pharmacy team:</p>
          <p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.8);">📞 +880 1800-CYNO &nbsp;|&nbsp; ✉️ orders@cyno-pharmacy.com</p>
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.25);">© ${new Date().getFullYear()} MediCare Pharmacy · Licensed GDP Certified Pharmaceutical Establishment</p>
          <p style="margin:10px 0 0;font-size:10px;color:rgba(255,255,255,0.2);line-height:1.5;">⚠️ Prescription medicines will only be dispensed after verification of a valid prescription from a registered medical practitioner.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const info = await getTransporter().sendMail({
      from: `"MediCare Pharmacy" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `✅ Your MediCare Order #${order.orderId} is Confirmed`,
      html,
      text: `Hi ${firstName}, your MediCare pharmacy order #${order.orderId} has been received. Total: ৳${order.totalAmount.toFixed(2)}. Our pharmacist will verify and dispatch soon.`,
    });
    console.log(`[Email] Sent to ${order.customerEmail} — ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[Email] Failed:', err.message);
    return false;
  }
}

module.exports = { sendOrderConfirmationEmail };
