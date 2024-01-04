import { Module } from "../Module";

import MysqlPool from '../lib/Db';
import Common from '../js/Common';
import StringJs from "../js/StringJs";


const { path, crypto, seoulMoment } = Module
const { LOGIN_MAX_SEC } = process.env

// interface
interface JwtOB {
    construction_site: string,
    access_token: string,
    email: string,
    member_index: number,
    tableOb: string | null
}

interface StringNumberOb {
    [key: string]: string | number
}


const signUp = (body: Record<string, string>) => new Promise<string>( async (resolve, reject) => {
    try{
        const { id, pw, email, phone, name, sex, birth, di } = body
        const pwArr = await Common.generatePw(pw)
        const params: Array<string | undefined> = [id, pwArr[0], pwArr[1], email, phone, name, sex, birth, di]
    
        if (!params.includes(undefined)) {
            const url = `insert into ENTERPRISE_MEMBER(id, pw, salt, email, phone, name, sex, birth, di, register_date) values(?, ?, ?, ?, ?, ?, ?, ?, ?, now()) `
    
            MysqlPool.getConnection()
                .then(async (connection: any) => {
                    try {
                        await connection.beginTransaction()
                        const insertResult = await connection.query(url, params)
    
                        if (insertResult[0] && insertResult[0].insertId !== 0) {
                            await connection.commit()
                            resolve(insertResult[0].insertId)
                        } else {
                            await connection.rollback();
                            reject([500, '관리자에게 문의바랍니다'])
                        }
                    } catch (error) {
                        // const err_status = typeof error === 'object'; await connection.rollback();
                        // if(err_status){
                        //     Common.writeLog(path.normalize(__dirname+'/../../db_err.txt'), `postiion :/mysql/user/signUp, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                        // }
    
                        //일단 기가입된 계정으로 고지
                        await connection.rollback();
                        reject([400, '가입한 계정입니다']);
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
    }catch(err){
        reject([400, '비밀번호를 다시 기재해주세요'])
    }
});

const checkId = (bodyOb: Record<string, string>) => new Promise<string>(async (resolve, reject) => {
    const { id } = bodyOb
    const params: Array<string | undefined> = [id]
    const url = `select id from ENTERPRISE_MEMBER where id = ? and status = 1;`

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const selectResults = await connection.query(url, params)
                    const result = selectResults[0]

                    if (result[0]) {
                        reject([400, '이미 등록된 아이디입니다'])
                    } else {
                        resolve('사용 가능한 아이디입니다')
                    }

                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/checkId, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const login = (body: Record<string, string>) => new Promise<Record<string, string | null>>(async (resolve, reject) => {
    const params: Array<string | undefined> = [body.id, body.id]
    const url = `
        select member_index, id, pw, salt, construction_site, login_date  from ENTERPRISE_MEMBER where id=? and status = 1 limit 1;
        update ENTERPRISE_MEMBER set login_date = now() where id = ?
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    const selectResults = await connection.query(url, params)
                    const result = selectResults[0]
                    try {
                        if (result[0][0]) {
                            const { member_index, salt, pw, construction_site, login_date } = result[0][0]
                            const key = crypto.pbkdf2Sync(body.pw, salt, 100000, 64, 'sha512')
                            // login_date를 string 전환후, parsing해야 실 값 가져옴
                            const errFilter = [
                                key.toString('base64') === pw,
                                // date객체 seoulMoment 넣으니 9시간씩 추가되, -9h 해줌
                                login_date === null || seoulMoment().diff(seoulMoment(login_date).subtract(9, 'h'), 'seconds') > Number(LOGIN_MAX_SEC),
                                result[1] && result[1].changedRows === 1
                            ]
                            const errIndex = errFilter.indexOf(false)
                            if (errIndex === -1) {
                                await connection.commit()
                                resolve({ member_index, construction_site })
                            } else {
                                const errMsg = [
                                    "정보를 다시 입력해주세요",
                                    "동시 접속이 불가합니다",
                                    "잠시후 다시 시도해주세요"
                                ]
                                throw errMsg[errIndex]
                            }
                        } else {
                            throw '아이디를 확인해주세요'
                        }
                    } catch (error) {
                        await connection.rollback();
                        reject([400, error])

                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/login, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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


const getProfile = (jwtOb: JwtOB) => new Promise<[[object, object], string]>(async (resolve, reject) => {
    const { member_index, construction_site, tableOb } = jwtOb
    const params: Array<string | undefined | number> = [member_index]
    const url = `
        select member_index, id, name, phone, email, birth, construction_site, sex, profile_src from ENTERPRISE_MEMBER where member_index = ? and status = 1;
        select 
            a.construction_index, a.status, a.name, a.construction_start, a.construction_end, a.address, a.table_name, a.start_date, a.end_date, a.src, a.hosil_count, a.reject_reason, 
            b.construction_info_index,  b.corporation_name, b.corporation_address, b.corporation_representative, b.corporation_biz_number, b.corporation_event, b.corporation_biz, b.corporation_phone 
        from (select construction_index, status, name, construction_start, construction_end, address, table_name, start_date, end_date, src, hosil_count, reject_reason  from CONSTRUCTION_SITE where construction_index in (${construction_site ? construction_site : '0'})) as a 
        inner join CONSTRUCTION_ETC_INFO as b on a.construction_index = b.construction_index;
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const results = await connection.query(url, params)
                    const selectResults = results[0]

                    if (selectResults && selectResults[0][0]) {
                        let tableOb: Record<number, string> = {}

                        selectResults[1].forEach((v: Record<string, string | number>) => {
                            const construction_index = v['construction_index']
                            tableOb = {
                                ...tableOb,
                                [construction_index]: v['table_name']
                            }
                            delete v['table_name']
                        })

                        delete selectResults[0][0].member_index

                        resolve([
                            [selectResults[0][0], selectResults[1]], JSON.stringify(tableOb)
                        ])
                    } else {
                        reject([400, '계정 정보가 없습니다'])
                    }
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/getProfile, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const updateConstruction = (jwtOb: JwtOB) => new Promise<string>(async (resolve, reject) => {
    const { member_index, construction_site } = jwtOb
    const params: Array<string | undefined | number> = [construction_site, member_index]
    const url = `
        update ENTERPRISE_MEMBER set construction_site= ? where member_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    const results = await connection.query(url, params)

                    if (results[0].affectedRows !== 0) {
                        await connection.commit()
                        resolve('갱신 완료')
                    } else {
                        await connection.rollback();
                        reject("잘못된 요청입니다")
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/updateConstruction, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject("관리자에게 문의바랍니다");
                } finally {
                    await connection.release()
                }
            })
            .catch((err: string) => {
                reject(err || '다시 시도해주세요')
            })
    } else {
        reject('빈값이 있습니다')
    }
})

const findId = (jwtOb: Record<string, string>) => new Promise<Record<string, string>>(async (resolve, reject) => {
    const { name, phone } = jwtOb
    const params: Array<string | undefined> = [name, phone]
    const url = `select id from ENTERPRISE_MEMBER where name=? and phone=?`

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const selectResults = await connection.query(url, params)
                    const result = selectResults[0]

                    if (result[0]) {
                        resolve(result[0].id)
                    } else {
                        reject([400, "등록된 계정이 없습니다. 회원가입 해주세요"])
                    }

                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/findId, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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

const updateProfile = (jwtOb: JwtOB, bodyOb: Record<string, string>) => new Promise<string>(async (resolve, reject) => {
    const { member_index } = jwtOb, { email, name, phone, sex, birth } = bodyOb
    const params: Array<string | undefined | number> = [email, name, phone, sex, birth, member_index]
    const url = `
        update ENTERPRISE_MEMBER set email = ?, name = ?, phone = ?, sex = ?, birth = ? where member_index = ?;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    const results = await connection.query(url, params)

                    if (results[0].affectedRows === 1) {
                        await connection.commit()
                        resolve('갱신 완료')
                    } else {
                        await connection.rollback();
                        reject([400, "잘못된 요청입니다"])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/updateProfile, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, "관리자에게 문의바랍니다"]);
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

const updatePasswordNoneLogin = (bodyOb: Record<string, string>) => new Promise<string>(async (resolve, reject) => {
    const { pw, name, phone } = bodyOb
    const params: Array<string | undefined | number> = [ pw, name, phone ]
    const selectUrl = `
        select pw, salt, member_index from ENTERPRISE_MEMBER where name=? and phone=?
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const select_result = await connection.query(selectUrl, [name, phone])
                    const dbResult = select_result[0][0]
                    if(select_result[0][0]){
                        const key = crypto.pbkdf2Sync(pw, dbResult.salt, 100000, 64, 'sha512')
                        if ( key.toString('base64') !== dbResult.pw) {
                            await connection.beginTransaction()
                            const pwArr = await Common.generatePw(pw)
                            const updateUrl = `
                                update ENTERPRISE_MEMBER set pw= ?, salt = ? where member_index = ?;
                            `
                            const updateParams: Array<string | undefined | number> = [pwArr[0], pwArr[1],dbResult.member_index]
                            const results = await connection.query(updateUrl, updateParams)
    
                            if (results[0].changedRows === 1) {
                                await connection.commit()
                                resolve('갱신 완료')
                            } else {
                                await connection.rollback();
                                reject([400, "잘못된 요청입니다"])
                            }
                        } else {
                            reject([400, "이전 비밀번호와 다르게 변경해주세요"])
                        }
                    }else{
                        reject([400, "등록된 계정이 없습니다. 회원가입 해주세요"])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/updatePasswordNoneLogin, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, "관리자에게 문의바랍니다"]);
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

const updatePasswordLogin = (bodyOb: Record<string, string>) => new Promise<string>(async (resolve, reject) => {
    const { pw, new_pw, member_index } = bodyOb
    const params: Array<string | undefined | number> = [ pw, member_index ]
    const selectUrl = `
        select pw, salt, member_index from ENTERPRISE_MEMBER where member_index = ?
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const select_result = await connection.query(selectUrl, [member_index])
                    const dbResult = select_result[0][0]
                    if(select_result[0][0]){
                        const key = crypto.pbkdf2Sync(pw, dbResult.salt, 100000, 64, 'sha512')
                        if ( key.toString('base64') === dbResult.pw) {
                            await connection.beginTransaction()
                            const pwArr = await Common.generatePw(new_pw)
                            const updateUrl = `
                                update ENTERPRISE_MEMBER set pw= ?, salt = ? where member_index = ?;
                            `
                            const updateParams: Array<string | undefined | number> = [pwArr[0], pwArr[1], dbResult.member_index]
                            const results = await connection.query(updateUrl, updateParams)
    
                            if (results[0].changedRows === 1) {
                                await connection.commit()
                                resolve('갱신 완료')
                            } else {
                                await connection.rollback();
                                reject([400, "잘못된 요청입니다"])
                            }
                        } else {
                            reject([400, "이전 비밀번호를 다시 적어주세요"])
                        }
                    }else{
                        reject([400, "등록된 계정이 없습니다. 회원가입 해주세요"])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/updatePasswordLogin, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, "관리자에게 문의바랍니다"]);
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


const checkPasswordLogin = (bodyOb: Record<string, string>) => new Promise<string>(async (resolve, reject) => {
    const { pw, new_pw, member_index } = bodyOb
    const params: Array<string | undefined | number> = [ pw, member_index ]
    const selectUrl = `
        select pw, salt, member_index from ENTERPRISE_MEMBER where member_index = ?
    `
    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const select_result = await connection.query(selectUrl, [member_index])
                    const dbResult = select_result[0][0]
                    if(select_result[0][0]){
                        const key = crypto.pbkdf2Sync(pw, dbResult.salt, 100000, 64, 'sha512')
                        if ( key.toString('base64') === dbResult.pw) {
                            resolve('비밀번호가 유효합니다')
                        } else {
                            reject([400, "비밀번호를 다시 기입해주세요"])
                        }
                    }else{
                        reject([400, "등록된 계정이 없습니다. 회원가입 해주세요"])
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/checkPasswordLogin, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject([500, "관리자에게 문의바랍니다"]);
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

const logout = (member_index: number) => new Promise<string>(async (resolve, reject) => {
    const params: Array<number | undefined> = [member_index]
    const url = `
        update ENTERPRISE_MEMBER set login_date = null where member_index = ? and status = 1;
    `

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    await connection.beginTransaction()
                    const updateResults = await connection.query(url, params)
                    const result = updateResults[0]
                    const errFilter = [
                        result.affectedRows === 1,
                        result.changedRows === 1,
                    ]
                    const errIndex = errFilter.indexOf(false)

                    if (errIndex === -1) {
                        await connection.commit()
                        resolve("로그아웃 완료됐습니다")
                    } else {
                        const errMsg = [
                            "로그아웃이 불가합니다",
                            "로그인 상태가 아닙니다",
                        ]
                        switch(errIndex){
                            case 1:
                                reject([401, errMsg[errIndex]])
                                break;
                            default:
                                reject([400, errMsg[errIndex]])
                                break;
                        }
                    }
                } catch (error) {
                    await connection.rollback();
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/user/logout, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
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
    signUp,
    checkId,
    login,
    getProfile,
    updateConstruction,
    findId,
    updateProfile,
    updatePasswordNoneLogin,
    updatePasswordLogin,
    checkPasswordLogin,
    logout
};
export default Mysql
