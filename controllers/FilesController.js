import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { lookup } from 'mime-types';
import fs from 'fs';
import { fileQueue } from '../utils/queue.js';
import dbClient from '../utils/db.js';
import redisClient from '../utils/redis.js';

const users = dbClient.database.collection('users');
const files = dbClient.database.collection('files');

class FilesController {
  static async postUpload(request, response) {
    const fileType = request.body.type;
    const {
      name, parentId, isPublic, data,
    } = request.body;
    const document = {
      name,
      type: fileType,
      parentId: parentId || 0,
      isPublic: isPublic || false,
    };
    if (!name) {
      response.status(400).json({ error: 'Missing name' });
      return;
    }
    if (!['folder', 'file', 'image'].includes(fileType)) {
      response.status(400).json({ error: 'Missing type' });
      return;
    }
    if (fileType !== 'folder') {
      if (!data) {
        response.status(400).json({ error: 'Missing data' });
        return;
      }
    }

    if (parentId) {
      const parent = files.findOne({ _id: ObjectId(parentId) });
      if (!parent) {
        response.status(400).json({ error: 'Parent not found' });
        return;
      }
      if (parent.type !== 'folder') {
        response.status(400).json({ error: 'Parent is not a folder' });
        return;
      }
    }

    const token = request.get('X-Token');
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
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    document.userId = ObjectId(userId);

    if (document.type === 'folder') {
      const res = await files.insertOne(document);
      const id = res.insertedId;
      response.status(201).json({
        id, userId, name, type: fileType, isPublic: document.isPublic, parentId: document.parentId,
      });
      return;
    }

    const rootDir = process.env.FOLDER_PATH || '/tmp/files_manager';

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }
    const filename = uuidv4();
    document.localPath = `${rootDir}/${filename}`;
    fs.writeFile(document.localPath, Buffer.from(data, 'base64'), (err) => {
      if (err) console.log('Error writing file:', err);
    });
    const res = await files.insertOne(document);
    const id = res.insertedId;
    if (fileType === 'image') {
      fileQueue.add({ fileId: id, userId });
    }
    response.status(201).json({
      id, userId, name, type: fileType, isPublic: document.isPublic, parentId: document.parentId,
    });
  }

  static async getShow(request, response) {
    const { id } = request.params;
    const token = request.get('X-Token');
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
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    response.json(file);
  }

  static async getIndex(request, response) {
    const parentId = request.query.parentId || 0;
    let page;
    try {
      page = parseInt(request.query.page, 10);
    } catch (err) {
      page = 0;
    }
    const token = request.get('X-Token');
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
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const parent = await files.findOne({ _id: ObjectId(parentId), userId: ObjectId(userId) });
    if (!parent && parentId !== 0) {
      response.json([]);
      return;
    }
    const childrenFiles = await files.aggregate([
      { $match: { parentId } },
      { $skip: (20 * page) },
      { $limit: 20 },
    ]).toArray();
    response.json(childrenFiles);
  }

  static async putPublish(request, response) {
    const { id } = request.params;
    const token = request.get('X-Token');
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
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    let file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    files.updateOne(file, { $set: { isPublic: true } });
    file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    response.json(file);
  }

  static async putUnpublish(request, response) {
    const { id } = request.params;
    const token = request.get('X-Token');
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
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) {
      response.status(401).json({ error: 'Unauthorized' });
      return;
    }
    let file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    files.updateOne(file, { $set: { isPublic: false } });
    file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    response.json(file);
  }

  static async getFile(request, response) {
    const { id, size } = request.params;
    const token = request.get('X-Token');
    let userId;
    try {
      userId = await redisClient.get(`auth_${token}`);
    } catch (err) {
      console.log(err);
      userId = null;
    }
    let user;
    if (userId) {
      user = await users.findOne({ _id: ObjectId(userId) });
    } else {
      user = null;
    }
    let file;
    if (user) {
      file = await files.findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    }
    if (!file) {
      file = await files.findOne({ _id: ObjectId(id) });
    }
    if (!file || !file.isPublic) {
      response.status(404).json({ error: 'Not found' });
      return;
    }
    const mime = lookup(file.name);
    response.set('Content-Type', mime);
    if (size) {
      file.localPath += `_${size}`;
    }
    fs.readFile(file.localPath, (err, data) => {
      if (err) {
        console.log(err);
        response.status(404).json({ error: 'Not found' });
        return;
      }
      response.send(data);
    });
  }
}

export default FilesController;
