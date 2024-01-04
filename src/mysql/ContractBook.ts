import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from "../js/StringJs";


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env
type bodyOb = Record<string, number | string>;
type paramsOb = Record<string, number | string | undefined>;

type CONTRACT_OB = paramsOb & {
    filter_ob: {
        f_start_date: Date
        f_end_date: Date
        status_arr: number[]
        purpose_arr: string[]
    }
}

// type CONTRACTER_RESULT = Record<string, FILTER_OB>

// resultOb = {
//     ...resultOb,
//     [contract_index]: {
//         ...v,
//         contracter_info: []
//     }
// }


const getParcelList = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        member_index, construction_index, start_index, count
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, Number(start_index), Number(count)
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select  
            a.contract_index, a.construction_index, a.status, a.contract_type, a.dong, a.hosil, a.origin_price, a.private_area, a.public_area, a.parcel_area, a.dedicated_rate, a.large_stake, a.building_proportions, a.purpose,
            b.parcel_index, b.sale_price, b.discount_payment, b.discount_ratio, b.av_price, b.land_cost, b.building_cost, b.parcel_price, b.vat, b.sale_price
        from (select contract_index, construction_index, status, contract_type, dong, hosil, layer,  origin_price, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, purpose from CONTRACT_${table_name} where construction_index = ?) as a inner join  PARCEL_${table_name} as b on a.contract_index = b.contract_index order by dong, layer, hosil asc limit ?, ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, '권한이 없습니다'])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getParcelList , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([400, '계약에 실패하셨습니다'])
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

const getContracterList = (table_name: string, bodyOb: bodyOb) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, start_index, count
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, Number(start_index), Number(count)
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select contract_index, construction_index, status, contract_type, dong, hosil, origin_price, contract_date, contract_code from CONTRACT_${table_name} where construction_index = ? order by dong, layer, hosil asc limit ?, ?;
    `
    
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        // resultOb 타입 지정에 시간이 오래 걸려 any로 뒀습니다
                        let contractIndexQuery = '0'
                        let resultOb: any = {}

                        rows[1].forEach((v: bodyOb) =>{
                            const { contract_index } = v
                            contractIndexQuery += ` , ${contract_index}`
                            resultOb = {
                                ...resultOb,
                                [contract_index]: {
                                    ...v,
                                    contracter_info: []
                                }
                            }
                        })

                        if(contractIndexQuery !== '0'){
                            let contracterResult = await connection.query(`
                                select contracter_index, contract_index, business_index, status as contracter_status, hand_date, hand_number, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email from CONTRACTER_${table_name} where contract_index in (${contractIndexQuery});
                            `)
                            contracterResult[0].forEach((v: bodyOb) => {
                                const { contract_index } = v
                                resultOb[contract_index].contracter_info.push(v)
                            })

                            resolve(StringJs.objectToArray(resultOb))
                        }else{
                            resolve([])
                        }
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContracterList , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, error || '다시 시도해주세요'])
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

const getBusinessList = (table_name: string, bodyOb: bodyOb) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, start_index, count
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, Number(start_index), Number(count)
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select contract_index, construction_index, status, contract_type, dong, hosil, origin_price, contract_date, contract_code from CONTRACT_${table_name} where construction_index = ?  order by dong, layer, hosil asc limit ?, ?;
    `
    
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        // resultOb 타입 지정에 시간이 오래 걸려 any로 뒀습니다
                        let contractIndexQuery = '0'
                        let resultOb: any = {}

                        rows[1].forEach((v: bodyOb) =>{
                            const { contract_index } = v
                            contractIndexQuery += ` , ${contract_index}`
                            resultOb = {
                                ...resultOb,
                                [contract_index]: {
                                    ...v,
                                    business_info: []
                                }
                            }
                        })

                        if(contractIndexQuery !== '0'){
                            let contracterResult = await connection.query(`
                                select business_index, contract_index, business_number, business_name, business_representative, business_type, business_event, business_address, business_email from BUSINESS_${table_name} where contract_index in (${contractIndexQuery}) and status = 1;
                            `)
                            contracterResult[0].forEach((v: bodyOb) => {
                                const { contract_index } = v
                                resultOb[contract_index].business_info.push(v)
                            })

                            resolve(StringJs.objectToArray(resultOb))
                        }else{
                            resolve([])
                        }
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getBusinessList , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject('빈값이 있습니다')
    }
})

