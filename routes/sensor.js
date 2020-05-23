const express = require('express');
const router =express.Router();
const Sensor  = require('../Models/Sensor');
const Data  = require('../Models/Data');
const User  = require('../Models/User');
const Location  = require('../Models/Location');
var jwt = require('jsonwebtoken');
const mongoose=require('mongoose');
const kafka = require('kafka-node');

function verifyToken(req, res, next) {
    let payload;

    if(req.query.token === 'null') {
        return res.status(401).send('Unauthorized request')
    }
    try{payload = jwt.verify(req.query.token, process.env.token_Key);} catch (e) {
        return res.status(400).send('Invalid User');
    }
    if(!payload) {
        return res.status(401).send('Unauthorized request');
    }

    decoded=jwt.decode(req.query.token, {complete: true});
    req.userId = decoded.payload.id;

    next()
}
router.post('/find',verifyToken,async (req, res) =>
{
    try {
        console.log('Sensorid',req.body.Sensorid);
        user = await User.findById(req.userId);
        if (!user) {
            return res.json({status: "err", message: 'No User Found'});
        }
        Sens = new Sensor();
        Sens = await Sensor.find({ SensorIdentifier : req.body.Sensorid }).select('-data');
        if (Sens.length === 0) {
            console.log('Sens :',Sens);
            return res.json({status: "err", message: 'No Sensor Found !'});
        }
        Loc = await Location.find({ Sensor_ids : Sens[0]._id  });
        console.log('loc',Loc.length);
        console.log('Sens._id',Sens[0].name);
        console.log('Sensor',Sens.length);
        if (Loc.length === 0) {
            return res.json({status: "ok", message: 'New Sensor have been Found !', SensorFoundId : Sens[0]._id});
        }
        return res.json({status: "err", message: 'Already in use'});
    } catch (e) {
        console.log(e);
    }
});

