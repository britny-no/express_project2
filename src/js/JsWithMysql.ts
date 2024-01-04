import { Module } from "../Module";
import Mysql from "../mysql/Etc";


const {dotenv, path, cacheManager} = Module


// const mysql_car = require('../mysql/car')

// config
dotenv.config({ path: path.normalize(__dirname+'/../../.env') });
const memoryCache = cacheManager.caching({store: 'memory', ttl: 18000/*seconds*/})

interface selectReqCarResult {
    status: number, 
    car_number: string, 
    car_name: string
}

interface StringStringOb {
    [key: string] : string
}


const getCacheKey = (name: string) => new Promise<string>(async (resolve, reject) => {
    try{
        const login_key = await memoryCache.get(`${name}_key`)
        if(login_key){
            resolve(login_key)
        } else {
            const key = await Mysql.getKey(name)
            await memoryCache.set(`${name}_key`, key)
            resolve(key)
        }   
    }catch(err){
        reject(err)
    }
})




const JsWithMysql: Record<string, Function> = {
    getCacheKey,

};
export default JsWithMysql

