import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import EtcJs from '../js/Etc';
import StringJs from '../js/StringJs';


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env

type ParcelInFo = {
    parcel_index? :number,
    discount_payment: number, 
    discount_ratio: number, 
    land_cost: number, 
    building_cost: number, 
    av_price: number, 
    parcel_price: number, 
    vat: number, 
    sale_price: number
}

type PayInfo = {
    pay_index? : number,
    date_status: number, step_count: number, 
    down_date: Date, down_payment: number, rest_date: Date, rest_payment: number, 
    step_1_date: Date, step_1_payment: number, step_2_date: Date, step_2_payment: number, step_3_date: Date, step_3_payment: number, step_4_date: Date, step_4_payment: number, step_5_date: Date, step_5_payment: number,
    step_6_date: Date, step_6_payment: number, step_7_date: Date, step_7_payment: number, step_8_date: Date, step_8_payment: number, step_9_date: Date, step_9_payment: number , step_10_date: Date, step_10_payment: number
}

type BusinessInfo = {
    business_index : number,
    business_number: number,
    business_name: string, 
    business_representative: string, 
    business_type: number, 
    business_event: string, 
    business_address: string, 
    business_email: string
}
type ContracterInfo = {
    contracter_index?: number,
    contracter_name: string, 
    unique_number: string, 
    contracter_phone: string, 
    contracter_address: string, 
    contracter_birth: string, 
    contracter_sex: number, 
    contracter_email: string
}

type ExcInfo = {
    contract_update: boolean, 
    parcel_update: boolean, 
    pay_update: number, 
    business_update: boolean,
    contracter_update: boolean
}

type bodyOb = Record<string, number | string | undefined>;


type CONTRACT_BODY = bodyOb & {
    price: number
    purpose: string
    parcel_info: ParcelInFo
    pay_info: PayInfo
    business_info: BusinessInfo
    contracter_info: ContracterInfo[]
    exc_info: ExcInfo
    pay_arr: {degree: number, date_status:number, date:Date, payment: number}[]
}

type CONTRACT_BODY_REVISE = bodyOb & {
    price: number
    purpose: string
    parcel_info: ParcelInFo
    pay_info: PayInfo
    contracter_info: ContracterInfo[]
    exc_info: ExcInfo
    business_info: BusinessInfo
    pre_pay_arr:  {pay_index:number, degree: number, date_status:number, date:Date, payment: number}[]
    new_pay_arr:  {degree: number, date_status:number, date:Date, payment: number}[]
}


