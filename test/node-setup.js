import finalhandler from 'finalhandler'
import http from 'http'
import serveStatic from 'serve-static'

let browser = typeof window !== 'undefined'
  
export const PORT = 8000

export function runServerIfNode() {
  if (browser) return

  let serve = serveStatic('test/fixtures')
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