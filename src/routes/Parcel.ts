import { Module } from "../Module";

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"
import Mysql from "../mysql/Parcel"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env


const ParcelRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });

ParcelRoute.post('/register_parcel', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'contract_number', 'contract_date', 'parcel_price', 'construction_index', 'contract_index', 'contracter_name', 'contracter_number', 'contracter_phone', 'contracter_address',
      'business_number', 'business_name', 'business_people', 'business_type', 'business_target', 'business_address', 'business_email', 'loginToken'
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.registerParcel(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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


ParcelRoute.post('/revise_parcel_contracter', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'contract_number', 'contract_date', 'parcel_index',
      'construction_index', 'loginToken', 'contract_index', 'contracter_name', 'contracter_number', 'contracter_phone', 'contracter_address',
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.reviseParcelContracter(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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



ParcelRoute.post('/revise_parcel_business', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'construction_index', 'contract_index', 'loginToken', 'parcel_index', 'business_number', 'business_name', 'business_people', 'business_type', 'business_target', 'business_address', 'business_email',
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.reviseParcelBusiness(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ParcelRoute.post('/revise_pay_step', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'construction_index', 'contract_index', 'loginToken',
      'down_payment', 'step_1_date', 'step_2_date', 'step_3_date', 'step_4_date', 'step_rest_date', 'step_1_value', 'step_2_value', 'step_3_value', 'step_4_value', 'rest_payment'
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.revisePayStep(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ParcelRoute.post('/revise_parcel_price', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'construction_index', 'contract_index', 'loginToken', 'parcel_price'
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.reviseParcelPrice(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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


// ParcelRoute.get('/get_parcel_list', async (req: any, res: any) => {
//   try {
//     const body = req.query
//     const queryStatus = Common.checkParameter(body, ['construction_index', 'start_limit', 'end_limit', 'loginToken'])

//     if (queryStatus) {
//       const { construction_index } = body
//       const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
//       const jwtOb = jwt.decode(cookieInfo[key])
//       const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

//       if (tableOb !== null && tableOb[tableKey]) {
//         res.json({ errcode: 0, msg: await Mysql.getParcelList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
//       } else {
//         res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
//       }
//     } else {
//       res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
//     }
//   } catch (err) {
//     return Common.resError(res, err)
//   }
// })

// ParcelRoute.get('/get_parcel_list_by_hosil', async (req: any, res: any) => {
//   try {
//     const body = req.query
//     const queryStatus = Common.checkParameter(body, ['construction_index', 'hosil', 'contracter_name', 'loginToken'])

//     if (queryStatus) {
//       const { construction_index } = body
//       const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
//       const jwtOb = jwt.decode(cookieInfo[key])
//       const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

//       if (tableOb !== null && tableOb[tableKey]) {
//         res.json({ errcode: 0, msg: await Mysql.getParcelListByHosil(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
//       } else {
//         res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
//       }
//     } else {
//       res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
//     }
//   } catch (err) {
//     return Common.resError(res, err)
//   }
// })


ParcelRoute.post('/delete_parcel', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'contract_index', 'parcel_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.deleteParcel(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ParcelRoute.post('/hand_over_parcel', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, [
      'parcel_index', 'construction_index', 'loginToken', 'contract_index', 'contracter_name', 'contracter_number', 'contracter_phone', 'contracter_address',
      'business_number', 'business_name', 'business_people', 'business_type', 'business_target', 'business_address', 'business_email',
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.handOverParcel(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ParcelRoute.get('/get_hand_over_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, [
      'construction_index', 'loginToken', 'contract_index'
    ])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getHandOverList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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


export default ParcelRoute