const writeContract = (table_name: string, body: CONTRACT_BODY) => new Promise<string>(async (resolve, reject) => {
    const { 
        member_index, construction_index, contract_index, origin_index, dong, hosil,
        contract_code, contract_date, regit_type, contracter_count, parcel_info, contracter_info, business_info, pay_arr, salePriceCount
     } = body
    const params: Array<number | string | undefined | Date | ParcelInFo> = [member_index, construction_index, construction_index, contract_index, construction_index, dong, hosil, construction_index, contract_code]
    const url = `
        select * from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select * from CONSTRUCTION_SITE where construction_index = ? and status = 1;
        select * from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and dong =? and hosil = ? and contract_type = 0 and status = 0;
        select * from CONTRACT_${table_name} where construction_index = ? and contract_code = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]
                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1][0] !== undefined,  // 현장 운영 여부 확인
                        rows[2][0] !== undefined,  // 계약 상태 확인
                        rows[3][0] === undefined,
                    ];
                    
                    const errIndex = filterErr.indexOf(false);


                    if(errIndex === -1){
                        await connection.beginTransaction()
                        const { discount_payment, discount_ratio, land_cost, building_cost, av_price, parcel_price, vat, sale_price } = parcel_info
                        const { business_number, business_name, business_representative, business_type, business_event, business_address, business_email} = business_info
                        // 계약자 정보 제외 url
                        let insertUrl = `
                            update CONTRACT_${table_name} set contract_type = 1, status = 3, contract_code = ?, contract_date = ?, regit_type = ?, contracter_count = ? where contract_index = ? and construction_index = ?;
                            update CONTRACT_ORIGIN_${table_name} set contract_index = ?, update_date = now() where origin_index = ? and construction_index = ? and dong = ? and hosil = ?;
                            insert into PARCEL_${table_name}(construction_index, contract_index, discount_payment, discount_ratio, land_cost, building_cost, av_price, parcel_price, vat, sale_price, update_date ) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now());
                            insert into PAY_${table_name}( construction_index, contract_index,  degree, date_status, total_count, date, payment, update_date) values
                        `
                        let insertParams: Array<number | string | undefined | Date> = [
                            contract_code, contract_date, regit_type, contracter_count, contract_index, construction_index,
                            contract_index, origin_index, construction_index, dong, hosil,
                            construction_index, contract_index, discount_payment, discount_ratio, land_cost, building_cost, av_price, parcel_price, vat, sale_price,
                        ]


                        // 납부 계약 정보 등록
                        pay_arr.forEach(v => {
                            const {degree, date_status, date, payment} = v
                            insertUrl += ` (?, ?, ?, ?, ?, ?, ?, now()),`
                            insertParams.push(construction_index, contract_index, degree, date_status, salePriceCount, date, payment)
                        })
                        //insertUrl , 정리후 ; 붙이기
                        insertUrl = `${insertUrl.slice(0, insertUrl.length -1)};`

                        //사업자 정보 추가. 빈값이면 빈값대로 추가
                        insertUrl += `insert into BUSINESS_${table_name}(construction_index, contract_index, business_number,	business_name, business_representative, business_type, business_event, business_address, business_email) values(?, ?, ?, ?, ?, ?, ?, ?, ?);`
                        insertParams.push(construction_index, contract_index, business_number,	business_name, business_representative, business_type, business_event, business_address, business_email)


                        let insertResult = await connection.query(insertUrl, insertParams )
                        insertResult = insertResult[0]

                        if(insertResult[0].changedRows === 1 && insertResult[1].changedRows === 1 &&  insertResult[2].insertId !== 0 && insertResult[3].affectedRows ===  salePriceCount && insertResult[4].insertId !== 0){
                            // 계약자 정보 url
                            let insertUrl2 = `insert into CONTRACTER_${table_name}(construction_index, contract_index, business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email) values`
                            let insertParams2: Array<string | number | undefined> = []

                            contracter_info.forEach((v => {
                                const {contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email} = v
                                insertUrl2 += ` (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),`
                                insertParams2.push(construction_index, contract_index, insertResult[4].insertId, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email)
                            }))

                            if(insertUrl2 !== `insert into CONTRACTER_${table_name}(construction_index, contract_index, business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email) values`){
                                let insertResult = await connection.query(Common.filterLastChar(insertUrl2, ","), insertParams2 )
                                insertResult = insertResult[0]
                                if(insertResult.inserId !== 0 && insertResult.affectedRows === contracter_count){
                                    await connection.commit()
                                    resolve('계약 성공')
                                }else{
                                    await connection.rollback();
                                    reject([400, "계약에 실패하셨습니다"])
                                }
                            }else{
                                await connection.rollback();
                                reject([400, "계약에 실패하셨습니다"])
                            }
                        }else{
                            await connection.rollback();
                            reject([400, '계약에 실패하셨습니다'])
                        }

                    } else {
                        const errMsg = [
                            '권한이 없습니다',
                            '운영중인 현장이 아닙니다',
                            '계약 상태를 확인해주세요',
                            '계약 코드를 다시 작성해주세요'
                        ]
                        switch (errIndex) {
                            case 0:
                                reject([403, errMsg[errIndex]])
                                break;
                            default:
                                reject([400, errMsg[errIndex]])
                                break;
                        }
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/HandWriting/writeContract, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const reviseWriteContract = (table_name: string, body: CONTRACT_BODY_REVISE) => new Promise<string>(async (resolve, reject) => {
    const { 
        member_index, construction_index, contract_index, dong, hosil, contract_code, contract_date, regit_type, contracter_count, 
        parcel_info, contracter_info, business_info, pre_pay_arr, new_pay_arr, exc_info, salePriceCount
     } = body
    const params: Array<number | string | undefined | ParcelInFo> = [member_index, construction_index, construction_index, contract_index, construction_index, dong, hosil, construction_index, contract_code]
    const url = `
        select * from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select * from CONSTRUCTION_SITE where construction_index = ? and status = 1;
        select * from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and dong =? and hosil = ? and contract_type = 1 and status = 3;
        select * from CONTRACT_${table_name} where construction_index = ? and contract_code = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    let updateC = 0
                    let insertC = 0

                    rows = rows[0]
                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1][0] !== undefined,  // 현장 운영 여부 확인
                        rows[2][0] !== undefined,  // 계약 상태 확인
                        rows[3][0] === undefined
                    ];
                    const errIndex = filterErr.indexOf(false);

                    if(errIndex === -1){
                        await connection.beginTransaction()
                        const { contract_update, parcel_update, pay_update, business_update, contracter_update } = exc_info 
                        const { parcel_index, discount_payment, discount_ratio, land_cost, building_cost, av_price, parcel_price, vat, sale_price } = parcel_info
                        const { business_index, business_number, business_name, business_representative, business_type, business_event, business_address, business_email} = business_info
                        

                        let updateUrl = ``;
                        let updateParams = []
                
                        if(contract_update){
                            updateUrl += `update CONTRACT_${table_name} set contract_code = ?, contract_date = ?, regit_type = ?, contracter_count = ?, update_date = now() where contract_index = ? and construction_index = ?;`;
                            updateParams.push(contract_code, contract_date, regit_type, contracter_count, contract_index, construction_index)
                            updateC +=1
                        }

                        if(parcel_update){
                            updateUrl += `update PARCEL_${table_name} set discount_payment = ?, discount_ratio = ?, land_cost = ?, building_cost = ?, av_price = ?, parcel_price = ?, vat = ?, sale_price = ?, update_date = now() where parcel_index = ? and construction_index = ? and contract_index = ?;`;
                            updateParams.push(discount_payment, discount_ratio, land_cost, building_cost, av_price, parcel_price, vat, sale_price, parcel_index, construction_index, contract_index)
                            updateC +=1
                        }

                        if(business_update){
                            updateUrl += `
                                update BUSINESS_${table_name} set business_number = ?,	business_name = ?, business_representative = ?, business_type = ?, business_event = ?, business_address = ?, business_email = ?, update_date = now() where business_index = ? and construction_index = ? and contract_index = ?;
                            `
                            updateParams.push( business_number,	business_name, business_representative, business_type, business_event, business_address, business_email, business_index, construction_index, contract_index)
                            updateC +=1
                        }

                        if(contracter_update){
                            contracter_info.forEach((v => {
                                const {contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, contracter_index} = v
                                updateUrl += `update CONTRACTER_${table_name} set contracter_name = ?, unique_number = ?, contracter_phone = ?, contracter_address = ?, contracter_birth = ?, contracter_sex = ?, contracter_email = ?, update_date=now() where contracter_index = ? and construction_index = ? and contract_index = ?;`
                                updateParams.push(contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, contracter_index, construction_index, contract_index)
                                updateC +=1
                            })) 
                        }
                        
                        switch(pay_update){
                            case 1:
                                pre_pay_arr.forEach(v => {
                                    const {pay_index, degree, date_status, date, payment} = v
                                    updateUrl += `
                                        update PAY_${table_name} set degree = ?, date_status = ?, total_count = ?, date = ?, payment = ?, update_date = now() where pay_index = ? and construction_index = ? and contract_index = ?;
                                    `
                                    updateParams.push( degree, date_status, salePriceCount, date, payment, pay_index, construction_index, contract_index)
                                    updateC +=1
                                });
                                break;
                            case 2:
                                pre_pay_arr.forEach(v => {
                                    const {pay_index, degree, date_status, date, payment} = v
                                    updateUrl += `
                                        update PAY_${table_name} set degree = ?, date_status = ?, total_count = ?, date = ?, payment = ?, update_date = now() where pay_index = ? and construction_index = ? and contract_index = ?;
                                    `
                                    updateParams.push( degree, date_status, salePriceCount, date, payment, pay_index, construction_index, contract_index)
                                    updateC +=1
                                });
                                updateUrl += `insert into PAY_${table_name}( construction_index, contract_index,  degree, date_status, total_count, date, payment, update_date) values`
                                new_pay_arr.forEach(v => {
                                    const {degree, date_status, date, payment} = v
                                    updateUrl += ` (?, ?, ?, ?, ?, ?, ?, now()),`
                                    updateParams.push(construction_index, contract_index, degree, date_status, salePriceCount, date, payment)
                                    insertC +=1
                                });
                                //updateUrl , 정리후 ; 붙이기
                                updateUrl = `${updateUrl.slice(0, updateUrl.length -1)};`
                                break
                        }



                        if(updateUrl !==   ``){
                            let updateResult = await connection.query(updateUrl, updateParams )
                            updateResult = updateResult[0]
    
                            if(EtcJs.checkUpdateResult(updateResult, updateC, insertC)){
                                await connection.commit()
                                resolve('수정 성공')
                            }else{
                                await connection.rollback();
                                reject([400, '수정에 실패하셨습니다'])
                            }
                        }else{
                            reject([400, '수정 내용이 없습니다'])
                        }

                    } else {
                        const errMsg = [
                            '권한이 없습니다',
                            '운영중인 현장이 아닙니다',
                            '계약 상태를 확인해주세요',
                            '계약 코드를 다시 작성해주세요'
                        ]
                        switch (errIndex) {
                            case 0:
                                reject([403, errMsg[errIndex]])
                                break;
                            default:
                                reject([400, errMsg[errIndex]])
                                break;
                        }
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/HandWriting/reviseWriteContract, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})


