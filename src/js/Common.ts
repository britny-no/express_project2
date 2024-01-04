import { Module } from "../Module";
import MemjsClient from "../lib/Memjs"
import MysqlPool from '../lib/Db';

const { fs, path, crypto, jwt, dotenv, cacheManager, cryptoJs, sanitizeHtml, seoulMoment } = Module


// config
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 18000/*seconds*/ })
dotenv.config({ path: path.normalize(__dirname + '/../../.env') });

const { MODE, JWT_COLUMN_SECRET, CRYPTO_SECRET, EXPOSURE_SECRET, NICE_COOKIE_KEY, NICE_JWT_SECRET } = process.env

//interface
interface JwtResult {
    data: string;
    iat: number;
    exp: number;
    loginToken: string
}

const resError = (res: any, err: unknown) => {
    if (err instanceof Array) return res.status(err[0]).json({ errcode: -1, msg: err[1] })
    else if (err instanceof Error) return res.status(500).json({ errcode: -1, msg: err.message });
    else return res.status(500).json({ errcode: -1, msg: '관리자에게 문의해주세요' });
}

const setBlockIp = (info: Record<string, string | number>) => {
    const { blocked_ip, client_ip, mem_max } = info
    const added_ip = blocked_ip + ` ,${client_ip}`
    const ip_list = added_ip.length > mem_max ? Common.findShimpAndSlice(added_ip, mem_max) : added_ip
    MemjsClient.set("blocked_ip", ip_list, { expires: 60 * 60 * 60 }, async (err: any, val: any) => {
        if (err) {
            //로그 남기거나 메일 전송
            console.log('?')
        }
    })
}

// 스트링 기준으로 길이 1mb 넘으면 맨 앞 삭제, 맨 앞 삭제시 그래도 넘으면 또 삭제
// 1mb에서 include 하면 오래 안걸리나? 시간 복잡도가 o(n)이기에 max를 5kb로 설정
const findShimpAndSlice = (target: string, max: number) => {
    let result = target
    while (result.length >= max) {
        let i = 0, len = result.length;
        for (i = 0; i < len; i++) {
            if (result[i] === ",") {
                break
            }
        }
        result = result.slice(i + 1, result.length)
    }

    return result
}

const writeLog = (path: string, data: string, callback = () => { }) => {
    fs.open(path, "a", (err: string, fd: string) => {
        if (err) {
            console.log(err)
        }
        fs.appendFile(path, '\n' + seoulMoment().format("YYYY-MM-DD hh:mm:ss") + '  ' + data, function (err: string) {
            if (err) throw err;
            callback()
            return
        });
    })
}

//기획된 쿼리 내역(갯수, 이름)으로  들어오는지 확인
const checkParameter = (body: Record<string, string>, query_arr: Array<string>) => {
    const query_arr_length = query_arr.length, query_type = ['string', 'number']
    let delete_count = query_arr_length

    // 약속된 길이만큼 들어오지 않은 경우
    if (Object.keys(body).length !== query_arr_length) {
        return false
    }

    for (let i = 0; i < query_arr_length; i++) {
        const query_arr_key: string | number = query_arr[i], query_value = body[query_arr_key]

        // 개발모드일 경우
        if (MODE === 'DEV' && query_arr_key === 'loginToken') {
            delete_count -= 1
            continue
            // 배포일 경우. 약속된 키가 아니거나 || 값이 예상치 못한 경우거나
        } else if (query_value === undefined || (query_type.indexOf(typeof query_value) !== -1 && sanitizeHtml(query_value) === '')) {
            console.log('$$$$$$$')
            console.log(query_arr_key, sanitizeHtml(query_value))
            break;
        }

        delete_count -= 1
    }

    return delete_count === 0
}


const checkJwt = (token: string, body: { [key: string]: string }) => {
    return jwt.verify(token, process.env.JWT_SECRET, function (err: string, decoded: JwtResult) {
        let result = true

        if (err) {
            result = false
        } else {
            if (MODE === 'DEPLOY') {
                decoded.loginToken !== body.loginToken ? result = false : null
            }
        }
        return result
    });
}

const checkPass = async (req: any) => {
    const cookie = req.cookies[NICE_COOKIE_KEY || ""]
    if(cookie){
        const cookieV = await Common.bidirectionalDecrypted(cookie)
        return jwt.verify(cookieV, NICE_JWT_SECRET, function (err: string, decoded: JwtResult) {
            return err ? false : decoded
        });
    }else{
        return false
    }
}

