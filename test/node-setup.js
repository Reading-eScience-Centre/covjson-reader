let browser = typeof window !== 'undefined'
  
export const PORT = 9876 // same as in karma.conf.js

export function runServerIfNode() {
  if (browser) return
  
  // lazy load with require() to prevent errors in browser environments
  let finalhandler = require('finalhandler')
  let http = require('http')
  let serveStatic = require('serve-static')

  let serve = serveStatic('test')
  let server = http.createServer((req, res) => {
    serve(req, res, finalhandler(req, res))
  })
  before(() => {
    server.listen(PORT)
  })

  after(() => {
    server.close()
  })
}