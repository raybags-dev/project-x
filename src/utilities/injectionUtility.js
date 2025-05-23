import crypto from 'crypto'

export function addNonceToScript (nonce) {
  return nonce ? `nonce="${nonce}"` : ''
}
export function nonceMiddleware (req, res, next) {
  res.locals.nonce = crypto.randomBytes(16).toString('base64')
  next()
}

export function setupNoncedRoute (app) {
  app.use(nonceMiddleware)

  app.get('/', (req, res, next) => {
    res.locals.nonce = req.res.locals.nonce
    next()
  })
}

export function injectNonceToLocalScripts(app) {
  app.use((req, res, next) => {
    const originalSend = res.send
    
    res.send = function(body) {
      if (typeof body === 'string' && body.includes('<script')) {
        body = body.replace(
          /<script([^>]*)src="([^"]*)"([^>]*)>/g,
          `<script ${addNonceToScript(res.locals.nonce)}$1 src="$2"$3>`
        );
        
        body = body.replace(
          /<script([^>]*)>(?!<\/script>)/g,
          (match, p1) => {
            if (p1 && !p1.includes('nonce=')) {
              return `<script${p1} ${addNonceToScript(res.locals.nonce)}>`
            }
            return match;
          }
        );
      }
      
      originalSend.call(this, body)
    };
    
    next()
  })
}