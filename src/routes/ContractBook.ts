import { Module } from "../Module";

import Common from "../js/Common"
import ReportJs from "../js/ReportJs"
import JsWithMysql from "../js/JsWithMysql"
import Mysql from "../mysql/ContractBook"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env
// console.log( seoulMoment().isAfter())

const ContractBookRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });


ContractBookRoute.get('/get_parcel_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'start_index', 'count'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getParcelList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ContractBookRoute.get('/get_contracter_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'start_index', 'count'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContracterList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ContractBookRoute.get('/get_business_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'start_index', 'count'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getBusinessList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ContractBookRoute.get('/get_payment_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'start_index', 'count'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getPaymentList(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ContractBookRoute.get('/get_hand_over_list', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'contract_index'])

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

ContractBookRoute.get('/get_contract_book', async (req: any, res: any) => {
  try {
    const body = req.query
    //parsing 한번만 하기 위해 이 위치에서 진행
    body.filter_ob = JSON.parse(body.filter_ob)
    const { construction_index, filter_ob } = body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'start_index', 'count', 'filter_ob'])
    const queryStatus2 = Common.checkParameter(filter_ob, ['f_start_date', 'f_end_date', 'status_arr', 'purpose_arr'])

    if (queryStatus && queryStatus2) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
      const filterErr = [
        tableOb !== null && tableOb[tableKey] !== undefined,
        filter_ob.status_arr.filter((v: number) => ![-1, 0, 1, 2, 3, 4].includes(v)).length === 0
      ]
      const errIndex = filterErr.indexOf(false)

      if (errIndex === -1) {
        res.json({ errcode: 0, msg: await Mysql.getContractBook(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
      } else {
        switch(errIndex){
          case 0:
            res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
            break
          case 1:
            res.status(400).json({ errcode: 0, msg: '잘못된 요청입니다' })
            break

        }
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ContractBookRoute.get('/get_contract_book_by_hosil', async (req: any, res: any) => {
  try {
    const body = req.query
    //parsing 한번만 하기 위해 이 위치에서 진행
    body.filter_ob = JSON.parse(body.filter_ob)
    const { construction_index, filter_ob, hosil } = body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'hosil', 'filter_ob'])
    const queryStatus2 = Common.checkParameter(filter_ob, ['f_start_date', 'f_end_date', 'status_arr', 'purpose_arr'])


    if (queryStatus && queryStatus2) {
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
      const filterErr = [
        tableOb !== null && tableOb[tableKey] !== undefined,
        filter_ob.status_arr.filter((v: number) => ![-1, 0, 1, 2, 3, 4].includes(v)).length === 0
      ]
      const errIndex = filterErr.indexOf(false)

      if (errIndex === -1) {
        if(hosil === '000' ) body.hosil = ''
        res.json({ errcode: 0, msg: await Mysql.getContractBookByHosil(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
      } else {
        switch(errIndex){
          case 0:
            res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
            break
          case 1:
            res.status(400).json({ errcode: 0, msg: '잘못된 요청입니다' })
            break

        }
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ContractBookRoute.get('/get_contract_book_by_dong_hosil', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'hosil', 'dong'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContractBookByDongHosil(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

ContractBookRoute.get('/get_contract_book_filter', async (req: any, res: any) => {
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContractBookFilter(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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



export default ContractBookRoute