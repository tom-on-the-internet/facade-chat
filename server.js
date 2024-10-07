import { createServer } from "node:http"
import { readFile } from "fs/promises"
import { randomBytes } from "node:crypto"
import url from "url"

const PORT = 8213

let clients = new Map()
let server = createServer(async (req, res) => {
    let parsedUrl = url.parse(req.url, true)

    /**
     * User HTML file
     */
    if (req.method === "GET" && parsedUrl.pathname === "/") {
        res.statusCode = 200
        res.setHeader("Content-Type", "text/html")
        let buffer = await readFile("user.html")
        res.end(buffer)

        return
    }

    /**
     * Admin HTML file
     */
    if (req.method === "GET" && parsedUrl.pathname === "/admin") {
        res.statusCode = 200
        res.setHeader("Content-Type", "text/html")
        let buffer = await readFile("admin.html")
        res.end(buffer)

        return
    }

    /**
     * Accept message from user
     */
    if (req.method === "POST" && parsedUrl.pathname === "/conversation") {
        let body = ""

        // Collect data chunks
        req.on("data", (chunk) => {
            body += chunk.toString()
        })

        req.on("end", () => {
            res.statusCode = 200
            res.setHeader("Content-Type", "application/json")

            let token = randomBytes(20).toString("hex")
            clients.set(token, JSON.parse(body).message)

            res.write(JSON.stringify({ token }))
            res.end()
        })

        return
    }

    if (req.method === "GET" && parsedUrl.pathname === "/conversation") {
        let token = parsedUrl.query.token

        let message = clients.get(token)
        clients.delete(token)

        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache")
        res.setHeader("Connection", "keep-alive")
        res.flushHeaders()

        let response = ""
        let idx = 0
        let interval = setInterval(() => {
            if (message.length > idx) {
                response += message[idx]
                idx++

                res.write(
                    `data: ${JSON.stringify({ message: "You said: " + response, complete: false })}\n\n`
                )
            } else {
                res.write(
                    `data: ${JSON.stringify({ message: "You said: " + response, complete: true })}\n\n`
                )
                clearInterval(interval)
            }
        }, 30)

        return
    }

    /**
     * Fallback
     */
    res.statusCode = 404
    res.setHeader("Content-Type", "text/html")
    res.end("<h1>not found</h1>")
})

server.listen(PORT, () => {
    console.log(`Server running at localhost:${PORT}/`)
})
