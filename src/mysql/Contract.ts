import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env
type bodyOb_N = Record<string, number | undefined>;
type bodyOb = Record<string, number | string | undefined>;

type CONTRACT_BODY = bodyOb & {
    price: number
    purpose: string
}


const getContractList = (table_name: string, body: bodyOb_N) => new Promise<string>(async (resolve, reject) => {
    const { member_index, start_limit, end_limit, construction_index } = body
    const params: Array<number | undefined> = [member_index, construction_index, construction_index, construction_index, Number(start_limit), Number(end_limit)]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select 
            a.construction_index, a.contract_index, a.crew_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.register_date, a.large_stake, a.building_proportions, a.dedicated_rate, a.purpose, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price, b.update_date 
        from (select * from CONTRACT_${table_name} where construction_index = ? and (status > 0 or status = 0)) as a inner join CONTRACT_ORIGIN_${table_name} as b on b.construction_index = ? and a.dong = b.dong and a.hosil = b.hosil order by dong, layer, hosil asc limit ?, ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getContractList, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getContractListByKeyword = (table_name: string, body: bodyOb_N) => new Promise<string>(async (resolve, reject) => {
    const { construction_index, member_index, dong, hosil } = body
    const params: Array<string | number | undefined> = [member_index, construction_index, construction_index, dong, hosil, construction_index]
    // `%${dong}%`, `%${hosil}%`
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and  authority in (${ACCESS_AUTHORITY});
        select 
            a.construction_index, a.contract_index, a.crew_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.register_date, a.large_stake, a.building_proportions, a.dedicated_rate, a.purpose, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price, b.update_date 
        from (select * from CONTRACT_${table_name} where construction_index = ? and (status > 0 or status = 0) and dong = ? and hosil = ?) as a inner join CONTRACT_ORIGIN_${table_name} as b on b.construction_index = ? and a.dong = b.dong and a.hosil = b.hosil;
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getContractListByKeyword, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getContractListByHosil = (table_name: string, body: bodyOb_N) => new Promise<string>(async (resolve, reject) => {
    const { construction_index, member_index, hosil } = body
    const params: Array<string | number | undefined> = [member_index, construction_index, construction_index, `${hosil}%`, construction_index]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select 
            a.construction_index, a.contract_index, a.crew_index, a.status, a.contract_type, a.dong, a.hosil, a.private_area, a.public_area, a.parcel_area, a.register_date, a.large_stake, a.building_proportions, a.dedicated_rate, a.purpose, a.origin_price,
            b.origin_index, b.av_price, b.land_cost, b.building_cost, b.vat, b.sale_price, b.update_date 
        from (select * from CONTRACT_${table_name} where construction_index = ? and (status > 0 or status = 0) and hosil like ?) as a inner join CONTRACT_ORIGIN_${table_name} as b on b.construction_index = ? and a.dong = b.dong and a.hosil = b.hosil;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1]) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getContractListByHosil, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getDongList = (table_name: string, body: bodyOb_N) => new Promise<string>(async (resolve, reject) => {
    const { construction_index, member_index, dong, hosil } = body
    const params: Array<string | number | undefined> = [member_index, construction_index, construction_index]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        SELECT * FROM CONTRACT_${table_name} where construction_index = ? GROUP by dong;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    rows[0][0] ? resolve(rows[1].map((v: {dong: string})=> v.dong)) : reject([403, "권한이 없습니다"])
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/getDongList, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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


// const registerContract = (table_name: string, bodyOb: CONTRACT_BODY) => new Promise<string>(async (resolve, reject) => {
//     const {
//         construction_index, dong, hosil, private_area, public_area, parcel_area, av_price, price,
//         large_stake, land_cost, building_cost, vat_cost, vat_price, building_proportions, dedicated_rate, purpose, member_index
//     } = bodyOb
//     const params: Array<string | number | undefined> = [
//         construction_index, construction_index,
//         construction_index, dong, hosil,
//         member_index, construction_index,
//         construction_index, purpose,
//     ]

//     const url = `
//         select if((select count(*) from CONTRACT_${table_name} where construction_index = ?) < (SELECT max_count FROM CONSTRUCTION_SITE where construction_index = ?), 1, 0) as result;
//         select contract_index from CONTRACT_${table_name} where construction_index = ? and dong = ? and hosil = ? and (status > 0 or status = 0);
//         select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
//         select status, down_payment, step_1, step_2, step_3, step_4, rest_payment  from SALE_INFORMATION where construction_index = ? and purpose = ?;
//     `
//     if (!params.includes(undefined)) {
//         MysqlPool.getConnection()
//             .then(async (connection: any) => {
//                 try {
//                     await connection.beginTransaction()
//                     let rows = await connection.query(url, params)
//                     rows = rows[0]

//                     const filterErr = [
//                         rows[0][0].result === 1,   // max 확인
//                         rows[1][0] === undefined,  // 기 정복된 계약 확인
//                         rows[2][0] !== undefined,  // 등록자 확인
//                         rows[3][0] && rows[3][0].status === 1 // 진행중인 분양 기본정보 존재
//                     ]
//                     const errIndex = filterErr.indexOf(false);

//                     if (errIndex === -1) {
//                         const flag = rows[3][0] === undefined
//                         let insertParams: Array<string | number | undefined>
//                         let insertUrl;

//                         if (flag) {
//                             insertParams = [
//                                 construction_index, member_index, dong, hosil, private_area, public_area, parcel_area, av_price, price, large_stake, land_cost, building_cost, vat_cost, vat_price, building_proportions, dedicated_rate, purpose, price,
//                                 construction_index, purpose, construction_index, purpose
//                             ]
//                             insertUrl = `
//                             insert into CONTRACT_${table_name}(construction_index, crew_index, dong, hosil, private_area, public_area, parcel_area, av_price, price, large_stake, land_cost, building_cost, vat_cost, vat_price, building_proportions, dedicated_rate, purpose, down_payment, step_1_value, step_2_value, step_3_value, step_4_value, rest_payment, update_date, register_date) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, now(), now());
//                             insert into SALE_INFORMATION(construction_index, purpose, status, down_payment, step_1, step_2, step_3, step_4, rest_payment)  values(?, ?, 0, 100, 0, 0, 0, 0, 0);
//                         `
//                         } else {
//                             const { down_payment, step_1, step_2, step_3, step_4, rest_payment } = rows[3][0]
//                             insertParams = [
//                                 construction_index, member_index, dong, hosil, private_area, public_area, parcel_area, av_price, price, large_stake, land_cost, building_cost, vat_cost, vat_price, building_proportions, dedicated_rate, purpose, price * (down_payment / 100), price * (step_1 / 100), price * (step_2 / 100), price * (step_3 / 100), price * (step_4 / 100), price * (rest_payment / 100)
//                             ]
//                             insertUrl = `
//                             insert into CONTRACT_${table_name}(construction_index, crew_index, dong, hosil, private_area, public_area, parcel_area, av_price, price, large_stake, land_cost, building_cost, vat_cost, vat_price, building_proportions, dedicated_rate, purpose, down_payment, step_1_value, step_2_value, step_3_value, step_4_value, rest_payment, update_date, register_date) values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now());
//                         `
//                         }

//                         const insertRows = await connection.query(insertUrl, insertParams)
//                         if ((flag && insertRows[0][0].insertId !== 0) || (!flag && insertRows[0].insertId !== 0)) {
//                             await connection.commit()
//                             resolve('등록 완료')
//                         } else {
//                             await connection.rollback();
//                             reject([400, '등록에 실패하셨습니다'])
//                         }
//                     } else {
//                         const errMsg = [
//                             '최대 계약건을 넘기셨습니다. 고객센터에 문의해주세요',
//                             '이미 등록된 계약입니다',
//                             '권한이 없습니다',
//                             '승인 대기중인 분양기본정보가 있습니다'
//                         ]
//                         switch (errIndex) {
//                             case 2:
//                                 reject([403, errMsg[errIndex]])
//                                 break;
//                             default:
//                                 reject([400, errMsg[errIndex]])
//                                 break;
//                         }
//                     }

//                 } catch (error) {
//                     await connection.rollback();
//                     Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/registerContract, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
//                     reject([500, '관리자에게 문의바랍니다']);
//                 } finally {
//                     await connection.release()
//                 }
//             })
//             .catch((err: string) => {
//                 reject([500, err || '다시 시도해주세요'])
//             })
//     } else {
//         reject([400, '빈값이 있습니다'])
//     }
// })

const registerContractBulk = (table_name: string, bodyOb: { parsed_bulk: CONTRACT_BODY[], member_index: number, construction_index: number }) => new Promise<string>(async (resolve, reject) => {
    const { parsed_bulk, member_index, construction_index } = bodyOb
    let bulk_url = ``

    parsed_bulk.forEach((v: CONTRACT_BODY) => {
        if (bodyOb.construction_index !== v.construction_index) {
            reject([400, "다른 현장 정보가 있습니다"])
            return
        }

        const { dong, hosil, purpose } = v
        bulk_url += `(dong = '${dong}' and hosil = '${hosil}' ) or `;
    })

    // purpose_str, bulk_url 끝맺음
    if (bulk_url !== "") {
        bulk_url += ` 0`
    }


    const params: Array<string | number | undefined> = [
        construction_index, parsed_bulk.length, construction_index,
        member_index, construction_index, 
        construction_index,
        construction_index
    ]

    const url = `
        select if((select count(*) from CONTRACT_${table_name} where construction_index = ?) + ? <= (SELECT max_count FROM CONSTRUCTION_SITE where construction_index = ?), 1, 0) as result;
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index from CONTRACT_${table_name} where construction_index = ? and (${bulk_url}) and  (status > 0 or status = 0);
        select * from SALE_INFORMATION where construction_index = ?; 
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0].result === 1,   // max 확인
                        rows[1][0] !== undefined,  // 등록자 확인
                        rows[2][0] === undefined,  // 기 정복된 계약 확인
                        // rows[3].affectedRows === parsed_bulk.length,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        const rows3Length = rows[3].length
                        // 납부 설정 정보, 계약 정보, 원분양 정보 인서트 해야함
                        // 없는 용도면 sale_information에 등록
                        // 여러개 올라가면 inserId 어떻게 내려오는지 확인 최초 값만 내려엄. contract 테이블과 파생 테이블간 관계성 현장 인덱스랑 동으로?

                        let purposeArr: string[] = []  //= rows[3].map((v: Record<string, string | number>) => v.purpose)
                        let insertUrl = `insert into CONTRACT_${table_name}(construction_index, crew_index, contract_type, dong, hosil, layer, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, origin_price, purpose, register_date) values`
                        let insertOriginUrl = `insert into CONTRACT_ORIGIN_${table_name}(construction_index, dong, hosil, av_price, land_cost, building_cost, vat, sale_price) values`
                        let insertPurposeUrl = `insert into SALE_INFORMATION(construction_index, purpose, status, update_date) values`
                        let urlParams: Array<string | number | undefined> = []
                        let originParams: Array<string | number | undefined> = []
                        let purposeParams: Array<string | number | undefined> = []


                        for (let i = 0; i < rows3Length; i++) {
                            const { purpose } = rows[3][i]
                            // registeredPurposeOb = {
                            //     ...registeredPurposeOb,
                            //     [purpose]: rows[3][i]
                            // }
                            purposeArr.push(purpose)
                        }

                        try {
                            parsed_bulk.forEach((v: CONTRACT_BODY) => {
                                const { construction_index, dong, hosil, layer, private_area, public_area, parcel_area, av_price, origin_price, large_stake, land_cost, building_cost, vat, sale_price, building_proportions, dedicated_rate, purpose } = v
                                // 없는 용도는 납부비율 정보로 추가
                                if (!purposeArr.includes(purpose)) {
                                    insertPurposeUrl += ` (?, ?, 0, now() ),`
                                    purposeParams.push(construction_index, purpose)

                                    //분양기본정보를 임의로 넣는 부분. 이때 status=1로 잠시 지정
                                    if (purpose.length > 10) {
                                        reject([400, '용도는 10글자내로 작성해주세요'])
                                        return
                                    }else{
                                        purposeArr.push(purpose)
                                    }
                                } 
                                insertUrl += ` (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now()),`
                                insertOriginUrl += ` (?, ?, ?, ?, ?, ?, ?, ?),`
                                urlParams.push(construction_index, member_index, dong, hosil, layer, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, origin_price, purpose)
                                originParams.push(construction_index, dong, hosil, av_price, land_cost, building_cost, vat, sale_price)
                            })
                        } catch (err) {
                            reject([400, err])
                            return
                        }

                        const flag1 = insertUrl !== `insert into CONTRACT_${table_name}(construction_index, crew_index, contract_type, dong, hosil, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, origin_price, purpose, register_date) values`
                        const flag2 = insertOriginUrl !==   `insert into CONTRACT_ORIGIN_${table_name}(construction_index, dong, hosil, av_price, land_cost, building_cost, vat, sale_price) values`
                        const flag3 = insertPurposeUrl !==  `insert into SALE_INFORMATION(construction_index, purpose, status, update_date) values`
                        const flag4 = flag1 && flag2 && flag3
                        const insertUrlSum = `
                            ${flag1 ? Common.filterLastChar(insertUrl, ",") + " ;" : ""}
                            ${flag2 ? Common.filterLastChar(insertOriginUrl, ",") + " ;" : ""}
                            ${flag3 ? Common.filterLastChar(insertPurposeUrl, ",") + ";" : ""}
                        `
                        await connection.beginTransaction()
                        const insertRows = await connection.query(insertUrlSum, [...urlParams, ...originParams, ...purposeParams] )

                        if ((flag4 && insertRows[0][0].insertId !== 0) || (!flag4 && insertRows[0].insertId !== 0)) {
                            await connection.commit()
                            resolve("등록 완료")
                        } else {
                            await connection.rollback();
                            reject([400, "등록에 실패하셨습니다"])
                        }
                    } else {
                        const errMsg = [
                            '최대 계약건을 넘기셨습니다. 고객센터에 문의해주세요',
                            '권한이 없습니다',
                            '이미 등록된 계약이 있습니다',
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/registerContractBulk, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reviseContract = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        contract_index, construction_index, dong, hosil, private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, 
        av_price, origin_price, land_cost, building_cost, vat, purpose, member_index, sale_price
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        private_area, public_area, parcel_area, dedicated_rate, large_stake, building_proportions, purpose, origin_price, contract_index, construction_index, dong, hosil,
        av_price, land_cost, building_cost, vat, sale_price, construction_index, dong, hosil
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONTRACT_${table_name} set  private_area = ?, public_area = ?, parcel_area = ?,  dedicated_rate = ?, large_stake = ?, building_proportions = ?, purpose = ?, origin_price = ?, update_date = now() where contract_index =? and construction_index = ? and dong = ? and hosil = ? and status = 0 and contract_type in (0, 1);
        update CONTRACT_ORIGIN_${table_name} set   av_price = ?, land_cost = ?, building_cost = ?, vat = ?, sale_price = ?, update_date = now() where construction_index = ? and dong = ? and hosil = ?;
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
                        rows[1].changedRows !== 0 && rows[2].changedRows !== 0,,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '수정에 실패하셨습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/contract/reviseContract, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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
    getContractList,
    getContractListByKeyword,
    getContractListByHosil,
    getDongList,
    // registerContract,
    registerContractBulk,
    reviseContract,
};
export default Mysql