router.post('/Add',verifyToken,async (req, res) =>
{
    try {
        console.log(req.userId);
        user = await User.findById(req.userId);
        Loc = new Location();
        Loc = await Location.findById(req.body.LocationId);
        if (!Loc) {
            return res.status(400).json({status: "err", message: 'No Location Found'});
        }
        if (!user) {
            return res.status(400).json({status: "err", message: 'No User Found'});
        }
        Sens = await Sensor.findById( req.body.SensorId ).select('-data');
        console.log('Sens :', Sens);
        if (Sens) {
            console.log('Sens :', Sens);
            console.log('req.body.SensorName:', req.body.SensorName);
            console.log('req.body.Description:', req.body.Description);
            console.log('req.body.SensorCoordinates :', req.body.SensorCoordinates);
            Sens.name = req.body.SensorName;
            Sens.Description = req.body.Description;
            Sens.SensorCoordinates = req.body.SensorCoordinates;
            console.log('Loc :', Loc);
            NewSensor = await Sens.save();
            console.log('Sens 11111:',Sens._id);
            Loc.Sensor_ids.push(NewSensor._id);
            console.log(user);
            await Loc.save();
            return res.json({status: "ok", message: 'New Sensor have been added !', NewSensor});
        }


        console.log("error");
        return res.status(400).json({status: "err", message: 'Some kind of error'});
    } catch (e) {
        console.log(e);
    }
});
router.get('/',verifyToken, async (req , res)=>{
    try{
        All_User_Locations = [];
        All_User_Sensors = [];
        user = await User.findById(req.userId);
        for (const item of user.Location_ids) {
            locationss = await Location.findById(item);
            for (const element of locationss.Sensor_ids) {
                Sens = await Sensor.findById(element).select('-data');
                console.log(Sens);
                All_User_Sensors.push(Sens);
            }
            All_User_Locations.push(locationss);
        }
        res.json({status:"ok" , Locations : All_User_Locations,Sensors : All_User_Sensors});
    }catch (e) {
        res.json({message:e});
    }
});
router.get('/geoMap',verifyToken, async (req , res)=>{
    try{
        geoLocations ={"type": "FeatureCollection",
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
            "features": []
        };
        All_User_Sensors = [];
        All_User_Locations = [];
        All_User_Sensors = [];
        user = await User.findById(req.userId);
        for (const item of user.Location_ids) {
            locationss = await Location.findById(item);
            for (const element of locationss.Sensor_ids) {
                Sens = await Sensor.findById(element).select('-data');
                console.log(Sens);
                feature = { "type": "Feature", "properties": { "id": Sens.id,"SensorType": Sens.SensorType ,"name" : Sens.name}, "geometry": { "type": "Point", "coordinates": [ Sens.SensorCoordinates[0],Sens.SensorCoordinates[1], 0.0 ] } };
                geoLocations['features'].push(feature);
                All_User_Sensors.push(Sens);
            }
            All_User_Locations.push(locationss);
        }

        console.log('await User.findById(req.userId)');
        console.log(await User.findById(req.userId));
        res.json( geoLocations);
    }catch (e) {
        res.json({message:e.toString()});
    }
});
router.post('/remove',verifyToken,async (req,res) =>
{
    console.log('check if location exists');
    Loc = await Location.findById(req.body.LocationId);
    if (! Loc) {
        console.log('location not found');
        console.log(req.body.LocationId);
        res.json({ status:"err" ,message:'Location not found' });
    }
    console.log('check if Sensor exists');
    Sens = await Sensor.findById(req.body.SensorId);
    if (! Sens) {
        console.log('Sensor not found');
        console.log(req.body.SensorId);
        res.json({ status:"err" ,message:'Location not found' });
    }
    try{
        console.log(Sens);
        console.log(Loc);
        console.log('-----------------------------------');
        const index = Loc.Sensor_ids.indexOf(req.body.SensorId);
        console.log(index);
        if (index > -1) {
            Loc.Sensor_ids.splice(index, 1);
        }
        console.log(Sens);
        console.log(Loc);
        // Sens.deleteOne();
        Loc = await Loc.save();
        res.json({status:"ok" , message: 'Sensor Deleted'});
    }catch (e) {
        res.json({ message:e });
        console.log(e);
    }
});
router.post('/AddSensorData',async (req, res) =>
{
    try {
    /*
    * send data like this
    *         {
            "SensorIdentifier": "123",
            "humidite":"25",
            "temperature":23,
            "batterie":25,
            "humiditéSol":21
                }
    * */

        Sens = await Sensor.findOne({SensorIdentifier: req.body.SensorIdentifier});
        //console.log(req.body);
        delete req.body.SensorIdentifier;
        req.body.time =  Date.now() ;
        Sens.data.push(req.body);
        // console.log(Sens.data);
        await Sens.save();
        AlertClients(req.body, Sens);
        return res.status(200).json({status: "ok", message: Sens});
    } catch (e) {
        console.log('error AddSensorData',e);
    }
});
router.post('/dashboard',verifyToken,async (req, res) =>
{
    /*
    * send data like this
    *         {
            "SensorIdentifier": "123",
            "humidite":"25",
            "temperature":23,
            "batterie":25,
            "humiditéSol":21
                }
    * */
    user = await User.findById(req.userId);
    // get locations
    var data =[];

    i = 0;
    for (const item of user.Location_ids) {
        var result = {};
        locationss = await Location.findById(item);

        result.location = locationss;
        result.sensor =[];
        for (const element of locationss.Sensor_ids) {
            Sens = await Sensor.findById(element);
            result.sensor.push(Sens);
        }
        data.push(result);
    }
    // Sens = await Sensor.findOne({SensorIdentifier: req.body.SensorIdentifier});


    //console.log(Sens.data);
    //await Sens.save();
    return res.status(200).json({status: "ok", message: data});
});
/*
const sensor = io
    .of('/ensor')
    .on('connection', (socket) => {
        console.log('ensor connected', socket.id);
        socket.emit('item', { news: 'item' });
    });
*/
//get data from kafka

try {
    Consumer = kafka.Consumer,
        client = new kafka.KafkaClient({kafkaHost: process.env.kafka_ip}),
        consumer = new Consumer(
            client,
            [
                {topic: 'TestTopic', partition: 0}
            ],
            {
                autoCommit: true
            }
        );
    consumer.on('message', function (message) {
        console.log(message);
        verify_kafka_data_message(message.value);
    });
    consumer.on('error', function (err) {
        console.log('error', err);
    });
}
catch(e) {
    console.log(e);
}
async function verify_kafka_data_message(x) {
    var y = JSON.parse(x);
    console.log('y :', Object.keys(y).length);
    if (Object.keys(y).length === 5) {
        console.log('ok', 'data accepted');
        Sens = await Sensor.findOne({SensorIdentifier: y.SensorIdentifier});
        delete y.SensorIdentifier;
        y.time = Date.now();
        console.log('data',y);
        Sens.data.push(y);
        // await Sens.save();
        // AlertClients(data , y); <---- wrong params
        return;
    }
    console.log('error', 'not valid data');
}
/*
Sens = await Sensor.findOne({SensorIdentifier: req.body.SensorIdentifier});
//console.log(req.body);
delete req.body.SensorIdentifier;
req.body.time =  Date.now() ;
Sens.data.push(req.body);
console.log(Sens.data);
await Sens.save();
return res.status(200).json({status: "ok", message: Sens});
*/
router.post('/FactoryAdd',async (req, res) =>
{
    try {
        console.log('req.body ',req.body);
        Sens = await Sensor.findOne({SensorIdentifier: req.body.identifier});
        if (Sens)
        {
            console.log("duplicate identifier");
            return res.status(400).json({status: "err", message: 'duplicate identifier'});
        }
        console.log('sens :',req.body.identifier);
        let sensor = new Sensor();
        sensor.SensorIdentifier = req.body.identifier;
        sensor.SensorType = req.body.SensorType;
        console.log(sensor);
        if (sensor) {
            console.log(sensor);
            console.log("Sensor have been added !");
            NewSensor = await sensor.save();
            console.log(NewSensor._id);
            return res.json({status: "ok", message: 'New Sensor have been added !'});
        }


        console.log("error");
        return res.status(400).json({status: "err", message: 'Some kind of error'});
    } catch (e) {
        console.log(e);
    }
});



