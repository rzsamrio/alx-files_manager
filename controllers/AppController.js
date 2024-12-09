import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

class AppController {
  static getStatus(req, res) {
    return res.json({ redis: redisClient.isAlive(), db: dbClient.isAlive() });
  }

  static getStats(req, res) {
    (async () => {
      const userCount = await dbClient.nbUsers();
      const fileCount = await dbClient.nbFiles();
      res.json({ users: userCount, files: fileCount });
    })();
  }
}

export default AppController;
