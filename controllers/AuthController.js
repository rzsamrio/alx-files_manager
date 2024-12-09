import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AuthController {
  static getConnect(request, response) {
    const authHeader = request.get('Authorization');
    if (!authHeader) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const authString = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');

    const [email, password] = authString.split(':');
    if (!email || !password) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }

    (async () => {
      try {
        const users = dbClient.database.collection('users');
        const user = await users.findOne({
          email,
          password: sha1(password),
        });
        if (!user) {
          response.status(401).json({ error: 'Unauthorized' });
          return;
        }
        const token = uuidv4();
        if (!redisClient.isAlive()) {
          console.log('Redis client not connected');
          response.status(500).json({ error: 'Redis server error' });
          return;
        }
        redisClient.set(`auth_${token}`, user._id.toString(), (24 * 3600));
        response.json({ token });
      } catch (err) {
        console.log(err);
        response.status(401).json({ error: 'Unauthorized' });
      }
    })();
  }

  static getDisconnect(request, response) {
    const token = request.get('X-Token');
    (async () => {
      let userId;
      try {
        userId = await redisClient.get(`auth_${token}`);
      } catch (err) {
        console.log(err);
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!userId) {
        response.status(401).json({ error: 'Unauthorized' });
        return;
      }
      redisClient.client.del(`auth_${token}`, (err) => {
        if (err) {
          console.log('Could not delete token', err);
          response.status(500).json({ error: 'Redis server error' });
        } else {
          response.sendStatus(204);
        }
      });
    })();
  }

  static getMe(request, response) {
    const token = request.get('X-Token');
    redisClient
      .get(`auth_${token}`)
      .then((userId) => {
        const users = dbClient.database.collection('users');
        users.findOne({ _id: ObjectId(userId) }).then((user) => {
          response.json(user);
        }).catch((err) => {
          console.log(err);
          response.status(401).json({ error: 'Unauthorized' });
        });
      });
  }
}

export default AuthController;
