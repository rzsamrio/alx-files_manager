import { ObjectId } from 'mongodb';
import fs from 'fs';
import imageThumbnail from 'image-thumbnail';
import { fileQueue, userQueue } from './utils/queue.js';
import dbClient from './utils/db.js';

const files = dbClient.database.collection('files');
const users = dbClient.database.collection('users');

fileQueue.process(async (job, done) => {
  const { fileId, userId } = job;
  if (!fileId) {
    done(new Error('Missing fileId'));
    return;
  }
  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }
  const file = await files.findOne({ _id: ObjectId(fileId), userId: ObjectId(userId) });
  if (!file) {
    done(new Error('File not found'));
    return;
  }
  [500, 200, 100].forEach(async (width) => {
    try {
      const thumbnail = await imageThumbnail(file.localPath, { width });
      fs.writeFile(`${file.localPath}_${width}`, thumbnail, (err) => {
        console.error(err);
      });
    } catch (err) {
      console.error(err);
    }
  });
});

userQueue.process(async (job, done) => {
  const { userId } = job;
  if (!userId) {
    done(new Error('Missing userId'));
    return;
  }
  const user = await users.findOne({ _id: ObjectId(userId) });
  if (!user) {
    done(new Error('User not found'));
    return;
  }
  console.log(`Welcome ${user.email}!`);
});
