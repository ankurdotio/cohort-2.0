import express from 'express';
import morgan from 'morgan';


const app = express();

app.use(morgan('dev'));

app.get('/', (req, res) => {
    let sum = 0
    for (let i = 0; i < 1000000000; i++) {
        sum += i
    }
    res.send(`Hello World! Sum is ${sum}`);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});