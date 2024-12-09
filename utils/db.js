import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '27017';
    const database = process.env.DB_DATABASE || 'files_manager';
    this.client = new MongoClient(`mongodb://${host}:${port}`, { useUnifiedTopology: true });
    try {
      this.client.connect();
      this.database = this.client.db(database);
    } catch (err) {
      console.log('Could not connect to database:', err);
    }
  }

  isAlive() {
    if (!this.client) {
      console.log('Client is null');
      return false;
    }
    return this.client.isConnected();
  }

  async nbUsers() {
    if (!this.isAlive()) return 0;
    const users = this.database.collection('users');
    const nb = await users.countDocuments({}, { hint: '_id_' });
    console.log(nb);
    return nb;
  }

  async nbFiles() {
    if (!this.isAlive()) return 0;
    const files = this.database.collection('files');
    const nb = await files.countDocuments({}, { hint: '_id_' });
    console.log(nb);
    return nb;
  }
}

const dbClient = new DBClient();
export default dbClient;
