import { Module } from "../Module";
import MysqlPool from '../lib/Db';
import Common from '../js/Common';


const { path } = Module


const getKey = (name: string) => new Promise<string>(async (resolve, reject) => {
    const params: Array<string | undefined> = [name]
    const url = `select value  from KEY_VALUE where name = ?`

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const rows = await connection.query(url, params)
                    resolve(rows[0][0].value)
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/etc/getKey, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject('관리자에게 문의바랍니다');
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

const getConstructionTable = (construction_index: number) => new Promise<string>(async (resolve, reject) => {
    const params: Array<number | undefined> = [construction_index]
    const url = `select construction_index , table_name  from CONSTRUCTION_SITE where construction_index=? and status = 1`

    if (!params.includes(undefined)) {
        MysqlPool.getConnection()
            .then(async (connection: any) => {
                try {
                    const rows = await connection.query(url, params)

                    rows[0][0] ? resolve(rows[0][0].table_name) : reject('운영중이지 않은 현장입니다')
                } catch (error) {
                    Common.writeLog(path.normalize(__dirname + '/../../db_err.txt'), `postiion :/mysql/etc/getConstructionTable, ${JSON.stringify(error instanceof Error ? error.message : error)}`)
                    reject('관리자에게 문의바랍니다');
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


const Mysql: Record<string, Function> = {
    getKey,
    getConstructionTable
};
export default Mysql
