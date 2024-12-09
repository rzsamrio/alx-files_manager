import AppController from '../controllers/AppController.js';
import UsersController from '../controllers/UsersController.js';
import AuthController from '../controllers/AuthController.js';
import FilesController from '../controllers/FilesController.js';

function addRoutes(app) {
  app.get('/status', AppController.getStatus);
  app.get('/stats', AppController.getStats);

  app.post('/users', UsersController.postNew);

  app.get('/connect', AuthController.getConnect);
  app.get('/disconnect', AuthController.getDisconnect);
  app.get('/users/me', AuthController.getMe);

  app.post('/files', FilesController.postUpload);
  app.get('/files/:id', FilesController.getShow);
  app.get('/files', FilesController.getIndex);
  app.put('/files/:id/publish', FilesController.putPublish);
  app.put('/files/:id/unpublish', FilesController.putUnpublish);
  app.put('/files/:id/data', FilesController.getFile);
}

export default addRoutes;
