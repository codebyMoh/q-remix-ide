import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import editorRoutes from './routes/editorRoutes';

import morgan from 'morgan';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.send('Welcome to the Solidity Compiler Backend!');
});
app.use('/api/editor', editorRoutes);
app.use(morgan('combined'));
export default app;