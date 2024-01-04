import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from '../js/StringJs'


type Ob = Record<string, string | number | undefined>



const { path } = Module
const { ACCESS_AUTHORITY } = process.env

const getCrewList = (table_name: string, body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { member_index, construction_index } = body
    const params: Array<string | number | undefined> = [member_index, construction_index, construction_index]
    const url = `
        select * from CREW_${table_name} where member_index = ? and authority in (${ACCESS_AUTHORITY});
        select b.name, b.id, b.phone, b.email, a.update_date, a.authority, a.group_index, a.crew_index, a.member_index  from (select crew_index, member_index, group_index, authority, update_date  from CREW_${table_name} where construction_index = ? and (authority > 0 or authority = 0)) as a inner join ENTERPRISE_MEMBER as b on a.member_index = b.member_index;
        select * from CONSTRUCTION_SITE where status = 1 and construction_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    let rows = await connection.query(url, params)
                    rows = rows[0]

                    if (rows[0][0] && rows[2][0] !== undefined) {
                        resolve(rows[1])
                    } else {
                        reject([403, '권한이 없습니다'])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/getCrewList, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reqCrew = (body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { construction_index, member_index, construction_site  } = body
    const url = `
        select table_name from CONSTRUCTION_SITE where construction_index = ? and status = 1;
    `

    if (![construction_index, member_index].includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const results = await connection.query(url, [construction_index])

                    if (results[0][0]) {
                        await connection.beginTransaction()
                        const { table_name } = results[0][0]
                        const new_construction_site = StringJs.orderConstruction(construction_site, construction_index)
                        const updateUrl = `
                            select * from CREW_${table_name}  where construction_index = ? and member_index = ? and authority != -1;
                            insert into CREW_${table_name}(construction_index, member_index, authority, update_date) values(?, ?, 0, now());
                            update ENTERPRISE_MEMBER set construction_site = ? where member_index = ?;
                        `
                        let updateResults = await connection.query(updateUrl, [construction_index, member_index, construction_index, member_index, new_construction_site, member_index])
                        updateResults = updateResults[0]
                        
                        const filterErr = [
                            updateResults[0][0] === undefined,  // 기존 크루인지 확인
                            updateResults[1].insertId !== 0 && updateResults[2].affectedRows === 1,    // 성공 여부 확인
                        ]
                        const errIndex = filterErr.indexOf(false);
                        if (errIndex === -1) {
                            await connection.commit()
                            resolve(new_construction_site)
                        } else {
                            await connection.rollback();
                            const errMsg = [
                                "이미 등록된 크루거나 크루 심사중입니다",
                                "등록에 실패하셨습니다"
                            ]
                            reject([400, errMsg[errIndex] || "등록에 실패하셨습니다"])
                        }
                    } else {
                        reject([400, '운영중인 현장이 아닙니다'])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/reqCrew, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const cancelReqCrew = (body: Ob) => new Promise<string>(async (resolve, reject) => {
    // 현장명 검색에 따른 취소이기에 crew_index 값을 가져오기 어렵습니다
    const { construction_index, member_index, filteredConstructionSite } = body
    const url = `
        select table_name from CONSTRUCTION_SITE where construction_index = ? and status = 1;
    `

    if (![construction_index, member_index].includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const results = await connection.query(url, [construction_index])

                    if (results[0][0]) {
                        await connection.beginTransaction()
                        const { table_name } = results[0][0]
                        const updateUrl = `
                            update CREW_${table_name} set authority = -1 where  construction_index =? and member_index = ? and authority = 0;
                            update ENTERPRISE_MEMBER set construction_site = ? where member_index = ? and status = 1;
                        `
                        let updateResults = await connection.query(updateUrl, [construction_index, member_index, filteredConstructionSite, member_index])
                        updateResults = updateResults[0]

                        if (updateResults[0].changedRows === 1 && updateResults[1].changedRows == 1) {
                            await connection.commit()
                            resolve("가입 신청취소가 완료됐습니다")
                        } else {
                            await connection.rollback();
                            reject([400, "신청취소에 실패하셨습니다"])
                        }
                    } else {
                        reject([400, '운영중인 현장이 아닙니다'])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/cancelReqCrew, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const confirmCrew = (table_name: string, body: Ob) => new Promise<string>(async (resolve, reject) => {
    // crew_member_index은 crew_index(가입 신청자)의 member_index 입니다
    // 권한 변경전까지 승인시 부마스터로 승인
    const { crew_index, crew_member_index, construction_index, member_index } = body
    const url = `
        select * from CREW_${table_name} where member_index = ? and authority in (${ACCESS_AUTHORITY});
        update CREW_${table_name} set authority = 5 where crew_index = ? and construction_index = ? and member_index = ? and authority = 0;
    `

    if (![member_index, crew_member_index, construction_index, crew_index].includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let results = await connection.query(url, [member_index, crew_index, construction_index, crew_member_index])
                    results = results[0]
 
                    const filterErr = [
                        results[0][0] !== undefined,  // 등록자 확인
                        results[1].changedRows === 1
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('승인이 완료됐습니다')
                    } else {
                        const errMsg = [
                            "권한이 없습니다",
                            "존재하지 않는 회원입니다"
                        ]
                        reject([403, errMsg[errIndex] || "등록에 실패하셨습니다"])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/confirmCrew, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const reviseAuthority = (table_name: string, body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { crew_index, authority, member_index } = body
    const params: Array<string | number | undefined> = [member_index, authority, crew_index]
    const url = `
        select * from CREW_${table_name} where member_index = ? and authority in (${ACCESS_AUTHORITY});
        update CREW_${table_name} set authority = ? where crew_index = ? and authority > 0;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let results = await connection.query(url, params)
                    results = results[0]

                    const filterErr = [
                        results[0][0] !== undefined,  // 등록자 확인
                        results[1].affectedRows === 1,    // 결과 확인
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('변경이 완료됐습니다')
                    } else {
                        await connection.rollback()
                        const errMsg = [
                            '권한이 없습니다',
                            '정보를 다시 입력해주세요',
                            '등록에 실패하셨습니다',
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
                    await connection.rollback()
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/reviseAuthority, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const cancelConfirm = (table_name: string, body: Ob) => new Promise<string>(async (resolve, reject) => {
    const { crew_index, member_index } = body
    const params: Array<string | number | undefined> = [member_index, crew_index]
    const url = `
        select * from CREW_${table_name} where member_index = ? and authority in (${ACCESS_AUTHORITY});
        update CREW_${table_name} set authority = 0 where crew_index = ? and authority = 2;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let results = await connection.query(url, params)
                    results = results[0]

                    const filterErr = [
                        results[0][0] !== undefined,  // 등록자 확인
                        results[1].affectedRows === 1,    // 결과 확인
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('변경이 완료됐습니다')
                    } else {
                        await connection.rollback()
                        const errMsg = [
                            '권한이 없습니다',
                            '취소에 실하셨습니다',
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
                    await connection.rollback()
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/cancelConfirm, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const carryAuthority = (table_name: string, body: Ob, jwtOb: Ob) => new Promise<string>(async (resolve, reject) => {
    const { crew_index } = body
    const params: Array<string | number | undefined> = [crew_index, crew_index, jwtOb.member_index]
    const url = `
        select * from CREW_${table_name} where crew_index = ? and authority in (${ACCESS_AUTHORITY});
        update CREW_${table_name} set authority = 6 where crew_index = ? and authority = 5;
        update CREW_${table_name} set authority = 5 where member_index = ? and authority = 6;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    let results = await connection.query(url, params)
                    results = results[0]


                    const filterErr = [
                        results[0][0] !== undefined,  // 등록자 확인
                        results[1].affectedRows === 1,  // 결과 확인
                        results[2].affectedRows === 1   // 결과 확인
                    ]
                    const errIndex = filterErr.indexOf(false);

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve('변경이 완료됐습니다')
                    } else {
                        await connection.rollback()
                        const errMsg = [
                            '권한이 없습니다',
                            '수정에 실패하셨습니다',
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
                    await connection.rollback()
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/crew/carryAuthority, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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
    getCrewList,
    reqCrew,
    cancelReqCrew,
    confirmCrew,
    reviseAuthority,
    cancelConfirm,
    carryAuthority
};
export default Mysql