const handOverParcel = (table_name: string, bodyOb: bodyOb & {business_info: BusinessInfo, contracter_info: ContracterInfo[], pre_contracter_arr: number[]}) => new Promise<string>(async (resolve, reject) => {
    const {
        pre_contracter_arr, pre_business_index, contract_index, construction_index, contracter_count, contracter_info, business_info,
        member_index
    } = bodyOb
    const {
        business_number, business_name, business_representative, business_type, business_event, business_address, business_email
    } = business_info
    const params: Array<string | number | undefined> = [
        member_index, construction_index, contract_index, construction_index, contract_index, construction_index,
        contract_index, construction_index, business_number, business_name, business_representative, business_type, business_event, business_address, business_email
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and status = 3 and contract_type = 1;
        SELECT contracter_index, hand_number FROM CONTRACTER_${table_name} where contract_index = ? and construction_index = ?  and status = 1;
        insert into BUSINESS_${table_name}(contract_index, construction_index, business_number, business_name, business_representative, business_type, business_event, business_address, business_email, update_date) values(?, ?, ?, ?, ?, ?, ?, ?, ?, now());
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const new_business_index = rows[3].insertId
                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1][0] !== undefined, // 기 등록된된 계약 확인
                    ]
                    const errIndex = filterErr.indexOf(false);

                    // 계약자 체크
                    let hand_number = 0
                    let contracterCheckArr = pre_contracter_arr
                    
                    rows[2].forEach((v: {contracter_index: number, hand_number: number}) => {
                        hand_number = v.hand_number
                        contracterCheckArr = contracterCheckArr.filter((d) => d !== v.contracter_index)
                    })
                    if(contracterCheckArr.length !== 0){
                        await connection.rollback();
                        reject([400, '이전 계약자 정보를 다시 입력해주세요'])
                    }else{
                        if (errIndex === -1) {
                            let url = `
                                update CONTRACT_${table_name} set contracter_count = ?, update_date = now() where contract_index = ? and construction_index = ?;
                                update CONTRACTER_${table_name} set status = 2 where contracter_index in (${StringJs.arrayToStingNum(pre_contracter_arr)}) and contract_index = ? and construction_index = ? and status = 1;
                                update BUSINESS_${table_name} set status = 2 where business_index = ? and contract_index = ? and construction_index = ? and status = 1;
                                insert into CONTRACTER_${table_name}(construction_index, contract_index, business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, hand_number, hand_date) values
                            `
    
                            let params =  [
                                contracter_count, contract_index, construction_index,
                                contract_index, construction_index,
                                pre_business_index, contract_index, construction_index
                            ]
    
                            contracter_info.forEach((v => {
                                const {contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email} = v
                                url += ` (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()),`
                                params.push(construction_index, contract_index, new_business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, hand_number + 1)
                            }))

                            let updateRows = await connection.query(Common.filterLastChar(url, ","), params)
                            updateRows = updateRows[0]

                            // 계약자 수가 이전과 현재가 달를수 있기에 contracter_count로 성공 유무 판단 불가
                            if (updateRows[0].changedRows === 1 && updateRows[1].changedRows !== 0 && updateRows[2].changedRows === 1 && updateRows[3].insertId !== 0) {
                                await connection.commit()
                                resolve('양도 완료했습니다')
                            } else {
                                await connection.rollback();
                                reject([400, '양도에 실패했습니다'])
                            }
                        } else {
                            await connection.rollback();
                            const errMsg = [
                                '권한이 없습니다',
                                '양도 가능한 계약이 아닙니다',
                                '양도에 실패하셨습니다'
                            ]
                            switch (errIndex) {
                                case 0:
                                    reject([403, errMsg[errIndex]])
                                    break;
                                default:
                                    reject([400, errMsg[errIndex]])
                                    break;
                            }
                        }
                    }

                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/HandWriting/handOverParcel, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})


