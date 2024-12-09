import express from 'express';
import addRoutes from './routes/index.js';

const app = express();

const port = process.env.PORT || '5000';

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

addRoutes(app);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

export default app;
