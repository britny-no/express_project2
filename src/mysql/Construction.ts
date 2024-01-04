import { Module } from "../Module";

import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from "../js/StringJs";


const { path, crypto } = Module
const { ACCESS_AUTHORITY } = process.env

// interface
interface JwtOB {
    construction_site: string,
    access_token: string,
    email: string,
    member_index: number
}

type Ob = Record<string, string | number | undefined>
type Ob_BOOLEAN = Record<string, string | number | undefined | boolean>

const checkAuthority = (jwtOb: JwtOB) => new Promise<Array<{authority: number, construction_index: number}>>(async (resolve, reject) => {
    const { construction_site, member_index } = jwtOb
    if(construction_site){
        const url = `
        select construction_index, status, table_name  from CONSTRUCTION_SITE where construction_index in (${construction_site});
    `
        MysqlPool.getConnection()
        .then(async (connection: any) => {
            try {
                let results = await connection.query(url, [construction_site])
                results = results[0]

    
                let authUrl = ``;
                let authParams: Array<number> = [];
                let resultOb: Record<string, number> = {}
                
                results.forEach((v: {table_name: string, construction_index: number}) => {
                    if(v.table_name){
                        authUrl += `
                            select construction_index, authority from CREW_${v.table_name} where member_index = ? and construction_index = ? and (authority = 0 or authority > 0);
                        `
                        authParams.push(member_index, v.construction_index)
                    }
                    resultOb = {
                        ...resultOb,
                        [v.construction_index]: 0
                    }
                })
                if(authUrl !== ``){
                    let authResults = await connection.query(authUrl, authParams)
                    authResults = authResults[0]

                    if(authResults.length === 1){
                        authResults.filter((v: {authority: number, construction_index: number}) => v.construction_index).forEach((v: {authority: number, construction_index: number}) => {
                            resultOb = {
                                ...resultOb,
                                [String(v.construction_index)]: v.authority
                            }
                        })
                    }else{
                        authResults.filter((v: [number]) => v[0]).forEach((v: [{authority: number, construction_index: number}]) => {
                            resultOb = {
                                ...resultOb,
                                [String(v[0].construction_index)]: v[0].authority
                            }
                        })
                    }
                }
                
                // ob -> arr화
                const resultArr = Object.keys(resultOb).map(v => {
                    return {
                        construction_index: Number(v),
                        authority:  resultOb[v]
                    }
                })
                resolve(resultArr)
            } catch (error) {
                Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/checkAuthority, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                reject([500, '관리자에게 문의바랍니다']);
            } finally {
                connection.release()
            }
        })
        .catch((err: string) => {
            reject([500, err || '다시 시도해주세요'])
        })
    }else{
        resolve([]);
    }
})

