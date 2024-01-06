const fallbackPagePath = new URL(
  '../../errorPage/notConnected.html',
  import.meta.url
).pathname

export async function NotSupportedRouter (req, res) {
  res.status(502).sendFile(fallbackPagePath)
}
