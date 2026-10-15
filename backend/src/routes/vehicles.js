import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/', asyncHandler(async (req,res) => {
  const { type, brand, fuel, transmission, maxPrice, pickupDate, dropoffDate } = req.query;
  const where=["v.status='AVAILABLE'"], params=[];
  const add = (clause, value) => { params.push(value); where.push(clause.replace('?', `$${params.length}`)); };
  for (const [col,val] of [['vehicle_type',type],['brand',brand],['fuel_type',fuel],['transmission',transmission]]) if(val)add(`v.${col}=?`,val);
  if(maxPrice)add('v.price_per_day<=?',Number(maxPrice));
  if(pickupDate && dropoffDate) {
    const drop = `$${params.length+1}`, pick = `$${params.length+2}`; params.push(dropoffDate,pickupDate);
    where.push(`NOT EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id=v.vehicle_id AND b.booking_status IN ('PENDING','APPROVED') AND b.pickup_date < ${drop} AND b.dropoff_date > ${pick})`);
    where.push(`NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.vehicle_id=v.vehicle_id AND m.maintenance_status IN ('SCHEDULED','IN_PROGRESS') AND m.start_date < ${drop} AND COALESCE(m.end_date,DATE '9999-12-31') > ${pick})`);
  }
  const { rows }=await pool.query(`SELECT v.*, MIN(i.image_url) image_url, ROUND(AVG(r.rating),1) rating FROM vehicles v LEFT JOIN vehicle_images i ON i.vehicle_id=v.vehicle_id LEFT JOIN reviews r ON r.vehicle_id=v.vehicle_id WHERE ${where.join(' AND ')} GROUP BY v.vehicle_id ORDER BY v.created_at DESC`,params);
  res.json(rows);
}));
router.get('/:id', asyncHandler(async(req,res)=>{
  const { rows:[vehicle] } = await pool.query(`SELECT v.*,MIN(i.image_url) image_url,ROUND(AVG(r.rating),1) rating,COUNT(r.review_id) review_count FROM vehicles v LEFT JOIN vehicle_images i ON i.vehicle_id=v.vehicle_id LEFT JOIN reviews r ON r.vehicle_id=v.vehicle_id WHERE v.vehicle_id=$1 GROUP BY v.vehicle_id`,[req.params.id]);
  if(!vehicle)return fail(res,404,'Vehicle not found.');
  const { rows:reviews }=await pool.query('SELECT r.*,u.name FROM reviews r JOIN users u ON u.user_id=r.user_id WHERE r.vehicle_id=$1 ORDER BY review_date DESC',[req.params.id]);
  res.json({...vehicle,reviews});
}));
router.post('/',requireAuth,requireAdmin,asyncHandler(async(req,res)=>{const v=req.body; const {rows:[r]}=await pool.query('INSERT INTO vehicles (vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING vehicle_id',[v.vehicleNumber,v.brand,v.model,v.vehicleType,v.year,v.fuelType,v.transmission,v.pricePerDay,v.status||'AVAILABLE']); if(v.imageUrl)await pool.query('INSERT INTO vehicle_images(vehicle_id,image_url) VALUES($1,$2)',[r.vehicle_id,v.imageUrl]);res.status(201).json({vehicleId:r.vehicle_id});}));
router.put('/:id',requireAuth,requireAdmin,asyncHandler(async(req,res)=>{const v=req.body;await pool.query('UPDATE vehicles SET brand=$1,model=$2,vehicle_type=$3,year=$4,fuel_type=$5,transmission=$6,price_per_day=$7,status=$8 WHERE vehicle_id=$9',[v.brand,v.model,v.vehicleType,v.year,v.fuelType,v.transmission,v.pricePerDay,v.status,req.params.id]);res.json({message:'Vehicle updated.'});}));
router.delete('/:id',requireAuth,requireAdmin,asyncHandler(async(req,res)=>{await pool.query("UPDATE vehicles SET status='RETIRED' WHERE vehicle_id=$1",[req.params.id]);res.json({message:'Vehicle retired.'});}));
export default router;