const getConstruction = (body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { construction_index, member_index } = body
    const url = `
        select construction_index, name, address, info, table_name, arch_land_area, arch_gross_floor_area, arch_parking_count, arch_btc_ratio, arch_fa_ratio, reject_reason, start_date, end_date from CONSTRUCTION_SITE where construction_index = ? and  status = 1
    `
    if (![construction_index, member_index].includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let results = await connection.query(url, [construction_index])
                    results = results[0][0]

                    if (results) {
                        const auth_url = `
                            select * from CREW_${results.table_name} where construction_index = ? and member_index = ?;
                        `
                        let auth_results = await connection.query(auth_url, [construction_index, member_index])
                        auth_results = auth_results[0][0]

                        if (ACCESS_AUTHORITY?.split(',').map(v => Number(v.replace(' ', ''))).includes(auth_results.authority)) {
                            delete results['table_name'];

                            resolve({
                                ...results,
                                authority: auth_results.authority
                            })
                        } else {
                            reject([210, auth_results.authority])
                        }
                    } else {
                        reject([400, '잘못된 요청입니다'])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/getConstruction, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const registerConstruction = (jwtOb: Ob, body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { member_index } = jwtOb
    const { 
        name, address, construction_start, construction_end, hosil_count,
        corporation_name, 	corporation_address, 	corporation_representative,
        corporation_biz_number, corporation_event, corporation_biz, corporation_phone, responsive_name, responsive_phone, responsive_email 
    } = body
    const params = [ name, address, construction_start, construction_end, hosil_count,
        corporation_name, 	corporation_address, 	corporation_representative,
        corporation_biz_number, corporation_phone, responsive_name, responsive_phone, responsive_email, member_index
    ]
    const select_url = `
        select construction_site from ENTERPRISE_MEMBER where member_index = ? and status = 1;
        select * from CONSTRUCTION_SITE where register_index = ? and status = 0
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let selectResult = await connection.query(select_url, [member_index, member_index])
                    selectResult = selectResult[0]

                    if (selectResult[0][0] !== undefined && selectResult[1][0] === undefined) {
                        await connection.beginTransaction()
                        const insertUrl = `
                            INSERT INTO CONSTRUCTION_SITE(name, address, construction_start, construction_end, hosil_count, register_index, register_date) VALUES (?, ?, ?, ?, ?, ?, now())
                        `
                        const insertParams: Array<string | undefined | number> = [name, address, construction_start, construction_end, hosil_count, member_index]

                        const insertResults = await connection.query(insertUrl, insertParams)
                        if (insertResults[0].insertId !== 0) {
                            const updateUrl = `
                                INSERT INTO CONSTRUCTION_ETC_INFO(construction_index, corporation_name, corporation_address, corporation_representative, corporation_biz_number, corporation_event, corporation_biz, corporation_phone, responsive_name, responsive_phone, responsive_email, update_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now());
                                update ENTERPRISE_MEMBER set construction_site = ? where member_index = ?;
                            `
                            const updateParams = [
                                insertResults[0].insertId, corporation_name, 	corporation_address, 	corporation_representative,
                                corporation_biz_number, corporation_event, corporation_biz, corporation_phone, responsive_name, responsive_phone, responsive_email,
                                StringJs.orderConstruction(selectResult[0][0].construction_site, insertResults[0].insertId), member_index
                            ]
                            let updateResults = await connection.query(updateUrl, updateParams)
                            updateResults = updateResults[0]

                            if (updateResults[0].insertId !== 0 && updateResults[1].affectedRows !== 0) {
                                await connection.commit()
                                resolve(insertResults[0].insertId)
                            }else{
                                await connection.rollback();
                                reject([400, '잘못된 요청입니다'])
                            }
                        } else {
                            await connection.rollback();
                            reject([400, '잘못된 요청입니다'])
                        }
                    } else {
                        reject([400, '승인 대기중인 건이 있습니다'])
                    }
                } catch (error) {
                    //catch error은 예기치 못한 에러에 대해 로그 남깁니다
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/registerConstruction, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const reviseConstruction = (jwtOb: Ob, body: Ob) => new Promise<string>(async (resolve, reject) => {
    const {  
            construction_index, construction_info_index, name, address, construction_start, construction_end, hosil_count, 
            corporation_name, corporation_address, corporation_representative, corporation_biz_number, corporation_event, corporation_biz, corporation_phone, table_name 
    } = body
    const params: Array<string | undefined | number> = [
        jwtOb.member_index, construction_index, 
        name, address, construction_start, construction_end, hosil_count, construction_index,
        corporation_name, corporation_address, corporation_representative, corporation_biz_number, corporation_event, corporation_biz, corporation_phone, construction_info_index, construction_index
    ]
    const url = `
        select * from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        update CONSTRUCTION_SITE set name =?, address=?, construction_start = ?, construction_end = ?, hosil_count = ?, update_date = now() where construction_index=?;
        update CONSTRUCTION_ETC_INFO set corporation_name = ?,  corporation_address = ?, corporation_representative = ?, corporation_biz_number = ?, corporation_event = ?, corporation_biz = ? , corporation_phone = ?, update_date = now() where 	construction_info_index =?  and construction_index=?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let results = await connection.query(url, params)
                    results = results[0]

                    const filterErr = [
                        results[0][0] !== undefined,  
                        results[1].affectedRows === 1 && results[2].affectedRows === 1
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            "권한이 없습니다",
                            "수정에 실패하셨습니다"
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/reviseConstruction, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})


const searchConstruction = (body: Ob) => new Promise<Record<number, Ob_BOOLEAN>>(async (resolve, reject) => {
    const { name, member_index } = body
    const url = `select table_name, construction_index, name, address, construction_start, construction_end, src, address from CONSTRUCTION_SITE where status = 1 and name LIKE ?;`

    if (![name, member_index].includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const selectResults = await connection.query(url, [`${name}%`])

                    if (selectResults[0]) {
                        let resultOb: Record<number, Ob_BOOLEAN> = {}
                        let usedUrl = ''
                        let usedParams: Array<string | undefined | number> = []

                        selectResults[0].filter((v: Record<string, string | number>) => v.table_name).forEach((v: Record<string, string | number>) => {
                            const construction_index = v['construction_index']
                            usedUrl += `select * from CREW_${v['table_name']} where construction_index = ? and member_index = ? and authority != -1 ; `
                            usedParams.push(construction_index, member_index)

                            delete v['table_name']
                            resultOb = {
                                ...resultOb,
                                [construction_index]: {
                                    ...v,
                                    during: false
                                }
                            }
                        })
                        if (usedUrl !== '') {
                            let usedResult = await connection.query(usedUrl, usedParams)
                            usedResult = usedResult[0]
                            if(usedResult.length === 1){
                                usedResult.filter((v: Record<string, number>) => v.construction_index).forEach((v: Record<string, number>) => {
                                    const {construction_index, authority} = v
                                    resultOb[construction_index] = {
                                        ...resultOb[construction_index],
                                        during: authority
                                    }
                                })

                            }else{
                                usedResult.filter((v: [number]) => v[0]).forEach((v: [{authority: number, construction_index: number}]) => {
                                    const {construction_index, authority} = v[0]
                                    resultOb[construction_index] = {
                                        ...resultOb[construction_index],
                                        during: authority
                                    }
                                })
                            }

                            resolve(resultOb)
                        } else {
                            resolve({})
                        }
                    } else {
                        reject([400, '잘못된 요청입니다'])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/searchConstruction, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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


const registerSaleInfo = (table_name: string, Ob: Ob) => new Promise<string>(async (resolve, reject) => {
    const {
        member_index, construction_index, purpose, status, step_count, down_date, down_ratio, rest_date, rest_ratio,
        step_1_date, step_1_ratio, step_2_date, step_2_ratio, step_3_date, step_3_ratio, step_4_date, step_4_ratio, step_5_date, step_5_ratio,
        step_6_date, step_6_ratio, step_7_date, step_7_ratio, step_8_date, step_8_ratio, step_9_date, step_9_ratio, step_10_date, step_10_ratio,
    } = Ob
    const params: Array<string | number | undefined> = [
        construction_index, purpose,
        member_index, construction_index,
        construction_index, purpose, status, step_count, down_date, down_ratio, rest_date, rest_ratio,
        step_1_date, step_1_ratio, step_2_date, step_2_ratio, step_3_date, step_3_ratio, step_4_date, step_4_ratio, step_5_date, step_5_ratio,
        step_6_date, step_6_ratio, step_7_date, step_7_ratio, step_8_date, step_8_ratio, step_9_date, step_9_ratio, step_10_date, step_10_ratio,
    ]
    const url = `
        select purpose from SALE_INFORMATION where construction_index = ? and purpose = ?;
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        insert into SALE_INFORMATION(construction_index, purpose, status, step_count, down_date, down_ratio, rest_date, rest_ratio,
            step_1_date, step_1_ratio, step_2_date, step_2_ratio, step_3_date, step_3_ratio, step_4_date, step_4_ratio, step_5_date, step_5_ratio,
            step_6_date, step_6_ratio, step_7_date, step_7_ratio, step_8_date, step_8_ratio, step_9_date, step_9_ratio, step_10_date, step_10_ratio, update_date
        ) value(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now());
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0] === undefined,  // 기 정복된 계약 확인
                        rows[1][0] !== undefined,  // 등록자 확인
                        rows[2].insertId !== 0,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve("등록 완료")
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            "이미 등록된 정보입니다",
                            "권한이 없습니다",
                            "등록에 실패하셨습니다"
                        ]
                        switch (errIndex) {
                            case 1:
                                reject([403, errMsg[errIndex]])
                                break;
                            default:
                                reject([400, errMsg[errIndex]])
                                break;
                        }


                    }

                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/registerSaleInfo, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([400, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const reviseSaleInfo = (table_name: string, Ob: Ob) => new Promise<string>(async (resolve, reject) => {
    const {
        member_index, info_index, construction_index, purpose, status, step_count, down_date, down_ratio, rest_date, rest_ratio,
        step_1_date, step_1_ratio, step_2_date, step_2_ratio, step_3_date, step_3_ratio, step_4_date, step_4_ratio, step_5_date, step_5_ratio,
        step_6_date, step_6_ratio, step_7_date, step_7_ratio, step_8_date, step_8_ratio, step_9_date, step_9_ratio, step_10_date, step_10_ratio,
    } = Ob
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        status, step_count, down_date, down_ratio, rest_date, rest_ratio,
        step_1_date, step_1_ratio, step_2_date, step_2_ratio, step_3_date, step_3_ratio, step_4_date, step_4_ratio, step_5_date, step_5_ratio,
        step_6_date, step_6_ratio, step_7_date, step_7_ratio, step_8_date, step_8_ratio, step_9_date, step_9_ratio, step_10_date, step_10_ratio,
        info_index, construction_index, purpose,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update  SALE_INFORMATION  set status = ?, step_count = ?, down_date = ?, down_ratio = ?, rest_date = ?, rest_ratio = ?,
            step_1_date = ?, step_1_ratio = ?, step_2_date = ?, step_2_ratio = ?, step_3_date = ?, step_3_ratio = ?, step_4_date = ?, step_4_ratio = ?, step_5_date = ?, step_5_ratio = ?,
            step_6_date = ?, step_6_ratio = ?, step_7_date = ?, step_7_ratio = ?, step_8_date = ?, step_8_ratio = ?, step_9_date = ?, step_9_ratio = ?, step_10_date = ?, step_10_ratio = ?, update_date = now()
        where info_index = ? and construction_index = ? and purpose = ?;
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
                        rows[1].affectedRows === 1,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve("수정 완료")
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            "권한이 없습니다",
                            "수정에 실패하셨습니다"
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/reviseSaleInfo, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([400, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})


const getSaleInfoList = (table_name: string, Ob: Ob) => new Promise<string>(async (resolve, reject) => {
    const {
        construction_index, member_index
    } = Ob
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select * from SALE_INFORMATION where construction_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getSaleInfoList, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([400, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const getArchInfo = (table_name: string, Ob: Ob) => new Promise<string>(async (resolve, reject) => {
    const {
        construction_index, member_index
    } = Ob
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index =?  and authority in (${ACCESS_AUTHORITY});
        select * from CONSTRUCTION_ETC_INFO where construction_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1][0]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getArchInfo, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([400, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, '빈값이 있습니다'])
    }
})

const reviseArchInfo = (table_name: string, Ob: Ob) => new Promise<string>(async (resolve, reject) => {
    const {
        arch_land_area, arch_gross_floor_area, arch_parking_count, arch_fa_ratio, arch_btc_ratio,
        construction_info_index, construction_index, member_index
    } = Ob
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        arch_land_area, arch_gross_floor_area, arch_parking_count, arch_fa_ratio, arch_btc_ratio,
        construction_info_index, construction_index,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONSTRUCTION_ETC_INFO set arch_land_area = ?, arch_gross_floor_area = ?, arch_parking_count = ?, arch_fa_ratio = ?, arch_btc_ratio = ?, update_date = now() where construction_info_index = ? and construction_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1].affectedRows === 1,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve("수정 완료")
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            "권한이 없습니다",
                            "수정에 실패하셨습니다"
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/reviseArchInfo, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getDongSummary = (bodyOb: Ob) => new Promise<Array<string>>(async (resolve, reject) => {
    const {
        table_name, construction_index, member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index,  construction_index
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index =?  and authority in (${ACCESS_AUTHORITY});
        select a.contract_date, a.purpose, a.dong, a.status, a.parcel_area, a.origin_price, b.sale_price as parcel_price  from (select * from CONTRACT_${table_name} where construction_index = ?  and (( date_format( contract_date, '%Y-%m-%d')  < date_format(now(), '%Y-%m-%d')) or ( date_format( now(), '%Y-%m-%d')  = date_format(contract_date, '%Y-%m-%d')) or contract_date is null )) as a left join PARCEL_${table_name} as b on a.contract_index = b.contract_index order by contract_date asc;
        SELECT purpose FROM CONTRACT_${table_name} where construction_index = ? group by purpose;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]
                    if(rows[0][0] !== undefined){
                        resolve([rows[1], rows[2]])
                    }else{
                        reject([403, '권한이 없습니다'])
                    }
                } catch (error: any) {
                    if (error.sqlMessage.includes("doesn't exist")) {
                        reject([400, '잘못된 정보입니다'])
                    } else {
                        Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/construction/getDongSummary , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                        reject([500, '관리자에게 문의바랍니다']);
                    }
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
    checkAuthority,
    getConstruction,
    registerConstruction,
    reviseConstruction,
    searchConstruction,
    registerSaleInfo,
    reviseSaleInfo,
    getSaleInfoList,
    getArchInfo,
    reviseArchInfo,
    getDongSummary
};
export default Mysql
