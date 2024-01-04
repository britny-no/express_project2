import { Module } from "../Module";

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"
import Etc from "../js/Etc"
import ReportJs from "../js/ReportJs"

import Mysql from "../mysql/Construction"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env


const ConstructionRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });
const deployStatus = MODE === 'DEPLOY'

ConstructionRoute.get('/check_authority', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['loginToken'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])

      res.json({ errcode: 0, msg: await Mysql.checkAuthority(jwtOb) })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.get('/get_construction', async (req: any, res: any) => {
  try {
    const query = req.query, { construction_index } = query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      res.json({ errcode: 0, msg: await Mysql.getConstruction({ construction_index, member_index: jwtOb.member_index }) })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.post('/register_construction', async (req: any, res: any) => {
  try {
    const queryStatus = Common.checkParameter(req.body, [ 'name', 'address', 'construction_start', 'construction_end', 'hosil_count', 'corporation_name', 	'corporation_address', 	'corporation_representative', 'corporation_biz_number', 'corporation_event', 'corporation_biz','corporation_phone', 'responsive_name', 'responsive_phone', 'responsive_email', 'loginToken'])
    
    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const insertId = await Mysql.registerConstruction(jwtOb, req.body)
      const preTableOb = jwtOb.tableOb ? Common.getDecryptedTableOb(jwtOb) : {}
      const restTime = Common.returnRestTime(jwtOb)
      delete jwtOb['iat'], delete jwtOb['exp'];

      const jwtResult = jwt.sign({
        ...jwtOb,
        construction_site: jwtOb.construction_site ? `${jwtOb.construction_site}, ${insertId}` : `${insertId}`,
        tableOb: Common.jwtColumnEncrypted(JSON.stringify({...preTableOb, [insertId]: null}))
      }, JWT_SECRET, { expiresIn: `${restTime}ms` });

      const cookieOptions = deployStatus ? {
        secure: COOKIE_SECURE,
        httpOnly: COOKIE_HTTP_ONLY,
        maxAge: restTime * 1000
      } : {
        // httpOnly: COOKIE_HTTP_ONLY,
        sameSite: "none",
        secure: COOKIE_SECURE,
        maxAge: restTime * 1000
      }

      res.cookie(key, Common.bidirectionalEncrypted(jwtResult), cookieOptions);
      res.json({ errcode: 0, msg: '등록 완료' })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    console.log(err)
    return Common.resError(res, err)
  }
})


ConstructionRoute.post('/revise_construction', async (req: any, res: any) => {
  try {
    const { info, construction_index } = req.body
    const queryStatus = Common.checkParameter(req.body, [ 'construction_index', 'construction_info_index', 'name', 'address', 'construction_start', 'construction_end', 'hosil_count', 'corporation_name', 	'corporation_address', 	'corporation_representative', 'corporation_biz_number', 'corporation_event', 'corporation_biz','corporation_phone', 'loginToken'])
    
    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        await Mysql.reviseConstruction(jwtOb, { ...req.body, table_name: tableOb[tableKey] })
        res.json({ errcode: 0, msg: '수정 완료' })
      } else {
        res.status(202).json({ errcode: -1, msg: '다시 로그인 해주세요' })
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.get('/search_construction', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['name', 'loginToken'])

    if (queryStatus) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])

      res.json({ errcode: 0, msg: await Mysql.searchConstruction({ ...query, member_index: jwtOb.member_index }) })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})



ConstructionRoute.post('/register_sale_info', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'loginToken', 'construction_index', 'purpose', 'status', 'step_count', 'down_date', 'down_ratio', 'rest_date', 'rest_ratio',
      'step_1_date', 'step_1_ratio', 'step_2_date', 'step_2_ratio', 'step_3_date', 'step_3_ratio', 'step_4_date', 'step_4_ratio', 'step_5_date', 'step_5_ratio',
      'step_6_date', 'step_6_ratio', 'step_7_date', 'step_7_ratio', 'step_8_date', 'step_8_ratio', 'step_9_date', 'step_9_ratio', 'step_10_date', 'step_10_ratio',
    ])

    const { construction_index, status, step_count} = body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
    const filterErr = [
      queryStatus,
      tableOb !== null && tableOb[tableKey] !== undefined,
      [-1, 0, 1].includes(status),
      step_count <= 10,
      Etc.checkSaleInfo(body)
      
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.registerSaleInfo(tableOb[tableKey], { ...body, member_index: jwtOb.member_index })})
    } else {
      const errMsg = [
        "잘못된 요청입니다",
        "다시 로그인 해주세요",
        "불가능한 상태값입니다",
        "중도금 회차 최대는 10입니다",
        "납부 설정 정보를 다시 입력해주세요"
      ]
      switch(errIndex){
        case 1:
          res.status(202).json({ errcode: -1, msg: errMsg[errIndex] })
          break;
        default:
          res.status(400).json({ errcode: -1, msg: errMsg[errIndex] })
          break;
      }
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.post('/revise_sale_info', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'loginToken', 'info_index', 'construction_index', 'purpose', 'status', 'step_count', 'down_date', 'down_ratio', 'rest_date', 'rest_ratio',
      'step_1_date', 'step_1_ratio', 'step_2_date', 'step_2_ratio', 'step_3_date', 'step_3_ratio', 'step_4_date', 'step_4_ratio', 'step_5_date', 'step_5_ratio',
      'step_6_date', 'step_6_ratio', 'step_7_date', 'step_7_ratio', 'step_8_date', 'step_8_ratio', 'step_9_date', 'step_9_ratio', 'step_10_date', 'step_10_ratio',
    ])

    const { construction_index, status, step_count} = body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
    const filterErr = [
      queryStatus,
      tableOb !== null && tableOb[tableKey] !== undefined,
      [-1, 0, 1].includes(status),
      step_count <= 10,
      Etc.checkSaleInfo(body)
      
    ]
    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.reviseSaleInfo(tableOb[tableKey], { ...body, member_index: jwtOb.member_index })})
    } else {
      const errMsg = [
        "잘못된 요청입니다",
        "다시 로그인 해주세요",
        "불가능한 상태값입니다",
        "중도금 회차 최대는 10입니다",
        "납부 설정 정보를 다시 입력해주세요"
      ]
      switch(errIndex){
        case 1:
          res.status(202).json({ errcode: -1, msg: errMsg[errIndex] })
          break;
        default:
          res.status(400).json({ errcode: -1, msg: errMsg[errIndex] })
          break;
      }
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})


ConstructionRoute.get('/get_sale_info', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getSaleInfoList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
      } else {
        res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.get('/get_arch_info', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getArchInfo(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
      } else {
        res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.post('/revise_arch_info', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'construction_info_index', 'arch_land_area', 'arch_gross_floor_area', 'arch_parking_count', 'arch_fa_ratio', 'arch_btc_ratio', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.reviseArchInfo(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
      } else {
        res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ConstructionRoute.get('/get_dong_summary', async (req: any, res: any) => {
  try {
      const body = req.query
      const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])
  
      if (queryStatus) {
        const { construction_index } = body
        const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const jwtOb = jwt.decode(cookieInfo[key])
        const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
      
        if (tableOb !== null && tableOb[tableKey]) {
          const mysqlResult = await Mysql.getDongSummary({...body, table_name : tableOb[tableKey], member_index: jwtOb.member_index })
          res.json({ errcode: 0, msg: ReportJs.manufactureDongSummary(mysqlResult[0], mysqlResult[1].map((v : {purpose: string}) => v.purpose)) })
        } else {
          res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
        }
      } else {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
      }
    } catch (err) {
      return Common.resError(res, err)
    }
})



export default ConstructionRoute