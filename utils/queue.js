import Queue from 'bull';

const fileQueue = Queue('thumbnail generation');

const userQueue = Queue('welcome email');

module.exports = { fileQueue, userQueue };
