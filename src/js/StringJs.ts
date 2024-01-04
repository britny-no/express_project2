import { Module } from "../Module";
import MemjsClient from "../lib/Memjs"
import MysqlPool from '../lib/Db';

const { fs, path, jwt, dotenv, cacheManager, cryptoJs, sanitizeHtml } = Module


// config
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 18000/*seconds*/ })
dotenv.config({ path: path.normalize(__dirname + '/../../.env') });

const { MODE, JWT_COLUMN_SECRET, CRYPTO_SECRET } = process.env

const arrayToSting = (arr: any) => {
    if(arr.length !== 0){
        if (arr[arr.length - 1].replace(/ /gi, '') === '') {
            arr = arr.slice(0, arr.length - 1)
        }
    
        let result = ''
        for (let i = 0, len = arr.length; i < len; i++) {
            if (i === 0) {
                result = `${arr[i]}`
            } else {
                result = result + `,${arr[i]}`
            }
        }
    
        return result
    }else{
        return null
    }
}

const arrayToStingNum = (arr: any) => {
    if(arr.length !== 0){    
        let result = ''
        for (let i = 0, len = arr.length; i < len; i++) {
            if (i === 0) {
                result = `${arr[i]}`
            } else {
                result = result + `,${arr[i]}`
            }
        }
    
        return result
    }else{
        return null
    }
}

const arrayToStingString = (arr: any) => {
    if(arr.length !== 0){    
        let result = ''
        for (let i = 0, len = arr.length; i < len; i++) {
            if (i === 0) {
                result = `"${arr[i]}"`
            } else {
                result = result + `,"${arr[i]}"`
            }
        }
    
        return result
    }else{
        return null
    }
}

const objectToArray = (ob: any) => {
    try{
        const key = Object.keys(ob)

        if(key.length !== 0){
            return key.map(v => {
                return ob[v]
            })
        }else{
            return []
        }
    }catch(err){
        return []
    }   
} 


const orderConstruction = (origin: string, target: string) => {
    // origin 없을때
    // or
    // origin 있고, target 없을때
    // origin 있고, target 있을때때
    if (origin) {
        const originArr = origin.split(',').map( v => v.replace(' ', ''))
        if (originArr.includes(target)) {
            const arr = originArr.filter(v => v !== target)
            arr.unshift(target)

            return arrayToSting(arr)
        } else {
            return `${origin}, ${target}`
        }
    } else {
        return String(target)
    }
}

const orderConstructionReadOnly = (origin: string, target: string) => {
    // origin 없을때
    // origin 있고, target 없을때
    // origin 있고, target 있을때때
    if (origin) {
        const originArr = origin.split(',').map( v => v.replace(' ', ''))
        if (originArr.includes(target)) {
            const arr = originArr.filter(v => v !== target)
            arr.unshift(target)

            return arrayToSting(arr)
        } else {
            return `${origin}`
        }
    } else {
        return ''
    }
}

const filterConstruction = (origin: string, target: string) => {
    if (origin) {
        const originArr = origin.split(',').map( v => v.replace(' ', ''))
        const arr = originArr.filter(v => v !== target)
        return arrayToSting(arr)
    } else {
        return String(target)
    }
}

//특정 문자 갯수 찾기
const countCharact = (text: string, searchChar: string) => {
    let count = 0;
    let pos = text.indexOf(searchChar);

    while (pos !== -1) {
        count++;
        pos = text.indexOf(searchChar, pos + 1);
    }
    return count
}

const generateConstrucionSite = (token_v: string, db_v: string) => {
    // db값과 현재 token 값이 같은지 확인
    // db값은 있는데 token 값은 없을수 있음
    // token값이 갱신이 안되어 있으면 true return
    // routes에서 token_v && db_v 체크함
    const token_arr = token_v.split(',').map(v => Number(v.replace(' ', '')))
    const db_arr = db_v.split(',').map(v => Number(v.replace(' ', '')))

    let result = token_v;
    db_arr.filter(v => !token_arr.includes(v)).forEach(v => {
        result += `, ${v}`
    })
    return result
}

const obToArray = (ob: Record<string, string>) => Object.keys(ob).map(v => ob[v])


const StringJs: Record<string, Function> = {
    arrayToSting,
    arrayToStingNum,
    arrayToStingString,
    objectToArray,
    orderConstruction,
    orderConstructionReadOnly,
    filterConstruction,
    generateConstrucionSite,
    obToArray
};

export default StringJs
