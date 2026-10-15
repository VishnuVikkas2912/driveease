import express from 'express'; import cors from 'cors'; import 'dotenv/config';
import auth from './routes/auth.js'; import vehicles from './routes/vehicles.js'; import bookings from './routes/bookings.js'; import admin from './routes/admin.js';
const app=express();
const allowedOrigins = process.env.CLIENT_URL?.split(',').map((value) => value.trim()).filter(Boolean) || [];
app.use(cors({ origin: (origin, done) => !origin || /^http:\/\/localhost:\d+$/.test(origin) || allowedOrigins.includes(origin) ? done(null, true) : done(new Error('Origin is not allowed.') ) }));
app.use(express.json());
app.get('/api/health',(req,res)=>res.json({status:'ok'}));app.use('/api/auth',auth);app.use('/api/vehicles',vehicles);app.use('/api/bookings',bookings);app.use('/api/admin',admin);
app.use((err,req,res,next)=>{console.error(err);res.status(err.code==='23505'?409:500).json({message:err.code==='23505'?'That record already exists.':'Unexpected server error.'});});
app.listen(process.env.PORT||5000,()=>console.log(`DriveEase API running on ${process.env.PORT||5000}`));