const passwordConvert = (target: string, salt: string) => new Promise((resolve, reject) => {
    crypto.pbkdf2(target, salt, 100000, 64, 'sha512', (err: string, key: any) => {
        if (err) {
            reject(err)
        }
        resolve(key.toString('base64'))
    });
});


// bidirectionalEncrypted
const bidirectionalEncrypted = (data: string) => cryptoJs.AES.encrypt(data, CRYPTO_SECRET).toString();

// bidirectionalDecrypted
const bidirectionalDecrypted = (data: string) => new Promise((resolve, reject) => {
    const result = cryptoJs.AES.decrypt(data, CRYPTO_SECRET).toString(cryptoJs.enc.Utf8);
    result !== '' ? resolve(result) : reject('잘못된 요청입니다')
})

// bidirectionalEncrypted
const exposureEncrypted = (data: string) => cryptoJs.AES.encrypt(data, EXPOSURE_SECRET).toString();

// bidirectionalDecrypted
const exposureDecrypted = (data: string) => new Promise((resolve, reject) => {
    const result = cryptoJs.AES.decrypt(data, EXPOSURE_SECRET).toString(cryptoJs.enc.Utf8);
    result !== '' ? resolve(result) : reject('잘못된 요청입니다')
})

const jwtColumnEncrypted = (data: string) => cryptoJs.AES.encrypt(data, JWT_COLUMN_SECRET).toString();

const jwtColumnDecrypted = (data: string) => cryptoJs.AES.decrypt(data, JWT_COLUMN_SECRET).toString(cryptoJs.enc.Utf8);

const getDecryptedTableOb = (jwtOb: Record<string, string>) => {
    if(jwtOb.tableOb){
        const targetOb =  jwtColumnDecrypted(jwtOb.tableOb)
        const isitNull = targetOb === '{}'
    
        return isitNull ? null : JSON.parse(targetOb)
    }else{
        return null
    }
}


const filterLastChar = (target: string, char: string) => {
    if (target[target.length - 1] === char) {
        return target.slice(0, target.length - 1)
    } else {
        return target
    }
}

const decryptMessage = (encryptedMessage: string, privateKey: string) => {
    try {
        const rsaPrivateKey = {
            key: privateKey,
            passphrase: '',
            padding: crypto.constants.RSA_PKCS1_PADDING,
        };

        const decryptedMessage = crypto.privateDecrypt(
            rsaPrivateKey,
            Buffer.from(encryptedMessage, 'base64'),
        );
        return decryptedMessage.toString('utf8');

    } catch (err) {
        return false
    }
}

const returnRestTime = (jwtOb: JwtResult) => {
    // jwt의 exp은 NumericDate, valueOf는 timestamp 리턴
    // 자릿수가 세자리 차이나는데, 1000곱이 아닌 현재 시간의 끝 세자리로 exp 채움
    // 1000곱시 한번 요청시 exp 시간이 1초씩 줄어들음
    const nowTime  = seoulMoment().valueOf()
    const expTimeS = String(jwtOb.exp), nowTimeS = String(nowTime)
    const expData = Number(expTimeS+nowTimeS.slice(nowTimeS.length - 3, nowTimeS.length))

    return Math.floor(seoulMoment(expData) - nowTime)
}

const generatePw = (pw: string) => new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err: string, buf: any) => {
        if (err) {
            reject('에러 발생')
        }else{
            const salt = buf.toString('base64')
            return crypto.pbkdf2(pw, salt, 100000, 64, 'sha512', (err: string, key: any) => {
                if (err) {
                    reject('에러 발생')
                } else {
                    resolve([key.toString('base64'), salt])
                }
           })
        }
    });
});

const Common: Record<string, Function> = {
    resError,
    setBlockIp,
    findShimpAndSlice,
    writeLog,
    checkParameter,
    checkJwt,
    checkPass,
    passwordConvert,
    bidirectionalEncrypted,
    bidirectionalDecrypted,
    exposureEncrypted,
    exposureDecrypted,
    jwtColumnEncrypted,
    jwtColumnDecrypted,
    getDecryptedTableOb,
    filterLastChar,
    decryptMessage,
    returnRestTime,
    generatePw
};
export default Common
