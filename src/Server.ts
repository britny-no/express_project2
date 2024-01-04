import { Module } from "./Module";
import UserRoute from './routes/User'
import ConstructionRoute from './routes/Construction'
import ContractRoute from './routes/Contract'
import CrewRoute from './routes/Crew'
import ParcelRoute from './routes/Parcel'
import ContractBookRoute from './routes/ContractBook'
import HandWritingRoute from './routes/HandWriting'
import NiceRoute from './routes/Nice'
import ReportRoute from './routes/Report'
import StatusBoardRoute from './routes/StatusBoard'

// import MemjsClient from "./lib/Memjs"
import Common from './js/Common'
import JsWithMysql from "./js/JsWithMysql"
const { express, path, dotenv, bodyParser, cors, cookieParser, fs, httpsLocalhost, https, jwt } = Module
const { ORIGIN, PORT, HTTPS, MEMCACHED_MAX, MODE, CREDENTIALS, LOGIN_CACHE_KEY } = process.env

dotenv.config({ path: path.normalize(__dirname + '/../.env') });

// config
const server = express();


server.use(bodyParser.json())
server.use(bodyParser.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(cors({
    origin: ORIGIN?.split(','),
    credentials: CREDENTIALS === 'TRUE'
}))




//check ip
server.use(async function (req: any, res: any, next: any) {
    try {
        // const client_ip = req.headers['x-forwarded-for'] ||  req.connection.remoteAddress
        // const cookieInfo = req.cookies
        // const mem_max = Number(MEMCACHED_MAX) || 0
        // const blocked_ip_m = await MemjsClient.get('blocked_ip')
        // const pre_ip_info_m = await MemjsClient.get(client_ip)
        // const blocked_ip = blocked_ip_m.value ? String(blocked_ip_m.value) : ""
        // const pre_ip_info = pre_ip_info_m.value ? Number(pre_ip_info_m.value): 0
        // const csrfStatus = MODE === 'DEV' || cookieInfo.randomValue === req.headers.randomvalue
        // const filterArr = [
        //     !blocked_ip.includes(client_ip),
        //     client_ip !== undefined,
        //     pre_ip_info <= 5,
        //     csrfStatus
        // ]
        // const errIndex = filterArr.indexOf(false)

        // if(errIndex === -1){
        // ip 처리 한후 로그인 필요한 routes이면 jwt decode
        // 로그인/비로그인 라우터별 유효성 검증해야할듯
        // form data url은 router 안에서 직접 로그인 체크
        // 로그인한 ip인지 확인
        const cookieInfo = req.cookies
        const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress
        const pathInfo = req._parsedOriginalUrl ? req._parsedOriginalUrl.pathname : req.url
        const key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const loginJwtValue = cookieInfo[key]
        const bidirectionalDecryptedJwtToken = loginJwtValue ? await Common.bidirectionalDecrypted(loginJwtValue) : false
        const params = JSON.stringify(req.query) !== '{}' ? req.query : req.body
        const logintSatus = bidirectionalDecryptedJwtToken && bidirectionalDecryptedJwtToken !== "" && Common.checkJwt(bidirectionalDecryptedJwtToken, params)
        const csrfStatus = MODE === 'DEV' || cookieInfo.randomValue === req.headers.randomvalue
        const excludedLoginPath = [
            '/user/login',
            '/user/sign_up',
            '/user/find_id',
            '/user/update_pawssword',
            '/user/check_id',
            '/user/reset_pw',
            '/contract_book/get_report',
            '/nice/get_encode_data',
            '/nice/checkplus-success',
            '/nice/checkplus-fail'
        ]
        const decoded = jwt.decode(bidirectionalDecryptedJwtToken)
        const filterArr = [
            logintSatus,
            csrfStatus,
            logintSatus && decoded && decoded.clientIp === clientIp,
        ]
        const errIndex = filterArr.indexOf(false)

        if (excludedLoginPath.includes(pathInfo.split("?")[0]) || errIndex === -1) {
            req.cookies[key] = bidirectionalDecryptedJwtToken
            // await MemjsClient.set(client_ip, String(pre_ip_info+1), {expires:1})
            next();
        } else {
            const errMss = ['로그인 해주세요', '잘못된 요청입니다', '다른 ip에서 로그인하셨습니다. 재로그인해주세요']
            switch (errIndex) {
                case 0:
                    res.status(401).send({ errcode: -1, msg: errMss[errIndex] })
                    break;
                case 1:
                case 2:
                    res.status(400).send({ errcode: -1, msg: errMss[errIndex] })
                    break;
                default:
                    res.status(500).send({ errcode: 0, msg: 'network error' })
                    break
            }
        }
        // }else{
        //     switch(errIndex){
        //         case 0:
        //             throw '제한된 ip입니다'
        //         case 1:
        //         case 3:
        //             throw "잘못된 접근입니다"
        //         case 2:
        //             Common.setBlockIp({blocked_ip, client_ip, mem_max })
        //             throw '요청이 너무 많습니다'
        //         default:
        //             throw '관리자에게 문의바랍니다'
        //     }
        // }
    } catch (err) {
        res.status(500).send({ errcode: 0, msg: err || '관리자에게 문의바랍니다' })
    }
});

// routes
server.use('/user', UserRoute);
server.use('/construction', ConstructionRoute);
server.use('/contract', ContractRoute);
server.use('/crew', CrewRoute);
server.use('/parcel', ParcelRoute);
server.use('/contract_book', ContractBookRoute);
server.use('/hand_write', HandWritingRoute);
server.use('/nice', NiceRoute);
server.use('/report', ReportRoute);
server.use('/status_board', StatusBoardRoute);




if (HTTPS === 'true') {
    (async () => {
        const certs = await httpsLocalhost.getCerts()
        https.createServer(certs, server).listen(PORT, "0.0.0.0", () => {
            console.log(`https ${PORT}`);
        })
    })()
} else {
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`http ${PORT}`);
    });
}
