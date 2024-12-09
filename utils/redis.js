#!/usr/bin/node

const { promisify } = require('util');
const { createClient } = require('redis');

class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (err) => console.log(`Redis client not connected to the server: ${err.message}`));
    this.client.on('connect', () => console.log('Redis client connected to the server'));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const getAsync = promisify(this.client.get).bind(this.client);
    return getAsync(key);
  }

  async set(key, value, duration) {
    this.client.setex(key, duration, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
