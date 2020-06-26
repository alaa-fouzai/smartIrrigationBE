const express = require('express');
const router =express.Router();
const Sensor  = require('../Models/Sensor');
const Data  = require('../Models/Data');
const User  = require('../Models/User');
const Shared  = require('./shared');
const Location  = require('../Models/Location');
var jwt = require('jsonwebtoken');
const https = require('https');
const querystring = require('querystring');
const socket = require('socket.io');
const mongoose=require('mongoose');
const nodemailer = require('nodemailer');
//module.exports.Email = EmailUser();
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
router.get('/',verifyToken, async (req , res)=>{

        res.json({status:"ok" , response : "dashboard works"});

});
router.get('/dash',verifyToken,async (req, res) =>
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
router.get('/sidenav',verifyToken, async (req , res)=>{
            All_User_Locations_names = [];
            user = await User.findById(req.userId);
            for (const item of user.Location_ids) {
                locationss = await Location.findById(item).select('SiteName Sensor_ids');
                All_User_Locations_names.push(locationss);
            }


    res.json({status:"ok" , response : All_User_Locations_names});

});
router.get('/profile',verifyToken, async (req , res)=>{
    await new Promise(resolve => setTimeout(resolve, 5000));
    All_User_Locations = [];
    user = await User.findById(req.userId);
    for (const item of user.Location_ids) {
        locationss = await Location.findById(item).select('SiteName Sensor_ids Created_date').sort({Created_date: 1});
        All_User_Locations.push(locationss);
    }


    res.json({status:"ok" , response : {"user" : user ,"locations": All_User_Locations}});

});
router.post('/UpdateProfile',verifyToken, async (req , res)=>{
    All_User_Locations = [];
    user = await User.findById(req.userId);
    if (user.password === req.body.password)
    {
        if (req.body.FirstName.length > 0 && req.body.FirstName !== user.FirstName ) {
            console.log('true');
            user.FirstName = req.body.FirstName;
        }
        if (req.body.LastName.length > 0 && req.body.LastName !== user.LastName ) {
            console.log('LastName');
            user.LastName = req.body.LastName;
        }
        if (req.body.email.length > 0 && req.body.email !== user.email ) {
            console.log('email');
            user.email = req.body.email;
        }
        if (req.body.newPassword.length > 0 && req.body.newPassword !== user.password ) {
            console.log('true');
            user.password = req.body.newPassword;
        }
        if (req.body.smsNotif !== undefined && req.body.smsNotif !== "" && req.body.smsNotif !== user.Notifications.SMS ) {
            console.log('changing sms notif');
            user.Notifications.SMS= req.body.smsNotif;
        }
        if (req.body.emailNotif !== undefined && req.body.emailNotif !== "" && req.body.emailNotif !== user.Notifications.Email ) {
            console.log('email notif ');
            user.Notifications.Email = req.body.emailNotif;
        }
        if (req.body.pushNotif !== undefined && req.body.pushNotif !== "" && req.body.pushNotif !== user.Notifications.Push ) {
            console.log('push notif');
            user.Notifications.Push= req.body.pushNotif ;
        }
        await user.save();
        return res.json({status:"ok" , message : "Profile Updated \n Plz refrech the page" , response : {"user" : user}});
    } else return res.json({status:"err" , message : "Wrong Password"});
});
//// RelayConfiguration
router.post('/RelayConfiguration',verifyToken, async (req , res)=>{
    try {
        console.log('relay Configuration', req.body.RelayConfiguration);
        return res.json({status:"ok" , message : "ok" });
    } catch (e) {
        console.log(e.toString());
    }
});



router.get('/SensorsData',verifyToken, async (req , res)=>{
    sensors = [];
    // await new Promise(resolve => setTimeout(resolve, 5000));
    try {
        locations = await Location.findById(req.query.location_id);
        for (const item of locations.Sensor_ids) {
            Sens = await Sensor.findById(item);
            sensors.push(Sens);
        }
    } catch (e) {
        res.json({status:"err" , response : e.toString()});
    }

    /*for (const item of user.Location_ids) {
        locationss = await Location.findById(item).select('SiteName Sensor_ids');
        All_User_Locations_names.push(locationss);
    }

*/
    res.json({status:"ok" , response : sensors , location : locations});

});
router.get('/notify', async (req , res)=>{

    user = await User.findById(req.body.UserId);
    console.log("notif user",user);
    if (user==={} || user===undefined)
    {return ;}
    if (user.Notifications.Push === true)
    {
        console.log('user id for notification', req.body.UserId);
        Shared.NotifyyUser(req.body.UserId,req.body.data );
    }
    if (user.Notifications.Email === true)
    {
        console.log('user.email ',user.email);
        console.log('req.body.data  ',req.body.data.text );
        Shared.EmailUser(user.email, 'SmailSubject' ,req.body.data.text );
    }
    res.json({status:"ok" , message : "notif sent" });

});

router.get('/weither', verifyToken ,async (req , res)=>{

    try{
        console.log("weither request",req.query);
        locations = await Location.findById(req.query.location_id);
        // const url = 'https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY'
        let h = await getWeither(locations.Coordinates[0],locations.Coordinates[1]);
        //console.log('weither data' ,h);
        let uv= await getUV(locations.Coordinates[0],locations.Coordinates[1]);
        /*let h ={
            "cod": "200",
            "message": 0,
            "cnt": 40,
            "list": [
                {
                    "dt": 1587243600,
                    "main": {
                        "temp": 17.91,
                        "feels_like": 16.71,
                        "temp_min": 17.91,
                        "temp_max": 19.29,
                        "pressure": 1016,
                        "sea_level": 1016,
                        "grnd_level": 1015,
                        "humidity": 73,
                        "temp_kf": -1.38
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 98
                    },
                    "wind": {
                        "speed": 3.05,
                        "deg": 143
                    },
                    "rain": {
                        "3h": 0.11
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-18 21:00:00"
                },
                {
                    "dt": 1587254400,
                    "main": {
                        "temp": 17.74,
                        "feels_like": 16.36,
                        "temp_min": 17.74,
                        "temp_max": 18.78,
                        "pressure": 1014,
                        "sea_level": 1014,
                        "grnd_level": 1013,
                        "humidity": 73,
                        "temp_kf": -1.04
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 99
                    },
                    "wind": {
                        "speed": 3.23,
                        "deg": 154
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-19 00:00:00"
                },
                {
                    "dt": 1587265200,
                    "main": {
                        "temp": 17.64,
                        "feels_like": 15.55,
                        "temp_min": 17.64,
                        "temp_max": 18.33,
                        "pressure": 1013,
                        "sea_level": 1013,
                        "grnd_level": 1012,
                        "humidity": 68,
                        "temp_kf": -0.69
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 87
                    },
                    "wind": {
                        "speed": 3.72,
                        "deg": 164
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-19 03:00:00"
                },
                {
                    "dt": 1587276000,
                    "main": {
                        "temp": 18.74,
                        "feels_like": 16.35,
                        "temp_min": 18.74,
                        "temp_max": 19.09,
                        "pressure": 1013,
                        "sea_level": 1013,
                        "grnd_level": 1012,
                        "humidity": 62,
                        "temp_kf": -0.35
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04d"
                        }
                    ],
                    "clouds": {
                        "all": 91
                    },
                    "wind": {
                        "speed": 4,
                        "deg": 158
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-19 06:00:00"
                },
                {
                    "dt": 1587286800,
                    "main": {
                        "temp": 24.4,
                        "feels_like": 20.45,
                        "temp_min": 24.4,
                        "temp_max": 24.4,
                        "pressure": 1012,
                        "sea_level": 1012,
                        "grnd_level": 1011,
                        "humidity": 42,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 803,
                            "main": "Clouds",
                            "description": "broken clouds",
                            "icon": "04d"
                        }
                    ],
                    "clouds": {
                        "all": 61
                    },
                    "wind": {
                        "speed": 5.96,
                        "deg": 169
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-19 09:00:00"
                },
                {
                    "dt": 1587297600,
                    "main": {
                        "temp": 26.64,
                        "feels_like": 22.17,
                        "temp_min": 26.64,
                        "temp_max": 26.64,
                        "pressure": 1010,
                        "sea_level": 1010,
                        "grnd_level": 1010,
                        "humidity": 39,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 803,
                            "main": "Clouds",
                            "description": "broken clouds",
                            "icon": "04d"
                        }
                    ],
                    "clouds": {
                        "all": 76
                    },
                    "wind": {
                        "speed": 7.07,
                        "deg": 155
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-19 12:00:00"
                },
                {
                    "dt": 1587308400,
                    "main": {
                        "temp": 24,
                        "feels_like": 19.24,
                        "temp_min": 24,
                        "temp_max": 24,
                        "pressure": 1007,
                        "sea_level": 1007,
                        "grnd_level": 1006,
                        "humidity": 46,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 7.54,
                        "deg": 124
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-19 15:00:00"
                },
                {
                    "dt": 1587319200,
                    "main": {
                        "temp": 19.77,
                        "feels_like": 17.01,
                        "temp_min": 19.77,
                        "temp_max": 19.77,
                        "pressure": 1007,
                        "sea_level": 1007,
                        "grnd_level": 1006,
                        "humidity": 57,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 4.41,
                        "deg": 128
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-19 18:00:00"
                },
                {
                    "dt": 1587330000,
                    "main": {
                        "temp": 19.09,
                        "feels_like": 13.09,
                        "temp_min": 19.09,
                        "temp_max": 19.09,
                        "pressure": 1006,
                        "sea_level": 1006,
                        "grnd_level": 1005,
                        "humidity": 59,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 8.99,
                        "deg": 117
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-19 21:00:00"
                },
                {
                    "dt": 1587340800,
                    "main": {
                        "temp": 18.44,
                        "feels_like": 12.34,
                        "temp_min": 18.44,
                        "temp_max": 18.44,
                        "pressure": 1002,
                        "sea_level": 1002,
                        "grnd_level": 1001,
                        "humidity": 61,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 9.08,
                        "deg": 121
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-20 00:00:00"
                },
                {
                    "dt": 1587351600,
                    "main": {
                        "temp": 17.97,
                        "feels_like": 14.99,
                        "temp_min": 17.97,
                        "temp_max": 17.97,
                        "pressure": 1001,
                        "sea_level": 1001,
                        "grnd_level": 1000,
                        "humidity": 62,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 4.55,
                        "deg": 126
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-20 03:00:00"
                },
                {
                    "dt": 1587362400,
                    "main": {
                        "temp": 17.2,
                        "feels_like": 14.86,
                        "temp_min": 17.2,
                        "temp_max": 17.2,
                        "pressure": 1000,
                        "sea_level": 1000,
                        "grnd_level": 1000,
                        "humidity": 74,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 4.46,
                        "deg": 115
                    },
                    "rain": {
                        "3h": 0.41
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-20 06:00:00"
                },
                {
                    "dt": 1587373200,
                    "main": {
                        "temp": 19.19,
                        "feels_like": 14.52,
                        "temp_min": 19.19,
                        "temp_max": 19.19,
                        "pressure": 999,
                        "sea_level": 999,
                        "grnd_level": 998,
                        "humidity": 71,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 91
                    },
                    "wind": {
                        "speed": 8.38,
                        "deg": 124
                    },
                    "rain": {
                        "3h": 0.53
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-20 09:00:00"
                },
                {
                    "dt": 1587384000,
                    "main": {
                        "temp": 22.57,
                        "feels_like": 20.47,
                        "temp_min": 22.57,
                        "temp_max": 22.57,
                        "pressure": 998,
                        "sea_level": 998,
                        "grnd_level": 997,
                        "humidity": 59,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 86
                    },
                    "wind": {
                        "speed": 4.88,
                        "deg": 152
                    },
                    "rain": {
                        "3h": 0.12
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-20 12:00:00"
                },
                {
                    "dt": 1587394800,
                    "main": {
                        "temp": 22.54,
                        "feels_like": 20.93,
                        "temp_min": 22.54,
                        "temp_max": 22.54,
                        "pressure": 998,
                        "sea_level": 998,
                        "grnd_level": 997,
                        "humidity": 58,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 48
                    },
                    "wind": {
                        "speed": 4.04,
                        "deg": 162
                    },
                    "rain": {
                        "3h": 2.03
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-20 15:00:00"
                },
                {
                    "dt": 1587405600,
                    "main": {
                        "temp": 17.7,
                        "feels_like": 17.77,
                        "temp_min": 17.7,
                        "temp_max": 17.7,
                        "pressure": 999,
                        "sea_level": 999,
                        "grnd_level": 998,
                        "humidity": 82,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 73
                    },
                    "wind": {
                        "speed": 2,
                        "deg": 209
                    },
                    "rain": {
                        "3h": 2.69
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-20 18:00:00"
                },
                {
                    "dt": 1587416400,
                    "main": {
                        "temp": 16.5,
                        "feels_like": 17.05,
                        "temp_min": 16.5,
                        "temp_max": 16.5,
                        "pressure": 1001,
                        "sea_level": 1001,
                        "grnd_level": 1000,
                        "humidity": 89,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 96
                    },
                    "wind": {
                        "speed": 1.36,
                        "deg": 285
                    },
                    "rain": {
                        "3h": 2.61
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-20 21:00:00"
                },
                {
                    "dt": 1587427200,
                    "main": {
                        "temp": 16.12,
                        "feels_like": 16.69,
                        "temp_min": 16.12,
                        "temp_max": 16.12,
                        "pressure": 1001,
                        "sea_level": 1001,
                        "grnd_level": 1000,
                        "humidity": 91,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 501,
                            "main": "Rain",
                            "description": "moderate rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 98
                    },
                    "wind": {
                        "speed": 1.31,
                        "deg": 213
                    },
                    "rain": {
                        "3h": 3.86
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-21 00:00:00"
                },
                {
                    "dt": 1587438000,
                    "main": {
                        "temp": 16.16,
                        "feels_like": 16.62,
                        "temp_min": 16.16,
                        "temp_max": 16.16,
                        "pressure": 1001,
                        "sea_level": 1001,
                        "grnd_level": 1000,
                        "humidity": 91,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 501,
                            "main": "Rain",
                            "description": "moderate rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 1.49,
                        "deg": 256
                    },
                    "rain": {
                        "3h": 3.5
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-21 03:00:00"
                },
                {
                    "dt": 1587448800,
                    "main": {
                        "temp": 15.96,
                        "feels_like": 15.53,
                        "temp_min": 15.96,
                        "temp_max": 15.96,
                        "pressure": 1002,
                        "sea_level": 1002,
                        "grnd_level": 1001,
                        "humidity": 92,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 501,
                            "main": "Rain",
                            "description": "moderate rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 2.75,
                        "deg": 299
                    },
                    "rain": {
                        "3h": 4.75
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-21 06:00:00"
                },
                {
                    "dt": 1587459600,
                    "main": {
                        "temp": 16.31,
                        "feels_like": 15.29,
                        "temp_min": 16.31,
                        "temp_max": 16.31,
                        "pressure": 1004,
                        "sea_level": 1004,
                        "grnd_level": 1004,
                        "humidity": 90,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 501,
                            "main": "Rain",
                            "description": "moderate rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 3.59,
                        "deg": 312
                    },
                    "rain": {
                        "3h": 5.12
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-21 09:00:00"
                },
                {
                    "dt": 1587470400,
                    "main": {
                        "temp": 16.93,
                        "feels_like": 16.5,
                        "temp_min": 16.93,
                        "temp_max": 16.93,
                        "pressure": 1006,
                        "sea_level": 1006,
                        "grnd_level": 1005,
                        "humidity": 87,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 501,
                            "main": "Rain",
                            "description": "moderate rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 2.8,
                        "deg": 330
                    },
                    "rain": {
                        "3h": 4
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-21 12:00:00"
                },
                {
                    "dt": 1587481200,
                    "main": {
                        "temp": 17.09,
                        "feels_like": 16.43,
                        "temp_min": 17.09,
                        "temp_max": 17.09,
                        "pressure": 1007,
                        "sea_level": 1007,
                        "grnd_level": 1007,
                        "humidity": 86,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 3.11,
                        "deg": 291
                    },
                    "rain": {
                        "3h": 1.65
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-21 15:00:00"
                },
                {
                    "dt": 1587492000,
                    "main": {
                        "temp": 16.59,
                        "feels_like": 14.41,
                        "temp_min": 16.59,
                        "temp_max": 16.59,
                        "pressure": 1009,
                        "sea_level": 1009,
                        "grnd_level": 1008,
                        "humidity": 87,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 99
                    },
                    "wind": {
                        "speed": 5.13,
                        "deg": 296
                    },
                    "rain": {
                        "3h": 0.48
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-21 18:00:00"
                },
                {
                    "dt": 1587502800,
                    "main": {
                        "temp": 15.93,
                        "feels_like": 14.36,
                        "temp_min": 15.93,
                        "temp_max": 15.93,
                        "pressure": 1011,
                        "sea_level": 1011,
                        "grnd_level": 1010,
                        "humidity": 88,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 803,
                            "main": "Clouds",
                            "description": "broken clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 83
                    },
                    "wind": {
                        "speed": 4.02,
                        "deg": 326
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-21 21:00:00"
                },
                {
                    "dt": 1587513600,
                    "main": {
                        "temp": 15.44,
                        "feels_like": 13.71,
                        "temp_min": 15.44,
                        "temp_max": 15.44,
                        "pressure": 1012,
                        "sea_level": 1012,
                        "grnd_level": 1011,
                        "humidity": 90,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 803,
                            "main": "Clouds",
                            "description": "broken clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 74
                    },
                    "wind": {
                        "speed": 4.19,
                        "deg": 323
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-22 00:00:00"
                },
                {
                    "dt": 1587524400,
                    "main": {
                        "temp": 14.3,
                        "feels_like": 12.96,
                        "temp_min": 14.3,
                        "temp_max": 14.3,
                        "pressure": 1011,
                        "sea_level": 1011,
                        "grnd_level": 1010,
                        "humidity": 92,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 801,
                            "main": "Clouds",
                            "description": "few clouds",
                            "icon": "02n"
                        }
                    ],
                    "clouds": {
                        "all": 22
                    },
                    "wind": {
                        "speed": 3.25,
                        "deg": 311
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-22 03:00:00"
                },
                {
                    "dt": 1587535200,
                    "main": {
                        "temp": 15.31,
                        "feels_like": 14.67,
                        "temp_min": 15.31,
                        "temp_max": 15.31,
                        "pressure": 1011,
                        "sea_level": 1011,
                        "grnd_level": 1011,
                        "humidity": 89,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 801,
                            "main": "Clouds",
                            "description": "few clouds",
                            "icon": "02d"
                        }
                    ],
                    "clouds": {
                        "all": 18
                    },
                    "wind": {
                        "speed": 2.48,
                        "deg": 349
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-22 06:00:00"
                },
                {
                    "dt": 1587546000,
                    "main": {
                        "temp": 18.3,
                        "feels_like": 17.29,
                        "temp_min": 18.3,
                        "temp_max": 18.3,
                        "pressure": 1012,
                        "sea_level": 1012,
                        "grnd_level": 1012,
                        "humidity": 72,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 802,
                            "main": "Clouds",
                            "description": "scattered clouds",
                            "icon": "03d"
                        }
                    ],
                    "clouds": {
                        "all": 42
                    },
                    "wind": {
                        "speed": 2.85,
                        "deg": 354
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-22 09:00:00"
                },
                {
                    "dt": 1587556800,
                    "main": {
                        "temp": 19.76,
                        "feels_like": 18.08,
                        "temp_min": 19.76,
                        "temp_max": 19.76,
                        "pressure": 1012,
                        "sea_level": 1012,
                        "grnd_level": 1011,
                        "humidity": 65,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 69
                    },
                    "wind": {
                        "speed": 3.72,
                        "deg": 16
                    },
                    "rain": {
                        "3h": 0.16
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-22 12:00:00"
                },
                {
                    "dt": 1587567600,
                    "main": {
                        "temp": 17.93,
                        "feels_like": 14.36,
                        "temp_min": 17.93,
                        "temp_max": 17.93,
                        "pressure": 1011,
                        "sea_level": 1011,
                        "grnd_level": 1010,
                        "humidity": 76,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 6.73,
                        "deg": 29
                    },
                    "rain": {
                        "3h": 0.24
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-22 15:00:00"
                },
                {
                    "dt": 1587578400,
                    "main": {
                        "temp": 15.21,
                        "feels_like": 12.52,
                        "temp_min": 15.21,
                        "temp_max": 15.21,
                        "pressure": 1012,
                        "sea_level": 1012,
                        "grnd_level": 1011,
                        "humidity": 86,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 5.12,
                        "deg": 37
                    },
                    "rain": {
                        "3h": 0.1
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-22 18:00:00"
                },
                {
                    "dt": 1587589200,
                    "main": {
                        "temp": 15,
                        "feels_like": 14.39,
                        "temp_min": 15,
                        "temp_max": 15,
                        "pressure": 1013,
                        "sea_level": 1013,
                        "grnd_level": 1013,
                        "humidity": 84,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 100
                    },
                    "wind": {
                        "speed": 1.89,
                        "deg": 14
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-22 21:00:00"
                },
                {
                    "dt": 1587600000,
                    "main": {
                        "temp": 13.8,
                        "feels_like": 11.83,
                        "temp_min": 13.8,
                        "temp_max": 13.8,
                        "pressure": 1013,
                        "sea_level": 1013,
                        "grnd_level": 1012,
                        "humidity": 90,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 804,
                            "main": "Clouds",
                            "description": "overcast clouds",
                            "icon": "04n"
                        }
                    ],
                    "clouds": {
                        "all": 92
                    },
                    "wind": {
                        "speed": 3.78,
                        "deg": 341
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-23 00:00:00"
                },
                {
                    "dt": 1587610800,
                    "main": {
                        "temp": 13.74,
                        "feels_like": 11.68,
                        "temp_min": 13.74,
                        "temp_max": 13.74,
                        "pressure": 1013,
                        "sea_level": 1013,
                        "grnd_level": 1012,
                        "humidity": 88,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 802,
                            "main": "Clouds",
                            "description": "scattered clouds",
                            "icon": "03n"
                        }
                    ],
                    "clouds": {
                        "all": 32
                    },
                    "wind": {
                        "speed": 3.74,
                        "deg": 341
                    },
                    "sys": {
                        "pod": "n"
                    },
                    "dt_txt": "2020-04-23 03:00:00"
                },
                {
                    "dt": 1587621600,
                    "main": {
                        "temp": 14.94,
                        "feels_like": 12.62,
                        "temp_min": 14.94,
                        "temp_max": 14.94,
                        "pressure": 1014,
                        "sea_level": 1014,
                        "grnd_level": 1013,
                        "humidity": 84,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 44
                    },
                    "wind": {
                        "speed": 4.31,
                        "deg": 20
                    },
                    "rain": {
                        "3h": 0.47
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-23 06:00:00"
                },
                {
                    "dt": 1587632400,
                    "main": {
                        "temp": 16.7,
                        "feels_like": 13.46,
                        "temp_min": 16.7,
                        "temp_max": 16.7,
                        "pressure": 1014,
                        "sea_level": 1014,
                        "grnd_level": 1014,
                        "humidity": 74,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 77
                    },
                    "wind": {
                        "speed": 5.53,
                        "deg": 30
                    },
                    "rain": {
                        "3h": 0.65
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-23 09:00:00"
                },
                {
                    "dt": 1587643200,
                    "main": {
                        "temp": 18.24,
                        "feels_like": 14.12,
                        "temp_min": 18.24,
                        "temp_max": 18.24,
                        "pressure": 1015,
                        "sea_level": 1015,
                        "grnd_level": 1014,
                        "humidity": 65,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 60
                    },
                    "wind": {
                        "speed": 6.57,
                        "deg": 24
                    },
                    "rain": {
                        "3h": 0.31
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-23 12:00:00"
                },
                {
                    "dt": 1587654000,
                    "main": {
                        "temp": 18.01,
                        "feels_like": 13.36,
                        "temp_min": 18.01,
                        "temp_max": 18.01,
                        "pressure": 1015,
                        "sea_level": 1015,
                        "grnd_level": 1014,
                        "humidity": 62,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 500,
                            "main": "Rain",
                            "description": "light rain",
                            "icon": "10d"
                        }
                    ],
                    "clouds": {
                        "all": 16
                    },
                    "wind": {
                        "speed": 6.95,
                        "deg": 14
                    },
                    "rain": {
                        "3h": 0.1
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-23 15:00:00"
                },
                {
                    "dt": 1587664800,
                    "main": {
                        "temp": 14.9,
                        "feels_like": 11.98,
                        "temp_min": 14.9,
                        "temp_max": 14.9,
                        "pressure": 1016,
                        "sea_level": 1016,
                        "grnd_level": 1015,
                        "humidity": 75,
                        "temp_kf": 0
                    },
                    "weather": [
                        {
                            "id": 800,
                            "main": "Clear",
                            "description": "clear sky",
                            "icon": "01d"
                        }
                    ],
                    "clouds": {
                        "all": 9
                    },
                    "wind": {
                        "speed": 4.43,
                        "deg": 3
                    },
                    "sys": {
                        "pod": "d"
                    },
                    "dt_txt": "2020-04-23 18:00:00"
                }
            ],
            "city": {
                "id": 2468625,
                "name": "Mutuelleville",
                "coord": {
                    "lat": 36.835,
                    "lon": 10.1647
                },
                "country": "TN",
                "timezone": 3600,
                "sunrise": 1587184842,
                "sunset": 1587232565
            }
        };*/

        return res.status(200).json({status: "ok", message: {weither :h , UVforcast : uv}});
    } catch (e) {
        console.log('here 5');
        return res.status(400).json({status: "err", message: e.toString()});
    }
});
function getWeither(long,lat ) {
    return new Promise(function (resolve, reject) {
        let data = '';
        let data1 = '';
        // GET parameters
        const parameters = {
            appid: process.env.key,
            lat: lat,//36.717199016072186
            lon: long,//10.215536125104649
            units: 'metric'
        };

// GET parameters as query string : "?id=123&type=post"
        const get_request_args = querystring.stringify(parameters);
        var options = {
            host : 'api.openweathermap.org',
            path:  '/data/2.5/forecast?'+get_request_args,
            json: true,
            headers: {
                "content-type": "application/json",
                "accept": "application/json"
            },
        }

        // api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={your api key}    process.env.token_Key
        https.get(options,(resp) => {


            // A chunk of data has been recieved.
            resp.on('data', (chunk) => {
                data += chunk;
            });
            //console.log('here 2');
            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                //console.log(JSON.parse(data).explanation);
                data1 = JSON.parse(data);
                resolve(data1);
            });
            //console.log('here 3');
        }).on("error", (err) => {
            console.log("Error: " + err.message + err.code);
            reject(err.message)
        });
    });
}
function getUV(long,lat ) {
    try {
        return new Promise(function (resolve, reject) {
            let data = '';
            let data1 = '';
            // GET parameters
            const parameters = {
                appid: process.env.key,
                lat: lat,//36.717199016072186
                lon: long,//10.215536125104649
            };

// GET parameters as query string : "?id=123&type=post"
            const get_request_args = querystring.stringify(parameters);
            var options = {
                host: 'api.openweathermap.org',
                path: '/data/2.5/uvi/forecast?' + get_request_args,
                json: true,
                headers: {
                    "content-type": "application/json",
                    "accept": "application/json"
                },
            }

            // api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={your api key}    process.env.token_Key
            https.get(options, (resp) => {


                // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                //console.log('here 2');
                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    console.log(JSON.parse(data).explanation);
                    data1 = JSON.parse(data);
                    resolve(data1);
                });
                //console.log('here 3');
            }).on("error", (err) => {
                console.log("Error: " + err.message + err.code);
                reject(err.message)
            });
        });
    } catch (e) {
        console.log('getUV :',e.toString());
    }
}

