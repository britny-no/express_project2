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

const checkPayCondition = (pay_update: number, salePriceCount: number, salePriceCount2: number, saleCheck: boolean) => {
    switch(pay_update){
        case 0:
            return salePriceCount+salePriceCount2 === 0
        case 1:
            return salePriceCount > 0 && salePriceCount2 === 0 && saleCheck
        case 2:
            return salePriceCount > 0 && salePriceCount2 > 0 && saleCheck
        default:
            return false
    }

}




const Filter: Record<string, Function> = {
    checkPayCondition
};
export default Filter
