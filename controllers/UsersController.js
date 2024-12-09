import sha1 from 'sha1';
import dbClient from '../utils/db.js';
import { userQueue } from '../utils/queue.js';

class UsersController {
  static postNew(request, response) {
    const users = dbClient.database.collection('users');
    const { email } = request.body;
    const { password } = request.body;

    if (!email) {
      response.status(400).json({ error: 'Missing email' });
      return;
    }

    if (!password) {
      response.status(400).json({ error: 'Missing password' });
      return;
    }

    (async () => {
      let repetitions;
      try {
        repetitions = await users.countDocuments({ email });
      } catch (err) {
        console.log(err);
        response.status(500).json({ error: 'Database error' });
        return;
      }
      if (repetitions > 0) {
        response.status(400).send({ error: 'Already exist' });
        return;
      }
      try {
        const result = await users.insertOne({
          email,
          password: sha1(password),
        });
        userQueue.add({ userId: result.insertedId });
        response.status(201).json({ id: result.insertedId, email });
      } catch (err) {
        console.log(err);
        response.status(500).json({ error: 'Database error' });
      }
    })();
  }
}

export default UsersController;