/******************************* socket io ****************************************/
const chat = io
    .of('/dashboard/IrrigationState')
    .on('connection', (socket) => {
        socket.on('getdata', async (message) => {
            //console.log('message hello ',message);
            //console.log('getdata', await getIrrigationState(message.LocationId, message.Accesstoken));
            socket.emit('getdata',  await getIrrigationState(message.LocationId, message.Accesstoken));
        });

        socket.on('changedata', (message) => {
            //console.log('change data');
            ChangeIrrigationState(message.LocationId , message.Accesstoken, message.NewState);
        });
    });
Notification = [];
const notif = io
    .of('/dashboarddddddd/Notification')
    .on('connection', (socket) => {
        // socket.emit('getNotification', 'hello notification' );
        //console.log('notiy ' , socket.id);
        //console.log('Notification ' , Notification);
        socket.on('getNotification', async (message) => {
            console.log('get notification message',message);
            //console.log('getChartdata', socket.id);
            //console.log('SocketClients length ', SocketClients.length);
            if (Notification.length === 0)
            {
                //console.log('create 1');
                let clientInfo = {};
                clientInfo.socketId = socket.id;
                clientInfo.token = message.Accesstoken;
                clientInfo.UserId = message.UserId;
                Notification.push(clientInfo);
            } else
            {
                let exist = false;
                Notification.forEach(item => {
                    if (item.socketId === socket.id)
                    {
                        console.log('Socket Exists');
                    }
                });
                if (exist === false)
                {
                    console.log('create 2');
                    let clientInfo = {};
                    clientInfo.socketId = socket.id;
                    clientInfo.token = message.Accesstoken;
                    clientInfo.UserId = message.UserId;
                    Notification.push(clientInfo);
                }
            }
            console.log('Notification Clients' , Notification);
            // socket.emit('getNotification', 'hello notification' );
        });
        socket.on('getNotification', (message) => {
            //console.log('change data');
        });
        socket.on('disconnectNotification', (message) => {
            console.log('disconnectNotification' , message);
            let i = 0;
            /*
            Notification.forEach(item => {
                if (item.socketId === socket.id)
                    Notification.splice(i,1);
                i++;
            })*/
        });
        socket.on('disconnect', (message) => {
            //console.log('disconnect' , message);
            let i = 0;
            Notification.forEach(item => {
                if (item.socketId === socket.id)
                    Notification.splice(i,1);
                i++;
            })
        });
    });

