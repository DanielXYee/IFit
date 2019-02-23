const proxy = require('http-proxy-middleware')
const Bundler = require('parcel-bundler')
const express = require('express')

let bundler = new Bundler('./Html/index.html')
let app = express()

app.use(
    '/static',
    proxy({
        target: 'http://localhost:3000'
    })
)

app.use(bundler.middleware())

app.listen(Number(process.env.PORT || 1234))