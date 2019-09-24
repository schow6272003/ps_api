const express = require('express')
const app = express();
const redisMod = require("redis");
const redis = (process.env.REDIS_URL) ? redisMod.createClient(process.env.REDIS_URL) : redisMod.createClient();
const limiter = require('express-limiter')(app, redis);

function RateLimiter(){};

RateLimiter.ipAddress = () => {
  const options = { path: '/api',
                    method: 'get',
                    lookup: ['connection.remoteAddress'],
                    total: 10,
                    expire: 1000 * 60 * 60,
                    onRateLimited: (request, response, next) => {
                     response.status(429).json({message: 'Rate limit exceeded'});
                    }
                   }
  return limiter(options);
};

module.exports = RateLimiter;