import { Module } from "../Module";

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"
import Etc from "../js/Etc"

import Mysql from "../mysql/Contract"

const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env


const ContractRoute = express.Router();
const memory_cache = cacheManager.caching({ store: 'memory', ttl: 200/*seconds*/ });

type bodyOb = Record<string, number | string | undefined>;

type CONTRACT_BODY = bodyOb & {
    price: number
    purpose: string
}

ContractRoute.get('/contract_list', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'start_limit', 'end_limit', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = query
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = await Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContractList(tableOb[tableKey], { ...query, member_index: jwtOb.member_index }) })
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

ContractRoute.get('/contract_list_by_keyword', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'dong', 'hosil', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = query
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContractListByKeyword(tableOb[tableKey], { ...query, member_index: jwtOb.member_index }) })
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

ContractRoute.get('/contract_list_by_hosil', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'hosil', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = query
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getContractListByHosil(tableOb[tableKey], { ...query, member_index: jwtOb.member_index }) })
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

ContractRoute.get('/dong_list', async (req: any, res: any) => {
  try {
    const query = req.query
    const queryStatus = Common.checkParameter(query, ['construction_index', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = query
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.getDongList(tableOb[tableKey], { ...query, member_index: jwtOb.member_index }) })
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

// ContractRoute.post('/register_contract', async (req: any, res: any) => {
//   try {
//     const body = req.body
//     const queryStatus = Common.checkParameter(body, ['construction_index', 'loginToken', 'dong', 'hosil', 'private_area', 'public_area', 'parcel_area', 'av_price', 'price', 'large_stake', 'land_cost', 'building_cost', 'vat_cost', 'vat_price', 'building_proportions', 'dedicated_rate', 'purpose'])

//     const { construction_index, purpose } = body
//     const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
//     const jwtOb = jwt.decode(cookieInfo[key])
//     const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
//     const filterErr = [
//       queryStatus,
//       tableOb !== null && tableOb[tableKey] !== undefined,
//       purpose.length < 10
//     ]
//     const errIndex = filterErr.indexOf(false)

//     if (errIndex === -1) {
//       res.json({ errcode: 0, msg: await Mysql.registerContract(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
//     } else {
//       const errMsg = ['잘못된 요청입니다', '다시 로그인 해주세요', '용도는 10글자내로 작성해주세요']
//       switch (errIndex) {
//         case 1:
//           res.status(202).json({ errcode: 0, msg: errMsg[errIndex] })
//           break;
//         default:
//           res.status(400).json({ errcode: -1, msg: errMsg[errIndex] || '잘못된 요청입니다' })
//       }
//     }

//   } catch (err) {
//     return Common.resError(res, err)
//   }
// })

ContractRoute.post('/register_contract_bulk', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['loginToken', 'bulk', 'construction_index'])
    const origin_bulk = JSON.parse(body.bulk), bulk_len = origin_bulk.length
    let parsed_bulk = []

    for (let i = 0; i < bulk_len; i++) {
      const data = origin_bulk[i]
      if (!Common.checkParameter(data, ['construction_index', 'dong', 'hosil', 'layer','private_area', 'public_area', 'parcel_area', 'av_price', 'origin_price', 'large_stake', 'land_cost', 'building_cost', 'vat', 'sale_price', 'building_proportions', 'dedicated_rate', 'purpose'])) {
        res.status(400)
        res.end()
        return
      }else{
        parsed_bulk.push({
          ...data,
          purpose: data.purpose.trim()
        })
      }
    }

    const { construction_index } = body
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

    const filterErr = [
      queryStatus,
      tableOb !== null && tableOb[tableKey] !== undefined,
      bulk_len > 0,
    ]

    const errIndex = filterErr.indexOf(false)

    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.registerContractBulk(tableOb[tableKey], { parsed_bulk, member_index: jwtOb.member_index, construction_index: body.construction_index }) })
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '다시 로그인 해주세요',
        '1건 이상 요청해주세요',
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


ContractRoute.post('/revise_contract', async (req: any, res: any) => {
  try {
    const body = req.body
    const queryStatus = Common.checkParameter(body, ['contract_index', 'construction_index', 'dong', 'hosil', 'private_area', 'public_area', 'parcel_area', 'dedicated_rate', 'large_stake', 'building_proportions',  'purpose', 'av_price', 'origin_price', 'land_cost', 'building_cost', 'vat', 'sale_price', 'loginToken'])

    if (queryStatus) {
      const { construction_index } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      if (tableOb !== null && tableOb[tableKey]) {
        res.json({ errcode: 0, msg: await Mysql.reviseContract(tableOb[tableKey], { ...body, member_index: jwtOb.member_index }) })
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







export default ContractRoute