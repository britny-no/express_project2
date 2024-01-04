import { Module } from "../Module";

import Common from "../js/Common"
import ReportJs from "../js/ReportJs"
import JsWithMysql from "../js/JsWithMysql"
import Mysql from "../mysql/Report"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env

const ReportBookRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });

  
ReportBookRoute.get('/get_report', async (req: any, res: any) => {
    // 로그인된 유저가 접근하는 경우, 비로그인 유저가 접근하는 두 경우가 있습니다
    try {
      const body = req.query
      const queryStatus = Common.checkParameter(body, ['table_name', 'construction_index', 'limit_date','loginToken'])
  
      if (queryStatus) {
        if (body.table_name === "0") {
          const { construction_index } = body
          const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
          const jwtOb = jwt.decode(cookieInfo[key])
          const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
  
          if (tableOb !== null && tableOb[tableKey]) {
            body.table_name = tableOb[tableKey]
          } else {
            res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
            return
          }
        } else {
          body.table_name = await Common.exposureDecrypted(body.table_name)
        }
  
        res.json({ errcode: 0, msg: ReportJs.manufactureReport(await Mysql.getReport(body), body.limit_date) })
      } else {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
      }
    } catch (err) {
      console.log(err)
      return Common.resError(res, err)
    }
  })

ReportBookRoute.get('/get_report_chart', async (req: any, res: any) => {
    // 로그인된 유저가 접근하는 경우, 비로그인 유저가 접근하는 두 경우가 있습니다
    try {
        const body = req.query
        const queryStatus = Common.checkParameter(body, ['table_name', 'construction_index', 'limit_date', 'loginToken'])

        if (queryStatus) {
        if (body.table_name === "0") {
            const { construction_index } = body
            const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
            const jwtOb = jwt.decode(cookieInfo[key])
            const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

            if (tableOb !== null && tableOb[tableKey]) {
            body.table_name = tableOb[tableKey]
            } else {
            res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
            return
            }
        } else {
            body.table_name = await Common.exposureDecrypted(body.table_name)
        }
        const mysqlResult = await Mysql.getReportForChart(body)
        res.json({ errcode: 0, msg: ReportJs.manufactureChartReport(mysqlResult[0], mysqlResult[1].map((v : {purpose: string}) => v.purpose)) })
        } else {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        }
    } catch (err) {
        return Common.resError(res, err)
    }
})

ReportBookRoute.get('/get_cash_flow', async (req: any, res: any) => {
  // 로그인된 유저가 접근하는 경우, 비로그인 유저가 접근하는 두 경우가 있습니다
  try {
    const body = req.query
    const queryStatus = Common.checkParameter(body, ['table_name', 'construction_index', 'limit_date','loginToken'])

    if (queryStatus) {
      if (body.table_name === "0") {
        const { construction_index } = body
        const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const jwtOb = jwt.decode(cookieInfo[key])
        const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

        if (tableOb !== null && tableOb[tableKey]) {
          body.table_name = tableOb[tableKey]
        } else {
          res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
          return
        }
      } else {
        body.table_name = await Common.exposureDecrypted(body.table_name)
      }
      const mysqlResult = await Mysql.getCashFlow(body)
      res.json({ errcode: 0, msg: ReportJs.manufactureChartReport(mysqlResult[0], mysqlResult[1].map((v : {purpose: string}) => v.purpose)) })
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

ReportBookRoute.get('/get_share_url', async (req: any, res: any) => {
    try {
      const body = req.query
      const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])
  
      if (queryStatus) {
        const { construction_index } = body
        const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const jwtOb = jwt.decode(cookieInfo[key])
        const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
  
        if (tableOb !== null && tableOb[tableKey]) {
          res.json({ errcode: 0, msg: `/contract_book/get_report?table_name=${await Common.exposureEncrypted(tableOb[tableKey])}&construction_index=${construction_index}&loginToken=123` })
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



export default ReportBookRoute