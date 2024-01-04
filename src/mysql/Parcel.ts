import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';


const { path } = Module;
const { ACCESS_AUTHORITY } = process.env

type bodyOb = Record<string, number | string>;
type PAY_STEP_BODY = bodyOb & {
    down_payment: number
    step_1_value: number
    step_2_value: number
    step_3_value: number
    step_4_value: number
    rest_payment: number
}

const registerParcel = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        contract_number, contract_date, parcel_price,
        construction_index, contract_index, contracter_name, contracter_number, contracter_phone, contracter_address,
        business_number, business_name, business_people, business_type, business_target, business_address, business_email,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        contract_index, construction_index, member_index, construction_index, 
        contract_index, contracter_name, contracter_number, contracter_phone, contracter_address,
        business_number, business_name, business_people, business_type, business_target, business_address, business_email,
    ]
    const url = `
        select contract_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and status = 0 and contract_type = 0 and parcel_index = 0;
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        insert into PARCEL_${table_name}(contract_index, contracter_name, contracter_number, contracter_phone, contracter_address, business_number, business_name, business_people, business_type, business_target, business_address, business_email,  update_date) value(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now());
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 기 등록된된 계약 확인
                        rows[1][0] !== undefined,  // 등록자 확인
                        rows[2].insertId !== 0,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        const url = `
                        update CONTRACT_${table_name} set status = 3, contract_type = 1, parcel_index = ?, parcel_price=?, contract_number = ?, contract_date = ? where construction_index = ? and contract_index = ? and status = 0 and parcel_index = 0;
                    `
                        const update_rows = await connection.query(url, [rows[2].insertId, parcel_price, contract_number, contract_date, construction_index, contract_index])
                        if (update_rows[0].changedRows === 1) {
                            await connection.commit()
                            resolve('등록 완료했습니다')
                        } else {
                            await connection.rollback();
                            reject([400, '등록 실패했습니다'])
                        }
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '등록 가능한 계약이 아닙니다',
                            '권한이 없습니다',
                            '등록에 실패하셨습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/registerContract, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reviseParcelContracter = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        contract_number, contract_date, parcel_index,
        construction_index, contract_index, contracter_name, contracter_number, contracter_phone, contracter_address,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        contract_number, contract_date, contract_index, construction_index, parcel_index,
        contracter_name, contracter_number, contracter_phone, contracter_address, parcel_index, contract_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONTRACT_${table_name} set contract_number = ?, contract_date = ? where contract_index = ? and construction_index = ? and parcel_index = ? and status = 3 and contract_type = 1;
        update PARCEL_${table_name} set contracter_name = ?, contracter_number = ?, contracter_phone = ?, contracter_address = ?, update_date = now() where parcel_index = ? and contract_index = ? and status = 1;
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]
                    const contract_result = rows[1]
                    const parcel_result = rows[2]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        contract_result.affectedRows === 1 && parcel_result.affectedRows === 1,    // 계약 정보 변경 성공 여부 확인
                        parcel_result.changedRows === 1,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료했습니다')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '수정에 실패하셨습니다',
                            '수정할 내용이 없습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/reviseParcelContracter, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reviseParcelBusiness = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        parcel_index,
        construction_index, contract_index, business_number, business_name, business_people, business_type, business_target, business_address, business_email,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        contract_index, construction_index, parcel_index,
        business_number, business_name, business_people, business_type, business_target, business_address, business_email, parcel_index, contract_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and parcel_index = ? and status = 3 and contract_type = 1;
        update PARCEL_${table_name} set business_number = ?, business_name = ?, business_people = ?, business_type = ?, business_target = ?, business_address = ?, business_email = ?, update_date = now() where parcel_index = ? and contract_index = ? and status = 1;
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let rows = await connection.query(url, params)
                    rows = rows[0]
                    const parcel_result = rows[2]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 등록자 확인
                        rows[1][0] !== undefined,  // 기 등록된된 계약 확인
                        parcel_result.affectedRows === 1,    // 계약 정보 변경 성공 여부 확인
                        parcel_result.changedRows === 1,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료했습니다')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '수정 가능한 계약이 아닙니다',
                            '수정에 실패하셨습니다',
                            '수정할 내용이 없습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/reviseParcelBusiness, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, '관리자에게 문의바랍니다']);
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject([500, err || '다시 시도해주세요'])
            })
    } else {
        reject([500, '빈값이 있습니다'])
    }
})

const revisePayStep = (table_name: string, bodyOb: PAY_STEP_BODY) => new Promise<string>(async (resolve, reject) => {
    const {
        construction_index, contract_index, down_payment,
        step_1_date, step_2_date, step_3_date, step_4_date, step_rest_date,
        step_1_value, step_2_value, step_3_value, step_4_value, rest_payment,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        down_payment,
        step_1_date, step_2_date, step_3_date, step_4_date, step_rest_date,
        step_1_value, step_2_value, step_3_value, step_4_value, rest_payment, contract_index, construction_index,
        down_payment + step_1_value + step_2_value + step_3_value + step_4_value + rest_payment,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONTRACT_${table_name} set 
            down_payment = ?, 
            step_1_date = ? , step_2_date = ? , step_3_date = ?, step_4_date = ?, step_rest_date = ?,
            step_1_value = ?,  step_2_value = ?,  step_3_value = ?, step_4_value = ?, rest_payment = ?,
            update_date = now()
        where contract_index = ? and construction_index = ? and price = ? and status = 3 and contract_type = 1;
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
                        rows[1].affectedRows === 1,    // 계약 정보 변경 성공 여부 확인
                        rows[1].changedRows === 1,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료했습니다')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '수정에 실패하셨습니다',
                            '수정할 내용이 없습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/revisePayStep, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reviseParcelPrice = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        construction_index, contract_index, parcel_price,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        parcel_price, contract_index, construction_index,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONTRACT_${table_name} set parcel_price = ?, update_date = now() where contract_index = ? and construction_index = ? and status = 3 and contract_type = 1;
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
                        rows[1].affectedRows === 1,    // 계약 정보 변경 성공 여부 확인
                        rows[1].changedRows === 1,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('수정 완료했습니다')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '수정에 실패하셨습니다',
                            '수정할 내용이 없습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/reviseParcelPrice, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const deleteParcel = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        construction_index, contract_index, parcel_index,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        contract_index, construction_index, parcel_index,
        parcel_index, contract_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        update CONTRACT_${table_name} set 
            status = 0, contract_type = 0,
            parcel_index = 0, parcel_price = 0, contract_number = null, contract_date = null, down_payment = 0, 
            step_1_date = null, step_2_date = null, step_3_date = null, step_4_date = null, step_rest_date = null, 
            step_1_value = 0, step_2_value = 0, step_3_value = 0, step_4_value = 0, rest_payment = 0, 
            update_date = now() 
        where contract_index = ? and construction_index = ? and parcel_index = ? and status = 3 and contract_type = 1;
        update PARCEL_${table_name} set status = -1, update_date = now() where parcel_index = ? and contract_index = ? and status = 1;
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
                        rows[1].affectedRows === 1 && rows[2].affectedRows === 1,    // 계약 정보 변경 성공 여부 확인
                        rows[1].changedRows === 1 && rows[2].changedRows === 1,    // 성공 여부 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('삭제 완료했습니다')
                    } else {
                        await connection.rollback();
                        const errMsg = [
                            '권한이 없습니다',
                            '삭제에 실패하셨습니다',
                            '삭제할 내용이 없습니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/deleteParcel, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const handOverParcel = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        parcel_index,
        construction_index, contract_index, contracter_name, contracter_number, contracter_phone, contracter_address,
        business_number, business_name, business_people, business_type, business_target, business_address, business_email,
        member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index,
        contract_index, construction_index, parcel_index,
        contract_index, parcel_index, contracter_name, contracter_number, contracter_phone, contracter_address,
        business_number, business_name, business_people, business_type, business_target, business_address, business_email,
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index, parcel_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and parcel_index =? and status = 3 and contract_type = 1;
        insert into PARCEL_${table_name}(contract_index, before_parcel_index, contracter_name, contracter_number, contracter_phone, contracter_address, business_number, business_name, business_people, business_type, business_target, business_address, business_email,  update_date) value(?, ?,  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now());
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
                        rows[2].insertId !== 0,    // 성공 여부 확인
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        const url = `
                            update CONTRACT_${table_name} set parcel_index = ?, update_date=now() where construction_index = ? and contract_index = ? and status = 3 and contract_type = 1;
                            update PARCEL_${table_name} set status = 2, update_date=now() where parcel_index = ? and contract_index = ? and status = 1;
                        `
                        let update_rows = await connection.query(url, [
                            rows[2].insertId, construction_index, contract_index,
                            rows[1][0].parcel_index, contract_index
                        ])
                        update_rows = update_rows[0]
                        if (update_rows[0].changedRows === 1 && update_rows[1].changedRows === 1) {
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

                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/handOverParcel, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const getHandOverList = (table_name: string, bodyOb: bodyOb) => new Promise<string>(async (resolve, reject) => {
    const {
        contract_index, construction_index, member_index
    } = bodyOb
    const params: Array<string | number | undefined> = [
        member_index, construction_index, contract_index, construction_index, contract_index
    ]
    const url = `
        select crew_index from CREW_${table_name} where member_index = ? and construction_index = ? and authority in (${ACCESS_AUTHORITY});
        select contract_index, parcel_index from CONTRACT_${table_name} where contract_index = ? and construction_index = ? and status = 3;
        select * from PARCEL_${table_name} where contract_index = ? and status in (1, 2)
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    const filterErr = [
                        rows[0][0] !== undefined,  // 관리자 확인
                        rows[1][0] !== undefined,  // 계약 확인
                    ]

                    const errIndex = filterErr.indexOf(false);
                    if (errIndex === -1) {
                        resolve(rows[2])
                    } else {
                        const errMsg = [
                            '권한이 없습니다',
                            '유효한 계약이 아닙니다'
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
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/parcel/getHandOverList, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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
    registerParcel,
    reviseParcelContracter,
    reviseParcelBusiness,
    revisePayStep,
    reviseParcelPrice,
    deleteParcel,
    handOverParcel,
    getHandOverList
};
export default Mysql
