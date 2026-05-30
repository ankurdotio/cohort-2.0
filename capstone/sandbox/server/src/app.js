import express from 'express';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import sandboxRouter from './routes/sandbox.routes.js';


const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/sandbox/health', (req, res) => {
    res.status(200).json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

app.use('/api/sandbox', sandboxRouter);



export default app;