async function ChangeIrrigationState(LocationId, AccessToken, NewState) {
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
    user = await User.findById(decoded.payload.id);
    if (!user) {
        console.log('empty user ', user.toString());
        return;
    }
    locationss = await Location.findById(LocationId);
    if (!locationss) {
        console.log('empty locationss ', locationss.toString());
        return;
    }
    locationss.AutomaticIrrigation = NewState;
    await locationss.save();
}
async function getIrrigationState(LocationId, AccessToken) {
    return new Promise(async function(resolve, reject) {
        if (LocationId === 'none here')
        {
            reject(new Error('no location Id'));
        }
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
function NotifyUser(UserId, data) {
    console.log("UserId" , UserId);
    /****
     * data {
     * icon: 'info','warning',error,success
      title: 'Oops...',
      text: 'resJSON.message,'
      }
     * *******/
    if (!UserId)
    {return;}
    //generate token
    Notification.forEach(item => {
        console.log('item ', item);
        console.log('Notification ', UserId);
        if (item.UserId === UserId) {
            console.log('Needs Update');
            console.log('socket id ' , item.socketId);
            console.log('new data' , data);
            notif.to(item.socketId).emit('getNotification', data);
            // console.log('state' , state);
            // socket.emit('getNotification', 'hello notification' );
        }
    });
}
function EmailUser(Email, data) {
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.Mailer_email,
            pass: process.env.Mailer_pass
        }
    });

    var mailOptions = {
        from: 'SmartIrrigation',
        to: 'fouzai.alaa@gmail.com',
        subject: 'Smart Irrigation',
        text: 'hello555'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}
module.exports = router;
