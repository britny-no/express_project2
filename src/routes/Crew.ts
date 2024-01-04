import { Module } from "../Module";

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"
import Mysql from "../mysql/Crew"
import EtcMysql from "../mysql/Etc"


const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY, REVISE_POSSIBLE_AUTHORITY } = process.env


const CrewRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });
const deployStatus = MODE === 'DEPLOY'

CrewRoute.get('/crew_list', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = query
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        const params = {
          member_index: jwtOb.member_index,
          construction_index
        }
        res.json({ errcode: 0, msg: await Mysql.getCrewList(tableOb[tableKey], params) })
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


CrewRoute.post('/req_crew', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
      const { construction_site, member_index } = jwtOb

      if ((tableOb === null) || (tableOb !== null && !tableOb[tableKey])) {
        const new_construction_site = await Mysql.reqCrew({ ...body, member_index, construction_site })
        const restTime = Common.returnRestTime(jwtOb)

        delete jwtOb['iat'], delete jwtOb['exp'];
  
        const jwtResult = jwt.sign({
          ...jwtOb,
          construction_site: new_construction_site
        }, process.env.JWT_SECRET, { expiresIn: `${restTime}ms` });
  
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
        res.json({ errcode: 0, msg: '신청 완료됐습니다' })
      } else {
        res.status(202).json({ errcode: -1, msg: '소속되어 있는 현장입니다' })
      }
    } else {
      res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

CrewRoute.post('/cancel_req_crew', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if ((tableOb !== null && tableOb[tableKey])) {
        const { construction_site } = jwtOb
        const filteredConstructionSite = StringJs.filterConstruction(construction_site, String(construction_index))

        await Mysql.cancelReqCrew({ ...body, member_index: jwtOb.member_index, filteredConstructionSite })

        const restTime = Common.returnRestTime(jwtOb)
        delete jwtOb['iat'], delete jwtOb['exp'];
  
        const jwtResult = jwt.sign({
          ...jwtOb,
          construction_site: filteredConstructionSite
        }, process.env.JWT_SECRET, { expiresIn: `${restTime}ms` });
  
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
        res.json({ errcode: 0, msg:  '취소 신청이 완료됐습니다'})
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

CrewRoute.post('/confirm_crew', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'crew_member_index', 'crew_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.confirmCrew(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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


CrewRoute.post('/revise_authority', async (req: any, res: any) => {
  try {
    const body = req.body
    const { construction_index, authority } = body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'crew_index', 'authority', 'loginToken'])
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

    const filterArr = [
      queryStatus,
      tableOb !== null && tableOb[tableKey] !== undefined,
      REVISE_POSSIBLE_AUTHORITY?.split(',').map(v => v.replace(' ', '')).includes(String(authority)),
    ]
    const errIndex = filterArr.indexOf(false)

    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.reviseAuthority(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '다시 로그인 해주세요',
        '변경 불가한 권한입니다'
      ]
      switch (errIndex) {
        case 1:
          res.status(202).json({ errcode: 0, msg: errMsg[errIndex] })
          break;
        default:
          res.status(400).json({ errcode: -1, msg: errMsg[errIndex] || '잘못된 요청입니다' })
      }
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})

CrewRoute.post('/cancel_confirm', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'crew_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.cancelConfirm(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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

CrewRoute.post('/carry_authority', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['construction_index', 'crew_index', 'loginToken'])
    const { construction_index } = body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
    const filterArr = [
      queryStatus,
      tableOb !== null && tableOb[tableKey] !== undefined,
    ]
    const errIndex = filterArr.indexOf(false)

    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.carryAuthority(tableOb[tableKey], body, jwtOb) })
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '다시 로그인 해주세요',
        '변경 불가한 권한입니다'
      ]
      switch (errIndex) {
        case 1:
          res.status(202).json({ errcode: 0, msg: errMsg[errIndex] })
          break;
        default:
          res.status(400).json({ errcode: -1, msg: errMsg[errIndex] || '잘못된 요청입니다' })
      }
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})







export default CrewRoute