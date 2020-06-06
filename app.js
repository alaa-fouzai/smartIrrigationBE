const express = require('express');
require('dotenv/config');
const app = express();
var jwt = require('jsonwebtoken');
const mongoose=require('mongoose');
const socket = require('socket.io');
//const path = require('path');
mongoose.connect(process.env.DB_CONNECTION,{ useNewUrlParser: true , useUnifiedTopology: true } ,() => console.log('connected to BD')).catch(error => handleError(error));
const bodyParser= require('body-parser');

//app.use(express.static(path.join(__dirname, '../frontend/dist/AdminLTE')))


app.use(bodyParser.json());
const server = app.listen(3000,'0.0.0.0');
global.io = socket.listen(server);
module.exports = io;
const postRouter = require('./routes/posts');
const UserRouter = require('./routes/Users');
const SensorRouter = require('./routes/Sensor');
const LocationRouter = require('./routes/location');
const DashboardRouter = require('./routes/dashboard');



app.use('/api/posts',postRouter);
app.use('/api/users',UserRouter);
app.use('/api/sensors',SensorRouter);
app.use('/api/location',LocationRouter);
app.use('/api/dashboard',DashboardRouter);

/*app.get('*', (req, res) => {
    return res.sendFile(path.join(__dirname, '../frontend/dist/AdminLTE/index.html'))
});*/
/*
app.get('/',(req,res)=>{
    res.send('hello world');
});
*/
const news = io
    .of('/news')
    .on('connection', (socket) => {
        console.log('news connected', socket.id);
        socket.emit('item', { news: 'item' });
    });