const getPaymentList = (table_name: string, bodyOb: bodyOb) => new Promise<string | Array<Object>>(async (resolve, reject) => {
    const {
        member_index, construction_index, start_index, count
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, Number(start_index), Number(count), construction_index
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select  * from (select contract_index, construction_index, status, contract_type, dong, hosil, layer, origin_price, purpose from CONTRACT_${table_name} where construction_index = ?) as a inner join  PAY_${table_name} as b on a.contract_index = b.contract_index order by dong, layer, hosil asc limit ?, ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    let payOb: any = {}
                    let maxStep: number = 0

                    rows = rows[0]


                    rows[1].forEach((v: {contract_index: number, degree: number}) => {
                        const { contract_index, degree } = v
                        const preOb = payOb[contract_index]
                        // pay 추가로 인해 차수별 두개 존재할수 있지만, 향후 pay 추가 고도화시 중복 발생 절대 안함
                        // const preArr = payOb[contract_index][degree] ? payOb[contract_index][degree] : []
                        payOb = {
                            ...payOb,
                            [contract_index]: [
                                ...(preOb || []),
                                v
                            ]
                        }
                        maxStep = maxStep < degree ? degree : maxStep
                    })

                    rows[0][0] ? resolve([payOb, maxStep]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getPaymentList , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, "빈값이 있습니다"])
    }
})


