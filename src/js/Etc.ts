import { Module } from "../Module";
import MemjsClient from "../lib/Memjs"
import MysqlPool from '../lib/Db';

const { fs, path, crypto, jwt, dotenv, cacheManager, cryptoJs, sanitizeHtml, seoulMoment } = Module



// config
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 18000/*seconds*/ })
dotenv.config({ path: path.normalize(__dirname + '/../../.env') });

const { MODE, JWT_COLUMN_SECRET, CRYPTO_SECRET, EXPOSURE_SECRET } = process.env

//interface
interface JwtResult {
    data: string;
    iat: number;
    exp: number;
    loginToken: string
}

const checkSaleInfo = (body: Record<string, number>) => {
    const {
        step_count, down_ratio, rest_ratio,
        step_1_ratio,  step_2_ratio, step_3_ratio,  step_4_ratio,  step_5_ratio, 
        step_6_ratio,  step_7_ratio,  step_8_ratio,  step_9_ratio,  step_10_ratio,
    } = body
    const maxCount = Number(step_count)
    const arr = [
        step_1_ratio,  step_2_ratio, step_3_ratio,  step_4_ratio,  step_5_ratio, 
        step_6_ratio,  step_7_ratio,  step_8_ratio,  step_9_ratio,  step_10_ratio,
    ]

    let result = Number(down_ratio) + Number(rest_ratio)
    for(let i = 0; i < maxCount; i++){
        result += Number(arr[i])
    }

    return result === 100

}

const checkUpdateResult = (arr: {affectedRows: number, insertId: number}[], updateC: number, insertC: number) => {
    for(let i = 0, len = arr.length; i < len; i++){
        const {affectedRows, insertId} = arr[i]
        const order = i + 1
        const isitUpdate = order <= updateC
        if((isitUpdate && affectedRows === 0) || (!isitUpdate && order <= insertC && insertId === 0 )){
            return false
        }
    }
    return true
}

const checkInsertResult = (arr: {insertId: number}[]) => {
    for(let i = 0, len = arr.length; i < len; i++){
        if(arr[i].insertId !== 0){
            return false
        }
    }
    return true
}


const ETC: Record<string, Function> = {
    checkSaleInfo,
    checkUpdateResult,
    checkInsertResult
};
export default ETC
