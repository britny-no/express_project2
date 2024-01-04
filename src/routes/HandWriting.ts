import { Module } from "../Module";

import Common from "../js/Common"
import StringJs from "../js/StringJs"
import JsWithMysql from "../js/JsWithMysql"
import FilterJs from "../js/Filter"

import Mysql from "../mysql/HandWriting"

const { express, cacheManager, jwt, crypto, seoulMoment } = Module
const { JWT_SECRET, MODE, COOKIE_SECURE, COOKIE_HTTP_ONLY, COOKIE_MAXAGE, LOGIN_CACHE_KEY } = process.env


const HandWritingRoute = express.Router();

HandWritingRoute.post('/write_contract', async (req: any, res: any) => {
  try {
    const body = req.body, { construction_index, parcel_info, contracter_info, business_info, pay_arr, contract_code } = body

    const queryStatus = Common.checkParameter(body, ['loginToken', 'contract_index', 'construction_index', 'origin_index', 'dong', 'hosil', 'contract_code', 'contract_date', 'regit_type', 'parcel_info', 'contracter_info', 'business_info', 'pay_arr' ])
    const queryStatus2 = Common.checkParameter(parcel_info, ['discount_payment', 'discount_ratio', 'land_cost', 'building_cost', 'av_price', 'parcel_price', 'vat', 'sale_price'])
    const queryStatus3 = Common.checkParameter(business_info, ['business_number', 'business_name', 'business_representative', 'business_type', 'business_event', 'business_address', 'business_email'])
    const contracter_count = contracter_info.length
    const salePriceCount = pay_arr.length
    // 계약자 확인
    for (let i = 0; i < contracter_count; i++) {
      const data = contracter_info[i]
      if (!Common.checkParameter(data, ['contracter_name', 'unique_number', 'contracter_phone', 'contracter_address', 'contracter_birth', 'contracter_sex', 'contracter_email']) && [1, 2].includes(data.contracter_sex)) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }
    }

    // 납입 계약정보 확인및 총 실분양가 도출
    let salePriceSum = 0
    for(let i = 0; i < salePriceCount; i++){
      const data = pay_arr[i]
      const {payment, date_status} = data

      if (!Common.checkParameter(data, ['degree', 'date_status', 'date', 'payment']) && [1, 2].includes(date_status) && payment > 0) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }else{
        salePriceSum += payment
      }
    }
    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
    const filterErr = [
      queryStatus && queryStatus2 && queryStatus3,
      contract_code !== null, 
      tableOb !== null && tableOb[tableKey] !== undefined,
      contracter_count > 0,
      salePriceSum === parcel_info.sale_price && salePriceCount > 0, 
    ]
    const errIndex = filterErr.indexOf(false)
    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.writeContract(tableOb[tableKey], { 
        ...body, 
        member_index: jwtOb.member_index,
        contracter_count,
        salePriceCount,
      }) })
    } else {
      const errMsg = ['잘못된 요청입니다', '계약 코드를 작성해주세요','다시 로그인 해주세요', '계약자 정보를 기입해주세요', '납입 계약 정보가 잘못됐습니다']
      switch (errIndex) {
        case 2:
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

HandWritingRoute.post('/revise_write_contract', async (req: any, res: any) => {
  try {
    const body = req.body, { construction_index, parcel_info, contracter_info, business_info, pre_pay_arr, new_pay_arr, exc_info, contract_code } = body
    const {pay_update} = exc_info
    const queryStatus = Common.checkParameter(body, ['loginToken', 'contract_index', 'construction_index', 'dong', 'hosil', 'contract_code', 'contract_date', 'regit_type','parcel_info', 'contracter_info', 'business_info', 'pre_pay_arr', 'new_pay_arr', 'exc_info' ])
    const queryStatus2 = Common.checkParameter(parcel_info, ['parcel_index','discount_payment', 'discount_ratio', 'land_cost', 'building_cost', 'av_price', 'parcel_price', 'vat', 'sale_price'])
    const queryStatus3 = Common.checkParameter(business_info, ['business_index','business_number', 'business_name', 'business_representative', 'business_type', 'business_event', 'business_address', 'business_email'])
    const contracter_count = contracter_info.length
    const salePriceCount = pre_pay_arr.length
    const salePriceCount2 = new_pay_arr.length
    

    // 계약자 확인
    for (let i = 0; i < contracter_count; i++) {
      const data = contracter_info[i]
      if (!Common.checkParameter(data, ['contracter_index','contracter_name', 'unique_number', 'contracter_phone', 'contracter_address', 'contracter_birth', 'contracter_sex', 'contracter_email']) && [1, 2].includes(data.contracter_sex)) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }
    }

    // 납입 계약정보 확인및 총 실분양가 도출
    let salePriceSum = 0
    for(let i = 0; i < salePriceCount; i++){
      const data = pre_pay_arr[i]
      const {payment, date_status} = data

      if (!Common.checkParameter(data, ['pay_index','degree', 'date_status', 'date', 'payment']) && [1, 2].includes(date_status) && payment > 0) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }else{
        salePriceSum += payment
      }
    }
    for(let i = 0; i < salePriceCount2; i++){
      const data = new_pay_arr[i]
      const {payment, date_status} = data

      if (!Common.checkParameter(data, ['degree', 'date_status', 'date', 'payment']) && [1, 2].includes(date_status) && payment > 0) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }else{
        salePriceSum += payment
      }
    }


    const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
    const jwtOb = jwt.decode(cookieInfo[key])
    const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)
    const filterErr = [
      queryStatus && queryStatus2 && queryStatus3,
      contract_code !== null, 
      tableOb !== null && tableOb[tableKey] !== undefined,
      contracter_count > 0,
      FilterJs.checkPayCondition(pay_update, salePriceCount, salePriceCount2,  salePriceSum === parcel_info.sale_price),
    ]
    const errIndex = filterErr.indexOf(false)
    
    if (errIndex === -1) {
      res.json({ errcode: 0, msg: await Mysql.reviseWriteContract(tableOb[tableKey], { 
        ...body, 
        member_index: jwtOb.member_index,
        contracter_count,
        salePriceCount : salePriceCount+salePriceCount2,
      }) })
    } else {
      const errMsg = ['잘못된 요청입니다', '계약 코드를 작성해주세요', '다시 로그인 해주세요', '계약자 정보를 기입해주세요', '납입 계약 정보가 잘못됐습니다']
      switch (errIndex) {
        case 2:
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

HandWritingRoute.post('/hand_over', async (req: any, res: any) => {
  try {
    const body = req.body, { business_info, contracter_info} = body
    const queryStatus = Common.checkParameter(body, [
      'loginToken', 'pre_contracter_arr', 'pre_business_index', 'business_same', 'contract_index', 'construction_index', 'contracter_info', 'business_info'
    ])
    const queryStatus2 =  Common.checkParameter(business_info, ['business_number', 'business_name', 'business_representative', 'business_type', 'business_event', 'business_address', 'business_email'])
    const contracter_count = contracter_info.length

    // 계약자 확인
    for (let i = 0; i < contracter_count; i++) {
      const data = contracter_info[i]
      if (!Common.checkParameter(data, ['contracter_name', 'unique_number', 'contracter_phone', 'contracter_address', 'contracter_birth', 'contracter_sex', 'contracter_email']) && [1, 2].includes(data.contracter_sex)) {
        res.status(400).json({ errcode: -1, msg: '잘못된 요청입니다' })
        return
      }
    }

    const filterErr = [
      queryStatus && queryStatus2,
      contracter_count !== 0
    ]
    const errIndex = filterErr.indexOf(false);

    if (errIndex === -1) {
      const { construction_index, business_same } = body
      const cookieInfo = req.cookies, key = await JsWithMysql.getCacheKey(LOGIN_CACHE_KEY)
      const jwtOb = jwt.decode(cookieInfo[key])
      const tableOb = Common.getDecryptedTableOb(jwtOb), tableKey = String(construction_index)

      // 사업자 정보 동일 여부, 새로 사업자 정보 추가 여부, 
      if (tableOb !== null && tableOb[tableKey]) {
        if(business_same){
          res.json({ errcode: 0, msg: await Mysql.handOverParcelBizSame(tableOb[tableKey], { ...body, member_index: jwtOb.member_index, contracter_count }) })
        }else{
          res.json({ errcode: 0, msg: await Mysql.handOverParcel(tableOb[tableKey], { ...body, member_index: jwtOb.member_index, contracter_count }) }) 
        }
        
      } else {
        res.status(202).json({ errcode: 0, msg: '다시 로그인 해주세요' })
      }
    } else {
      const errMsg = [
        '잘못된 요청입니다',
        '계약자 정보가 없습니다',
      ]
      res.status(400).json({ errcode: -1, msg: errMsg[errIndex] })
    }
  } catch (err) {
    return Common.resError(res, err)
  }
})



export default HandWritingRoute