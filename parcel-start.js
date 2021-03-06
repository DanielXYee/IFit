const proxy = require('http-proxy-middleware')
const Bundler = require('parcel-bundler')
const express = require('express')

let bundler = new Bundler('./src/index.html')
let app = express()

app.use(
    ['/static','/upload'],
    proxy({
        target: 'http://localhost:3000',
    })
)

app.use(
    '/videos',
    proxy({target:'http://192.168.0.163:8080'
    })
)

app.use(bundler.middleware())

app.listen(Number(process.env.PORT || 1234))