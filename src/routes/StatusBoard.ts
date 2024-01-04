import { Module } from "../Module";

import Common from "../js/Common"
import ReportJs from "../js/ReportJs"
import JsWithMysql from "../js/JsWithMysql"
import Mysql from "../mysql/StatusBoard"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env

const StatusBoardRoute = express.Router();


StatusBoardRoute.get('/get_layer_list', async (req: any, res: any) => {
    try {
      const body = req.query
      const queryStatus = Common.checkParameter(body, ['construction_index', 'dong','loginToken'])
  
      if (queryStatus) {
        const { construction_index } = body
        const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const jwtOb = jwt.decode(cookieInfo[key])
        const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
  
        if (tableOb !== null && tableOb[tableKey]) {
          res.json({ errcode: 0, msg: await Mysql.getLayerlist(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

  StatusBoardRoute.get('/get_status_board', async (req: any, res: any) => {
    try {
      const body = req.query
      const queryStatus = Common.checkParameter(body, ['construction_index', 'contract_index', 'loginToken'])
  
      if (queryStatus) {
        const { construction_index } = body
        const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
        const jwtOb = jwt.decode(cookieInfo[key])
        const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
  
        if (tableOb !== null && tableOb[tableKey]) {
          res.json({ errcode: 0, msg: await Mysql.getParcelListByLayer(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

  export default StatusBoardRoute