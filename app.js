require('dotenv').config()
const express = require('express')
const app = express()
app.use(express.json())
app.use(express.urlencoded({extended:false}))

const mongoose = require('mongoose')

const { promisify} = require('util')
const redis = require('redis')
const redisClient = redis.createClient()

redisClient.on('connect',()=>{
    console.log('Connected to Redis')
})
redisClient.on('error',()=>{
    console.log('error')
})

mongoose.connect(process.env.MONGOURL,({useNewUrlParser: true , useUnifiedTopology: true}),(err)=>{
    if (!err) console.log('Connected to Mongo')
})

const itemSchema = mongoose.Schema({
    name:{
        type:String,
        required:true
    }
})

const Item = mongoose.model('items',itemSchema)


let rGet = promisify(redisClient.get).bind(redisClient)
let rSet = promisify(redisClient.set).bind(redisClient)
let rDel = promisify(redisClient.del).bind(redisClient)

app.get('/items',async (req,res) => {
    let items
        items = await rGet('Items')
    
    if (items) return res.json({from:'Redis',data:JSON.parse(items)})

    try {
        items = await Item.find()
    } catch (e) {
        return res.json('Error while get all items')
    }

    try {
        await rSet('Items',JSON.stringify(items))
    } catch (e) {
        return res.json('Error while saving all items to Redis')
    }
   
    return res.json({from:'Mongo',data:items})

    
})


// app.get('/:id',async (req,res) => {
//     const {id} = req.params

//    const redisData = await rGet(id)
//    let text = JSON.parse(redisData)
//    res.json(text)

// })

// app.post('/add/:id',async (req,res) => {

//     const {id} = req.params
//     const {name,age} = req.query

//     if (!name||!age) return res.status(500).json({status:'Fail',message:'name and age are required'})
//     let fakeData = {
//         user:id,
//         name:name,
//         age:age
//     }


//     try {
//         const redisAdd = await rSet(id,JSON.stringify(fakeData))
//         return res.json(redisAdd)
//     } catch (e){
//         return res.json(e)
//     }

// })

app.del('/del/:id',async (req,res) => {
    
    const {id} = req.params

    try {
        const redisDel= await rDel(`${id}`)
        return res.json(redisDel)
    } catch (e){
        return res.json(e)
    }

})

app.listen(process.env.PORT,()=>console.log('Server is running'))