const getHandOverList = (table_name: string, bodyOb: bodyOb) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, contract_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,  construction_index, contract_index, construction_index, contract_index,
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY}); 
        select business_index, contract_index, status as business_status,  business_number, business_name, business_representative, business_type, business_event, business_address, business_email from BUSINESS_${table_name} where construction_index = ? and contract_index = ?;
        select contracter_index, contract_index, business_index, status as contracter_status, hand_date, hand_number, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email from CONTRACTER_${table_name} where construction_index = ? and contract_index = ?;
    `
    
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve([rows[1], rows[2]]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getHandOverList , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([400, "빈값이 있습니다"])
    }
})



const getContractBook = (table_name: string, bodyOb: CONTRACT_OB) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, start_index, count, filter_ob
    } = bodyOb
    const { f_start_date, f_end_date, status_arr, purpose_arr } = filter_ob
    const params: Array<string | number | undefined | Date> = [
        member_index, construction_index, 
        construction_index, f_start_date, f_start_date, f_end_date, f_end_date, Number(start_index), Number(count), construction_index
    ]

    //CONTRACT_ORIGIN_안에 현장 인덱스 많지 않아 인덱싱 처리 안함 -> type ALL로 일단은 진행
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select 
            a.contract_index, a.construction_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.dedicated_rate, a.large_stake, a.building_proportions, a.purpose, a.contract_date, a.contract_code, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price
        from (select * from CONTRACT_${table_name} where construction_index = ? and status in (${ StringJs.arrayToStingNum(status_arr)}) and purpose in (${ StringJs.arrayToStingString(purpose_arr)}) and (((? < contract_date or ? = contract_date) and (contract_date < ? or contract_date  = ?)) or contract_date is null) order by dong, layer, hosil asc limit ?, ?) as a inner join  CONTRACT_ORIGIN_${table_name} as b on a.dong = b.dong and a.hosil = b.hosil and b.construction_index = ?  order by dong, layer, hosil asc;
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        getContractBookAddedInfo(table_name, {
                            contract_arr: rows[1],
                            connection
                        })
                        .then(v => resolve(v))
                        .catch(v => reject(v))
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContractBook , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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


const getContractBookByHosil = (table_name: string, bodyOb: CONTRACT_OB) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, hosil, filter_ob
    } = bodyOb
    const { f_start_date, f_end_date, status_arr, purpose_arr } = filter_ob
    const params: Array<string | number | undefined | Date> = [
        member_index, construction_index, 
        construction_index, `${hosil}%`, f_start_date, f_start_date, f_end_date, f_end_date, construction_index
    ]
    
    //CONTRACT_ORIGIN_안에 현장 인덱스 많지 않아 인덱싱 처리 안함 -> type ALL로 일단은 진행
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select 
            a.contract_index, a.construction_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.dedicated_rate, a.large_stake, a.building_proportions, a.purpose, a.contract_date, a.contract_code, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price
        from (select * from CONTRACT_${table_name} where construction_index = ? and  hosil like ? and status in (${ StringJs.arrayToStingNum(status_arr)}) and purpose in (${ StringJs.arrayToStingString(purpose_arr)}) and (((? < contract_date or ? = contract_date) and (contract_date < ? or contract_date  = ?)) or contract_date is null)  order by dong, layer, hosil asc) as a inner join  CONTRACT_ORIGIN_${table_name} as b on a.dong = b.dong and a.hosil = b.hosil and b.construction_index = ?  order by dong, layer, hosil asc;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        getContractBookAddedInfo(table_name, {
                            contract_arr: rows[1],
                            connection
                        })
                        .then(v => resolve(v))
                        .catch(v => reject(v))
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContractBookByHosil , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getContractBookByDongHosil = (table_name: string, bodyOb: bodyOb) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index, hosil, dong
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index, dong, hosil,
        construction_index,  construction_index
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select 
            a.contract_index, a.construction_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.dedicated_rate, a.large_stake, a.building_proportions, a.purpose, a.contract_date, a.contract_code, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price
        from (select * from CONTRACT_${table_name} where construction_index = ? and dong = ? and hosil = ? order by dong, layer, hosil asc) as a inner join  CONTRACT_ORIGIN_${table_name} as b on a.dong = b.dong and a.hosil = b.hosil and b.construction_index = ?  order by dong, layer, hosil asc;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        getContractBookAddedInfo(table_name, {
                            contract_arr: rows[1],
                            connection
                        })
                        .then(v => resolve(v))
                        .catch(v => reject(v))
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContractBookByDongHosil , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getContractBookAddedInfo = (table_name: string, Ob: {contract_arr: any, connection: any}) => new Promise<[] | {}>(async (resolve, reject) => {
    // contract_arr, connection 타입 지정 필요성 못느껴 any처리
    const {
        contract_arr, connection
    } = Ob
    
    try {
        // contracterOb 타입 지정에 시간이 오래 걸려 any로 뒀습니다
        let contractIndexQuery = '-1'
        let contracterOb: any = {}
        let businessOb: any = {}
        let parcelOb: any = {}
        let payOb: any = {}

        contract_arr.forEach((v: bodyOb) =>{
            const { contract_index } = v
            contractIndexQuery += ` , ${contract_index}`
            
            contracterOb = {
                ...contracterOb,
                [contract_index]: []
            }
            businessOb = {
                ...businessOb,
                [contract_index]: []
            }
            parcelOb = {
                ...parcelOb,
                [contract_index]: []
            }
            payOb = {
                ...payOb,
                [contract_index]: []
            }
        })

        if(contractIndexQuery !== '-1'){
            let max_degree = 0
            let rows2 = await connection.query(`
                select business_index, contract_index, status as business_status, business_number, business_name, business_representative, business_type, business_event, business_address, business_email from BUSINESS_${table_name} where contract_index in (${contractIndexQuery}) and status = 1;
                select contracter_index, contract_index, business_index, status as contracter_status, hand_date, hand_number, contracter_name, unique_number, contracter_phone, contracter_address, contracter_birth, contracter_sex, contracter_email from CONTRACTER_${table_name} where contract_index in (${contractIndexQuery});
                select parcel_index, contract_index, discount_payment, discount_ratio, av_price, land_cost, building_cost, parcel_price, vat, sale_price from PARCEL_${table_name} where contract_index in (${contractIndexQuery});
                select * from PAY_${table_name} where contract_index in (${contractIndexQuery});
            `, [ ])
            rows2 = rows2[0]

            rows2[0].forEach((v: bodyOb) => {
                const { contract_index } = v
                businessOb[contract_index].push(v)

            })
            rows2[1].forEach((v: bodyOb) => {
                const { contract_index } = v
                contracterOb[contract_index].push(v)
            })
            rows2[2].forEach((v: bodyOb) => {
                const { contract_index } = v
                parcelOb[contract_index].push(v)
            })

            rows2[3].forEach((v: {contract_index: number, degree: number}) => {
                const { contract_index, degree } = v
                const preOb = payOb[contract_index]
                // pay 추가로 인해 차수별 두개 존재할수 있지만, 향후 pay 추가 고도화시 중복 발생 절대 안함
                // const preArr = payOb[contract_index][degree] ? payOb[contract_index][degree] : []
                payOb = {
                    ...payOb,
                    [contract_index]: [
                        ...(preOb || []),
                        v
                    ]
                }
                max_degree = max_degree < degree ? degree : max_degree
            })
        

            resolve({
                contract_arr: contract_arr || [],
                contracter_ob: contracterOb,
                business_ob: businessOb,
                parcel_ob: parcelOb,
                pay_ob: payOb,
                max_degree,
            })
        }else{
            resolve([])
        }
    } catch (error) {
        Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContractBookAddedInfo , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
        reject([500, '관리자에게 문의바랍니다']);
    }
})

const getContractBookFilter = (table_name: string, bodyOb: bodyOb) => new Promise<[] | {}>(async (resolve, reject) => {
    const {
        member_index, construction_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, construction_index
    ]

    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select purpose from CONTRACT_${table_name} where construction_index = ? group by purpose;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if(rows[0][0]){
                        resolve(rows[1].map((v: {purpose: string}) => v.purpose))
                    }else{
                        reject([403, "권한이 없습니다"])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract_book/getContractBookFilter , ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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
    getParcelList,
    getContracterList,
    getBusinessList,
    getPaymentList,
    getHandOverList,
    getContractBook,
    getContractBookByHosil,
    getContractBookByDongHosil,
    getContractBookFilter
};
export default Mysql