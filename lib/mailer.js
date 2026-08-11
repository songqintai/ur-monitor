/**
 * 邮件发送封装，用 Resend API (https://resend.com)
 * 需要环境变量 RESEND_API_KEY（在 resend.com 申请，免费额度够用）
 * 不验证自己的域名时，Resend 只允许 from 用 onboarding@resend.dev，
 * 且只能发给你注册 Resend 时用的那个邮箱地址 —— 正好符合"发给自己"的场景。
 */

const RESEND_API = 'https://api.resend.com/emails';

async function sendMail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('缺少环境变量 RESEND_API_KEY，无法发送邮件');

  const from = process.env.MAIL_FROM || 'UR房源监控 <onboarding@resend.dev>';

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend 发送失败 (HTTP ${res.status}): ${body}`);
  }

  return res.json();
}

module.exports = { sendMail };
