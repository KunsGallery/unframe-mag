const ADMIN_EMAILS = new Set([
  "gallerykuns@gmail.com",
  "cybog2004@gmail.com",
  "sylove887@gmail.com",
]);

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.has(String(email));
}
