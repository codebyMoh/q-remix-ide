import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import editorRoutes from './routes/editorRoutes';

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.get('/', (req, res) => {
    res.send('Welcome to the Solidity Compiler Backend!');
});
app.use('/api/editor', editorRoutes);

export default app;