//******************************************Socket io****************************************************//
//Sensor/UpdateValue
SocketClients = [];
const chat = io
    .of('/Sensor/UpdateValue')
    .on('connection', (socket) => {
        socket.on('getChartdata', async (message) => {
            //console.log('Chart Update ',message);
            //console.log('getChartdata', socket.id);
            //console.log('SocketClients length ', SocketClients.length);
            if (SocketClients.length === 0)
            {
                //console.log('create 1');
                let clientInfo = {};
                clientInfo.socketId = socket.id;
                clientInfo.token = message.Accesstoken;
                clientInfo.locationId = message.LocationId;
                SocketClients.push(clientInfo);
            } else
            {
                let exist = false;
                SocketClients.forEach(item => {
                    if (item.socketId === socket.id)
                    {
                        if (item.token === message.Accesstoken)
                        {
                            if (item.locationId === message.LocationId)
                            {
                                //console.log('Socket Already Exists');
                                exist = true;
                            }else
                            {
                                exist = true;
                                //console.log('Changed Location Id');
                                //console.log('SocketClients ', SocketClients);
                                item.locationId = message.LocationId;
                            }
                        }
                    }
                });
                if (exist === false)
                {
                    //console.log('create 2');
                    let clientInfo = {};
                    clientInfo.socketId = socket.id;
                    clientInfo.token = message.Accesstoken;
                    clientInfo.locationId = message.LocationId;
                    SocketClients.push(clientInfo);
                }
            }
            // console.log('Socket Clients' , SocketClients);
            // socket.emit('getChartdata',  await getChart(message.LocationId, message.Accesstoken));
        });
        socket.on('getData', (message) => {
            //console.log('change data');
        });
        socket.on('disconnect', (message) => {
            //console.log('disconnect' , message);
            let i = 0;
            SocketClients.forEach(item => {
                if (item.socketId === socket.id)
                    SocketClients.splice(i,1);
                i++;
            })
        });
    });

async function getChart(LocationId, AccessToken) {
    return new Promise(async function(resolve, reject) {
        try {
            payload = jwt.verify(AccessToken, process.env.token_Key);
        } catch (e) {
            console.log('token not verified');
            return;
        }
        if (!payload) {
            console.log('empty payload');
            return;
        }
        decoded = jwt.decode(AccessToken, {complete: true});
        user =  await User.findById(decoded.payload.id);
        if (!user) {
            console.log('empty user ', user);
            return;
        }
        locationss =  await Location.findById(LocationId);
        if (!locationss) {
            console.log('empty locationss ', locationss);
            return;
        }
        console.log('return value', await locationss.AutomaticIrrigation);
        resolve(await locationss.AutomaticIrrigation) // successfully fill promise
    })
}
async function AlertClients(data, Sensor) {
    //console.log('Alert Clients', Sensor._id);
    //console.log('data', data);
    loc = await Location.find({Sensor_ids: Sensor._id});
    if (!loc)
    {return;}
    //console.log('location to update', loc[0]._id);
    //console.log('SocketClients', SocketClients);
    SocketClients.forEach(item => {
        //console.log('item ', item.locationId);
        //console.log('loc[0]._id ', loc[0]._id);
        if (item.locationId == loc[0]._id) {
            //console.log('Needs Update');
            //console.log('socket id ' , item.socketId);
            //console.log('new data' , data);
            // state = io.to(item.socketId).emit('getChartdata', 'I just met you');
            state = io.of('/Sensor/UpdateValue').to(item.socketId).emit('setChartdata', { SensId : Sensor._id , newData : data });
            // console.log('state' , state);
        }
    });
}




module.exports = router;