const handOverParcelBizSame = (table_name: string, bodyOb: bodyOb & {business_info: BusinessInfo, contracter_info: ContracterInfo[], pre_contracter_arr: number[]}) => new Promise<string>(async (resolve, reject) => {
    const {
        pre_contracter_arr, pre_business_index, contract_index, construction_index, contracter_count, contracter_info,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, contract_index, construction_index, pre_business_index, contract_index, construction_index,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and status = 3 and contract_type = 1;
        SELECT contracter_index, hand_number FROM CONTRACTER_${table_name} where business_index = ? and contract_index = ? and construction_index = ? and  status = 1;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1][0] !== undefined, // 기 등록된된 계약 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                     
                    // 계약자 체크
                    let hand_number = 0
                    let contracterCheckArr = pre_contracter_arr
                    rows[2].forEach((v: {contracter_index: number, hand_number: number}) => {
                        hand_number = v.hand_number
                        contracterCheckArr = contracterCheckArr.filter((d) => d !== v.contracter_index)
                    })

                    if(contracterCheckArr.length !== 0){
                        await connection.rollback();
                        reject([400, '이전 계약자 정보를 다시 입력해주세요'])
                    }else{
                        if (errIndex === -1) {
                            let url = `
                                update CONTRACT_${table_name} set contracter_count = ?, update_date = now() where contract_index = ? and construction_index = ?;
                                update CONTRACTER_${table_name} set status = 2 where contracter_index in (${StringJs.arrayToStingNum(pre_contracter_arr)}) and contract_index = ? and construction_index = ? and status = 1;
                                insert into CONTRACTER_${table_name}(construction_index, contract_index, business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, hand_number, hand_date) values
                            `
    
                            let params =  [
                                contracter_count, contract_index, construction_index,
                                contract_index, construction_index,
                            ]
    
                            contracter_info.forEach((v => {
                                const {contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email} = v
                                url += ` (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()),`
                                params.push(construction_index, contract_index, pre_business_index, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email, hand_number + 1)
                            }))
    
    
                            let updateRows = await connection.query(Common.filterLastChar(url, ","), params)
                            updateRows = updateRows[0]
                            // 계약자 수가 이전과 현재가 달를수 있기에 contracter_count로 성공 유무 판단 불가
                            if (updateRows[0].changedRows === 1 && updateRows[1].changedRows !== 0 && updateRows[2].insertId !== 0) {
                                await connection.commit()
                                resolve('양도 완료했습니다')
                            } else {
                                await connection.rollback();
                                reject([400, '양도에 실패했습니다'])
                            }
                        } else {
                            await connection.rollback();
                            const errMsg = [
                                '권한이 없습니다',
                                '양도 가능한 계약이 아닙니다',
                            ]
                            switch (errIndex) {
                                case 0:
                                    reject([403, errMsg[errIndex]])
                                    break;
                                default:
                                    reject([400, errMsg[errIndex]])
                                    break;
                            }
                        }
                    }

                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/HandWriting/handOverParcelBizSame, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})


const Mysql: Record<string, Function> = {
    writeContract,
    reviseWriteContract,
    handOverParcel,
    handOverParcelBizSame
};
export default Mysql
